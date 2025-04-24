import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { customer } from "./customer-schema";
import { salesperson } from "./salesperson-schema";

export const visit = pgTable("visit", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  comments: text("comments").notNull(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customer.id),
  salespersonId: integer("salesperson_id")
    .notNull()
    .references(() => salesperson.id),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const visitRelations = relations(visit, ({ one }) => ({
  customer: one(customer, {
    fields: [visit.customerId],
    references: [customer.id],
  }),
  salesperson: one(salesperson, {
    fields: [visit.salespersonId],
    references: [salesperson.id],
  }),
}));
