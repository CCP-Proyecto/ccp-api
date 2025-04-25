import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { salesperson } from "./salesperson-schema";
import { visit } from "./visit-schema";

export const customer = pgTable("customer", {
  id: text("id").primaryKey(),
  idType: text("id_type").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  salespersonId: text("salesperson_id").references(() => salesperson.id, {
    onDelete: "set null",
  }),
});

export const customerRelations = relations(customer, ({ one, many }) => ({
  salesperson: one(salesperson, {
    fields: [customer.salespersonId],
    references: [salesperson.id],
  }),
  visits: many(visit),
}));
