import { type } from "arktype";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { order } from "@/db/schema/order-schema";
import { product as productModel } from "@/db/schema/product-schema";
import { createOrderSchema } from "./schema";

const orderRouter = new Hono();

orderRouter.get("/", async (c) => {
  const orders = await db.query.order.findMany();

  return c.json(orders);
});

orderRouter.get("/:id", async (c) => {
  const selectedOrder = await db.query.order.findFirst({
    where: eq(order.id, Number(c.req.param("id"))),
  });

  if (!selectedOrder) {
    throw new HTTPException(404, {
      message: "Order not found",
    });
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

  for (const product of parsedOrder.products) {
    const productExists = await db.query.product.findFirst({
      where: eq(productModel.id, product.id),
    });

    if (!productExists) {
      throw new HTTPException(400, {
        message: "Invalid request body",
        cause: "Product does not exist",
      });
    }
  }

  const createdOrders = await db.insert(order).values(parsedOrder).returning();

  for (const order of parsedOrder.products) {
    await db
      .update(productModel)
      .set({
        amount: sql`amount - ${order.amount}`,
      })
      .where(eq(productModel.id, order.id))
      .returning();
  }

  return c.json(createdOrders);
});

export { orderRouter as order };
