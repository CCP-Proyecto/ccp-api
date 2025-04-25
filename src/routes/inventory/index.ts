import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { inventory } from "@/db/schema/inventory-schema";
import { store } from "@/db/schema/store-schema";
import { createInventorySchema, updateInventorySchema } from "./schema";

const inventoryRouter = new Hono();

inventoryRouter.get("/", async (c) => {
  const inventories = await db.query.inventory.findMany({
    with: {
      store: true,
    },
  });
  return c.json(inventories);
});

inventoryRouter.get("/:id", async (c) => {
  const selectedInventory = await db.query.inventory.findFirst({
    where: eq(inventory.id, Number(c.req.param("id"))),
    with: {
      store: true,
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

  const storeId = parsedInventory.inventories[0]?.storeId;

  if (!storeId) {
    throw new HTTPException(400, {
      message: "Store ID is required",
    });
  }

  const storeExists = await db.query.store.findFirst({
    where: eq(store.id, storeId),
  });

  if (!storeExists) {
    throw new HTTPException(400, {
      message: "Store does not exist",
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
