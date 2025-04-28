import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { delivery } from "@/db/schema/delivery-schema";
import { order } from "@/db/schema/order-schema";
import { createDeliverySchema, updateDeliverySchema } from "./schema";

const deliveryRouter = new Hono();

deliveryRouter.get("/", async (c) => {
  const deliveries = await db.query.delivery.findMany({
    with: {
      order: {
        with: {
          customer: true,
          salesperson: true,
        },
      },
    },
  });
  return c.json(deliveries);
});

deliveryRouter.get("/:id", async (c) => {
  const selectedDelivery = await db.query.delivery.findFirst({
    where: eq(delivery.id, Number(c.req.param("id"))),
    with: {
      order: {
        with: {
          customer: true,
          salesperson: true,
          orderProducts: {
            with: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!selectedDelivery) {
    throw new HTTPException(404, { message: "Delivery not found" });
  }

  return c.json(selectedDelivery);
});

deliveryRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsedDelivery = createDeliverySchema(body);

  if (parsedDelivery instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedDelivery.summary,
    });
  }

  const orderExists = await db.query.order.findFirst({
    where: eq(order.id, parsedDelivery.orderId),
  });
  if (!orderExists) {
    throw new HTTPException(400, { message: "Order does not exist" });
  }

  const existingDelivery = await db.query.delivery.findFirst({
    where: eq(delivery.orderId, parsedDelivery.orderId),
  });
  if (existingDelivery) {
    throw new HTTPException(400, {
      message: "Delivery already exists for this order",
    });
  }

  const created = await db
    .insert(delivery)
    .values({
      orderId: parsedDelivery.orderId,
      estimatedDeliveryDate: parsedDelivery.estimatedDeliveryDate,
      trackingNumber: parsedDelivery.trackingNumber,
      notes: parsedDelivery.notes,
      address: parsedDelivery.address,
    })
    .returning();

  return c.json(created[0], 201);
});

deliveryRouter.patch("/:id", async (c) => {
  const body = await c.req.json();
  const parsedDelivery = updateDeliverySchema(body);

  if (parsedDelivery instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedDelivery.summary,
    });
  }

  const updateData: typeof updateDeliverySchema.infer = {};

  if (parsedDelivery.status) {
    updateData.status = parsedDelivery.status;
  }
  if (parsedDelivery.actualDeliveryDate) {
    updateData.actualDeliveryDate = parsedDelivery.actualDeliveryDate;
  }
  if (parsedDelivery.trackingNumber) {
    updateData.trackingNumber = parsedDelivery.trackingNumber;
  }
  if (parsedDelivery.notes) {
    updateData.notes = parsedDelivery.notes;
  }
  if (parsedDelivery.address) {
    updateData.address = parsedDelivery.address;
  }

  const updated = await db
    .update(delivery)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(delivery.id, Number(c.req.param("id"))))
    .returning();

  if (!updated.length) {
    throw new HTTPException(404, { message: "Delivery not found" });
  }

  return c.json(updated[0]);
});

deliveryRouter.delete("/:id", async (c) => {
  const deleted = await db
    .delete(delivery)
    .where(eq(delivery.id, Number(c.req.param("id"))))
    .returning();

  if (!deleted.length) {
    throw new HTTPException(404, { message: "Delivery not found" });
  }

  return c.json({ message: "Delivery deleted successfully" });
});

export { deliveryRouter as delivery };
