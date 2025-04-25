import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { warehouse } from "@/db/schema/warehouse-schema";
import { createWarehouseSchema, updateWarehouseSchema } from "./schema";

const warehouseRouter = new Hono();

warehouseRouter.get("/", async (c) => {
  const warehouses = await db.query.warehouse.findMany();
  return c.json(warehouses);
});

warehouseRouter.get("/:id", async (c) => {
  const selectedWarehouse = await db.query.warehouse.findFirst({
    where: eq(warehouse.id, Number(c.req.param("id"))),
  });

  if (!selectedWarehouse) {
    throw new HTTPException(404, { message: "Warehouse not found" });
  }

  return c.json(selectedWarehouse);
});

warehouseRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsedWarehouse = createWarehouseSchema(body);

  if (parsedWarehouse instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedWarehouse.summary,
    });
  }

  const created = await db
    .insert(warehouse)
    .values(parsedWarehouse)
    .returning();

  return c.json(created);
});

warehouseRouter.put("/:id", async (c) => {
  const body = await c.req.json();
  const parsedWarehouse = updateWarehouseSchema(body);

  if (parsedWarehouse instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedWarehouse.summary,
    });
  }

  const updated = await db
    .update(warehouse)
    .set({
      parsedWarehouse,
      updatedAt: new Date(),
    })
    .where(eq(warehouse.id, Number(c.req.param("id"))))
    .returning();

  if (!updated.length) {
    throw new HTTPException(404, {
      message: "Warehouse not found",
    });
  }

  return c.json(updated[0]);
});

warehouseRouter.delete("/:id", async (c) => {
  const deleted = await db
    .delete(warehouse)
    .where(eq(warehouse.id, Number(c.req.param("id"))))
    .returning();

  if (!deleted.length) {
    throw new HTTPException(404, {
      message: "Warehouse not found",
    });
  }

  return c.json({ message: "Warehouse deleted successfully" });
});

export { warehouseRouter as warehouse };
