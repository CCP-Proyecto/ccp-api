import { type } from "arktype";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { customer } from "@/db/schema/customer-schema";
import { order, orderProduct } from "@/db/schema/order-schema";
import { product } from "@/db/schema/product-schema";
import { salesperson } from "@/db/schema/salesperson-schema";
import { createOrderSchema, updateOrderSchema } from "./schema";

const orderRouter = new Hono();

orderRouter.get("/", async (c) => {
  const orders = await db.query.order.findMany({
    with: {
      customer: true,
      salesperson: true,
      orderProducts: {
        with: {
          product: true,
        },
      },
      delivery: true,
    },
  });
  return c.json(orders);
});

orderRouter.get("/:id", async (c) => {
  const selectedOrder = await db.query.order.findFirst({
    where: eq(order.id, Number(c.req.param("id"))),
    with: {
      customer: true,
      salesperson: true,
      orderProducts: {
        with: {
          product: true,
        },
      },
      delivery: true,
    },
  });

  if (!selectedOrder) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  return c.json(selectedOrder);
});

orderRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsedOrder = createOrderSchema(body);

  if (parsedOrder instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedOrder.summary,
    });
  }

  const customerExists = await db.query.customer.findFirst({
    where: eq(customer.id, parsedOrder.customerId),
  });
  if (!customerExists) {
    throw new HTTPException(400, { message: "Customer does not exist" });
  }

  if (parsedOrder.salespersonId) {
    const salespersonExists = await db.query.salesperson.findFirst({
      where: eq(salesperson.id, parsedOrder.salespersonId),
    });
    if (!salespersonExists) {
      throw new HTTPException(400, { message: "Salesperson does not exist" });
    }
  }

  const productIds = parsedOrder.products.map((p) => p.productId);
  const products = await db.query.product.findMany({
    where: inArray(product.id, productIds),
  });

  if (products.length !== productIds.length) {
    throw new HTTPException(400, { message: "One or more products not found" });
  }

  const total = parsedOrder.products.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  const newOrder = await db.transaction(async (tx) => {
    const createdOrders = await tx
      .insert(order)
      .values({
        customerId: parsedOrder.customerId,
        salespersonId: parsedOrder.salespersonId ?? null,
        total,
      })
      .returning();

    const createdOrder = createdOrders[0];
    if (!createdOrder) {
      throw new Error("Failed to create order");
    }

    await tx.insert(orderProduct).values(
      parsedOrder.products.map((item) => ({
        orderId: createdOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtOrder:
          item.priceAtOrder ??
          products.find((p) => p.id === item.productId)?.price ??
          0,
      })),
    );

    return createdOrder;
  });

  if (!newOrder) {
    throw new HTTPException(500, { message: "Order creation failed" });
  }

  const fullOrder = await db.query.order.findFirst({
    where: eq(order.id, newOrder.id),
    with: {
      customer: true,
      salesperson: parsedOrder.salespersonId ? {} : undefined,
      orderProducts: {
        with: {
          product: true,
        },
      },
    },
  });

  if (!fullOrder) {
    throw new HTTPException(500, { message: "Failed to fetch created order" });
  }

  return c.json(fullOrder, 201);
});

orderRouter.patch("/:id", async (c) => {
  const body = await c.req.json();
  const parsedOrder = updateOrderSchema(body);

  if (parsedOrder instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedOrder.summary,
    });
  }

  const updated = await db
    .update(order)
    .set({
      ...parsedOrder,
      updatedAt: new Date(),
    })
    .where(eq(order.id, Number(c.req.param("id"))))
    .returning();

  if (!updated.length) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  return c.json(updated[0]);
});

orderRouter.delete("/:id", async (c) => {
  const deleted = await db
    .delete(order)
    .where(eq(order.id, Number(c.req.param("id"))))
    .returning();

  if (!deleted.length) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  return c.json({ message: "Order deleted successfully" });
});

export { orderRouter as order };
