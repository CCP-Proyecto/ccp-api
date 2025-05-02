import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { customer } from "./customer-schema"; // Add this import
import { salesperson } from "./salesperson-schema";

export const statement = pgTable("statement", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  Date: timestamp("date").notNull(),
  salespersonId: text("salesperson_id")
    .notNull()
    .references(() => salesperson.id),
  customerId: text("customer_id")
    .notNull()
    .references(() => customer.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const statementRelations = relations(statement, ({ one }) => ({
  salesperson: one(salesperson, {
    fields: [statement.salespersonId],
    references: [salesperson.id],
  }),
  customer: one(customer, {
    fields: [statement.customerId],
    references: [customer.id],
  }),
}));
