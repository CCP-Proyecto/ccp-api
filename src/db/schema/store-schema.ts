import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { inventory } from "./inventory-schema";

export const store = pgTable("store", {
  id: serial("id").primaryKey(), // id_bodega
  address: text("location").notNull(), // ubicacion
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const storeRelations = relations(store, ({ one, many }) => ({
  inventories: many(inventory),
}));
