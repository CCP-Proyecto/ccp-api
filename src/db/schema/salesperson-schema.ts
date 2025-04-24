import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { customer } from "./customer-schema";
import { visit } from "./visit-schema";

export const salesperson = pgTable("salesperson", {
  id: serial("id").primaryKey(),
  idType: text("id_type").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salespersonRelations = relations(salesperson, ({ many }) => ({
  customers: many(customer),
  visits: many(visit),
}));
