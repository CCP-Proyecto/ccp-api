import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { inventory } from "./inventory-schema";

export const warehouse = pgTable("warehouse", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("location").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const warehouseRelations = relations(warehouse, ({ one, many }) => ({
  inventories: many(inventory),
}));
