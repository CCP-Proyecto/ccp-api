import { type } from "arktype";
import { integer, pgTable } from "drizzle-orm/pg-core";
import { inventory } from "@/db/schema/inventory-schema";
import { product } from "@/db/schema/product-schema";

export const inventorySchema = type({
  quantity: "number.integer",
  productId: "number.integer",
  warehouseId: "number.integer",
});

export const createInventorySchema = type({
  inventories: inventorySchema.array(),
});

export const inventoryProduct = pgTable("inventory_product", {
  inventoryId: integer("inventory_id")
    .notNull()
    .references(() => inventory.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
});

export const updateInventorySchema = inventorySchema.partial();
