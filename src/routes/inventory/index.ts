import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { inventory } from "@/db/schema/inventory-schema";
import { warehouse } from "@/db/schema/warehouse-schema";
import { createInventorySchema, updateInventorySchema } from "./schema";

const inventoryRouter = new Hono();

inventoryRouter.get("/", async (c) => {
  const inventories = await db.query.inventory.findMany({
    with: {
      warehouse: true,
    },
  });
  return c.json(inventories);
});

inventoryRouter.get("/:id", async (c) => {
  const selectedInventory = await db.query.inventory.findFirst({
    where: eq(inventory.id, Number(c.req.param("id"))),
    with: {
      warehouse: true,
    },
  });

  if (!selectedInventory) {
    throw new HTTPException(404, { message: "Inventory not found" });
  }

  return c.json(selectedInventory);
});

inventoryRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsedInventory = createInventorySchema(body);

  if (parsedInventory instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedInventory.summary,
    });
  }

  const warehouseId = parsedInventory.inventories[0]?.warehouseId;

  if (!warehouseId) {
    throw new HTTPException(400, {
      message: "Warehouse ID is required",
    });
  }

  const warehouseExists = await db.query.warehouse.findFirst({
    where: eq(warehouse.id, warehouseId),
  });

  if (!warehouseExists) {
    throw new HTTPException(400, {
      message: "Warehouse does not exist",
    });
  }

  const created = await db
    .insert(inventory)
    .values(parsedInventory.inventories)
    .returning();

  return c.json(created);
});

inventoryRouter.put("/:id", async (c) => {
  const body = await c.req.json();
  const parsedInventory = updateInventorySchema(body);

  if (parsedInventory instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedInventory.summary,
    });
  }

  const updated = await db
    .update(inventory)
    .set({
      parsedInventory,
      updatedAt: new Date(),
    })
    .where(eq(inventory.id, Number(c.req.param("id"))))
    .returning();

  if (!updated.length) {
    throw new HTTPException(404, {
      message: "Inventory not found",
    });
  }

  return c.json(updated[0]);
});

inventoryRouter.delete("/:id", async (c) => {
  const deleted = await db
    .delete(inventory)
    .where(eq(inventory.id, Number(c.req.param("id"))))
    .returning();

  if (!deleted.length) {
    throw new HTTPException(404, {
      message: "Inventory not found",
    });
  }

  return c.json({ message: "Inventory deleted successfully" });
});

export { inventoryRouter as inventory };
