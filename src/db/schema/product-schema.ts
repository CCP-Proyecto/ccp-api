import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { numericAsNumber } from "../types/custom-types";
import { manufacturer } from "./manufacturer-schema";

export const product = pgTable("product", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numericAsNumber("price", { precision: 10, scale: 2 }),
  storageCondition: text("storage_condition").notNull(),
  manufacturerId: text("manufacturer_id")
    .notNull()
    .references(() => manufacturer.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productRelations = relations(product, ({ one }) => ({
  manufacturer: one(manufacturer, {
    fields: [product.manufacturerId],
    references: [manufacturer.id],
  }),
}));
