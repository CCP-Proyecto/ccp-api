import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { visit } from "./visit-schema";
import { customer } from "./customer-schema";

export const salesperson = pgTable("salesperson", {
  id: serial("id").primaryKey(),
  idType: text("id_type").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  createdAt: text("created_at").notNull(), // or use timestamp if you prefer
  updatedAt: text("updated_at").notNull(),
});

export const salespersonRelations = relations(salesperson, ({ many }) => ({
  visits: many(visit),
  customers: many(customer),
}));
