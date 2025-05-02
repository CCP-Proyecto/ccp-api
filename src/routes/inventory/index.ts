import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { inventory, inventoryProduct } from "@/db/schema/inventory-schema";
import { product } from "@/db/schema/product-schema";
import { warehouse } from "@/db/schema/warehouse-schema";
import { createInventorySchema, updateInventorySchema } from "./schema";

const inventoryRouter = new Hono();

inventoryRouter.get("/", async (c) => {
  const inventories = await db.query.inventory.findMany({
    with: {
      warehouse: true,
      products: {
        with: {
          product: true,
        },
      },
    },
  });

  const formattedInventories = inventories.map((inventory) => {
    const products = inventory.products.map((ip) => ip.product);
    return {
      ...inventory,
      products,
      productIds: products.map(p => p.id),
    };
  });

  return c.json(formattedInventories);
});

inventoryRouter.get("/:id", async (c) => {
  const selectedInventory = await db.query.inventory.findFirst({
    where: (inventory, { eq }) => eq(inventory.id, Number(c.req.param("id"))),
    with: {
      warehouse: true,
      products: {
        with: {
          product: true,
        },
      },
    },
  });

  if (!selectedInventory) {
    throw new HTTPException(404, { message: "Inventory not found" });
  }

  const products = selectedInventory.products.map((ip) => ip.product);
  const formattedInventory = {
    ...selectedInventory,
    products,
    productIds: products.map(p => p.id),
  };

  return c.json(formattedInventory);
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

  if (!parsedInventory.inventories || parsedInventory.inventories.length === 0) {
    throw new HTTPException(400, { message: "Inventory data is required" });
  }

  const firstInventory = parsedInventory.inventories[0];
  if (!firstInventory) {
    throw new HTTPException(400, { message: "Inventory data is invalid" });
  }

  const { warehouseId, productId, quantity } = firstInventory;

  if (warehouseId === undefined || productId === undefined || quantity === undefined) {
    throw new HTTPException(400, {
      message: "Warehouse ID, Product ID, and quantity are required",
    });
  }

  const warehouseExists = await db.query.warehouse.findFirst({
    where: eq(warehouse.id, warehouseId),
  });
  if (!warehouseExists) {
    throw new HTTPException(400, { message: "Warehouse does not exist" });
  }

  const productExists = await db.query.product.findFirst({
    where: eq(product.id, productId),
  });
  if (!productExists) {
    throw new HTTPException(400, { message: "Product does not exist" });
  }

  const result = await db.transaction(async (tx) => {
    const [createdInventory] = await tx
      .insert(inventory)
      .values({
        quantity,
        warehouseId,
      })
      .returning();

    if (!createdInventory) {
      throw new Error("Failed to create inventory record");
    }

    await tx.insert(inventoryProduct).values({
      inventoryId: createdInventory.id,
      productId,
    });

    return await tx.query.inventory.findFirst({
      where: eq(inventory.id, createdInventory.id),
      with: {
        warehouse: true,
        products: {
          with: {
            product: true,
          },
        },
      },
    });
  });

  if (!result) {
    throw new HTTPException(500, { message: "Failed to create inventory" });
  }


  const response = {
    ...result,
    productIds: result.products.map(ip => ip.product.id),
  };

  return c.json(response, 201);
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
      ...parsedInventory,
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
