import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { customer } from "./customer-schema";
import { salesperson } from "./salesperson-schema";

export const visit = pgTable("visit", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  comments: text("comments").notNull(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customer.id),
  salespersonId: text("salesperson_id")
    .notNull()
    .references(() => salesperson.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
