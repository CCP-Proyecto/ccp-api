import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { visit } from "./visit-schema";
import { salesperson } from "./salesperson-schema";

export const customer = pgTable("customer", {
  id: serial("id").primaryKey(),
  idType: text("id_type").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  salespersonId: integer("salesperson_id").notNull().references(() => salesperson.id),
});

export const customerRelations = relations(customer, ({ one, many }) => ({
  salesperson: one(salesperson, {
    fields: [customer.salespersonId],
    references: [salesperson.id],
  }),
  visits: many(visit),
}));
