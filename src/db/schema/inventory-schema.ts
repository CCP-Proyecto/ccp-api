import { relations } from "drizzle-orm";
import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { product } from "./product-schema";
import { warehouse } from "./warehouse-schema";

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  quantity: integer("available_quantity").notNull(),
  warehouseId: integer("warehouse_id")
    .notNull()
    .references(() => warehouse.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  warehouse: one(warehouse, {
    fields: [inventory.warehouseId],
    references: [warehouse.id],
  }),
  products: many(inventoryProduct),
}));

export const inventoryProduct = pgTable("inventory_product", {
  inventoryId: integer("inventory_id")
    .notNull()
    .references(() => inventory.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
});

export const inventoryProductRelations = relations(
  inventoryProduct,
  ({ one }) => ({
    inventory: one(inventory, {
      fields: [inventoryProduct.inventoryId],
      references: [inventory.id],
    }),
    product: one(product, {
      fields: [inventoryProduct.productId],
      references: [product.id],
    }),
  }),
);
