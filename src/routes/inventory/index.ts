import { type } from "arktype";
import { eq, inArray } from "drizzle-orm";
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

  for (const inv of parsedInventory.inventories) {
    if (
      inv.warehouseId === undefined ||
      inv.productId === undefined ||
      inv.quantity === undefined
    ) {
      throw new HTTPException(400, {
        message: "Warehouse ID, Product ID, and quantity are required for all inventory items",
      });
    }
  }

  const warehouseIds = [...new Set(parsedInventory.inventories.map(i => i.warehouseId))];
  const warehouses = await db.query.warehouse.findMany({
    where: inArray(warehouse.id, warehouseIds),
  });

  if (warehouses.length !== warehouseIds.length) {
    throw new HTTPException(400, { message: "One or more warehouses do not exist" });
  }

  const productIds = [...new Set(parsedInventory.inventories.map(i => i.productId))];
  const products = await db.query.product.findMany({
    where: inArray(product.id, productIds),
  });

  if (products.length !== productIds.length) {
    throw new HTTPException(400, { message: "One or more products do not exist" });
  }

  const results = await db.transaction(async (tx) => {
    const createdInventories = [];

    for (const inv of parsedInventory.inventories) {
      const [createdInventory] = await tx
        .insert(inventory)
        .values({
          quantity: inv.quantity,
          warehouseId: inv.warehouseId,
        })
        .returning();

      if (!createdInventory) {
        throw new Error(`Failed to create inventory record for product ${inv.productId}`);
      }

      await tx.insert(inventoryProduct).values({
        inventoryId: createdInventory.id,
        productId: inv.productId,
      });

      const fullInventory = await tx.query.inventory.findFirst({
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

      if (!fullInventory) {
        throw new Error(`Failed to retrieve created inventory for product ${inv.productId}`);
      }

      createdInventories.push(fullInventory);
    }

    return createdInventories;
  });

  if (!results || results.length === 0) {
    throw new HTTPException(500, { message: "Failed to create inventories" });
  }

  const response = results.map(result => ({
    ...result,
    productIds: result.products.map((ip) => ip.product.id),
  }));

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

  const inventoryId = Number(c.req.param("id"));
  if (Number.isNaN(inventoryId)) {
    throw new HTTPException(400, { message: "Invalid inventory ID" });
  }

  const existingInventory = await db.query.inventory.findFirst({
    where: eq(inventory.id, inventoryId),
  });
  if (!existingInventory) {
    throw new HTTPException(404, { message: "Inventory not found" });
  }

  if (parsedInventory.productId !== undefined) {
    const productExists = await db.query.product.findFirst({
      where: eq(product.id, parsedInventory.productId),
    });
    if (!productExists) {
      throw new HTTPException(400, { message: "Product does not exist" });
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(inventoryProduct)
        .where(eq(inventoryProduct.inventoryId, inventoryId));

      const insertValues = {
        inventoryId: inventoryId,
        productId: parsedInventory.productId as number,
      };

      await tx.insert(inventoryProduct).values(insertValues);
    });
  }

  const updateData: Partial<typeof inventory.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsedInventory.quantity !== undefined) {
    updateData.quantity = parsedInventory.quantity;
  }
  if (parsedInventory.warehouseId !== undefined) {
    updateData.warehouseId = parsedInventory.warehouseId;
  }

  const [updatedInventory] = await db
    .update(inventory)
    .set(updateData)
    .where(eq(inventory.id, inventoryId))
    .returning();

  if (!updatedInventory) {
    throw new HTTPException(500, { message: "Failed to update inventory" });
  }

  const fullInventory = await db.query.inventory.findFirst({
    where: eq(inventory.id, inventoryId),
    with: {
      warehouse: true,
      products: {
        with: {
          product: true,
        },
      },
    },
  });

  return c.json({
    ...fullInventory,
  });
});

inventoryRouter.get("/product/:productId/warehouses", async (c) => {
  const productId = Number(c.req.param("productId"));

  if (Number.isNaN(productId)) {
    throw new HTTPException(400, {
      message: "Invalid product ID",
    });
  }

  const productExists = await db.query.product.findFirst({
    where: eq(product.id, productId),
  });

  if (!productExists) {
    throw new HTTPException(404, {
      message: "Product not found",
    });
  }

  const inventoryProducts = await db.query.inventoryProduct.findMany({
    where: (ip, { eq }) => eq(ip.productId, productId),
    with: {
      inventory: {
        with: {
          warehouse: true,
        },
      },
    },
  });

  if (inventoryProducts.length === 0) {
    return c.json([]);
  }

  const warehouses = inventoryProducts.map((ip) => ({
    ...ip.inventory.warehouse,
    quantity: ip.inventory.quantity,
    inventoryId: ip.inventory.id,
  }));

  return c.json(warehouses);
});

inventoryRouter.get("/product/:productId/total-quantity", async (c) => {
  const productId = Number(c.req.param("productId"));

  if (Number.isNaN(productId)) {
    throw new HTTPException(400, {
      message: "Invalid product ID",
    });
  }

  const productExists = await db.query.product.findFirst({
    where: eq(product.id, productId),
  });
  if (!productExists) {
    throw new HTTPException(404, { message: "Product not found" });
  }

  const result = await db.query.inventoryProduct.findMany({
    where: eq(inventoryProduct.productId, productId),
    with: {
      inventory: {
        columns: {
          quantity: true,
        },
      },
    },
  });

  const totalQuantity = result.reduce((sum, item) => {
    return sum + (item.inventory?.quantity || 0);
  }, 0);

  return c.json({
    productId,
    productName: productExists.name,
    totalQuantity,
  });
});

inventoryRouter.get("/product/:productId/warehouse/:warehouseId", async (c) => {
  const productId = Number(c.req.param("productId"));
  const warehouseId = Number(c.req.param("warehouseId"));

  if (Number.isNaN(productId)) {
    throw new HTTPException(400, {
      message: "Invalid product ID",
    });
  }

  if (Number.isNaN(warehouseId)) {
    throw new HTTPException(400, {
      message: "Invalid warehouse ID",
    });
  }

  const productExists = await db.query.product.findFirst({
    where: eq(product.id, productId),
  });
  if (!productExists) {
    throw new HTTPException(404, {
      message: "Product not found",
    });
  }

  const warehouseExists = await db.query.warehouse.findFirst({
    where: eq(warehouse.id, warehouseId),
  });
  if (!warehouseExists) {
    throw new HTTPException(404, {
      message: "Warehouse not found",
    });
  }

  const inventoryRecord = await db.query.inventory.findFirst({
    where: (inventory, { eq, and }) => and(
      eq(inventory.warehouseId, warehouseId),
    ),
    with: {
      warehouse: true,
      products: {
        where: (ip, { eq }) => eq(ip.productId, productId),
        with: {
          product: true,
        },
      },
    },
  });

  if (!inventoryRecord || inventoryRecord.products.length === 0) {
    return c.json({
      message: "Product not found in specified warehouse",
      product: productExists,
      warehouse: warehouseExists,
      quantity: 0,
    }, 404);
  }

  const firstProduct = inventoryRecord.products[0];
  if (!firstProduct) {
    throw new HTTPException(500, { message: "Unexpected data structure" });
  }

  return c.json({
    inventoryId: inventoryRecord.id,
    quantity: inventoryRecord.quantity,
    product: firstProduct.product,
    warehouse: inventoryRecord.warehouse,
  });
});

inventoryRouter.delete("/:id", async (c) => {
  const inventoryId = Number(c.req.param("id"));
  if (Number.isNaN(inventoryId)) {
    throw new HTTPException(400, { message: "Invalid inventory ID" });
  }

  const existingInventory = await db.query.inventory.findFirst({
    where: eq(inventory.id, inventoryId),
  });
  if (!existingInventory) {
    throw new HTTPException(404, { message: "Inventory not found" });
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(inventoryProduct)
      .where(eq(inventoryProduct.inventoryId, inventoryId));

    await tx.delete(inventory).where(eq(inventory.id, inventoryId));
  });

  return c.json({ message: "Inventory deleted successfully" });
});

export { inventoryRouter as inventory };
