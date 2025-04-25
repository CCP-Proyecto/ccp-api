import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { customer } from "./customer-schema";
import { salesperson } from "./salesperson-schema";

export const visit = pgTable("visit", {
  id: serial("id").primaryKey().notNull(),
  salespersonId: text("salesperson_id").notNull().references(() => salesperson.id, {
    onDelete: "cascade",
  }),
  customerId: text("customer_id").notNull().references(() => customer.id, {
    onDelete: "cascade",
  }),
  visitDate: timestamp("visit_date", { mode: "date" }).notNull().defaultNow(),
  comments: text("comments").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const visitRelations = relations(visit, ({ one }) => ({
  salesperson: one(salesperson, {
    fields: [visit.salespersonId],
    references: [salesperson.id],
  }),
  customer: one(customer, {
    fields: [visit.customerId],
    references: [customer.id],
  }),
}));
