import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { product } from "./product-schema";

export const manufacturer = pgTable("manufacturer", {
  id: text("id").primaryKey().notNull(),
  idType: text("id_type").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const manufacturerRelations = relations(manufacturer, ({ many }) => ({
  products: many(product),
}));
