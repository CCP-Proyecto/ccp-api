import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { salesperson } from "./salesperson-schema";

export const salesPlan = pgTable("salesPlan", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  Date: timestamp("date").notNull(),
  salespersonId: text("salesperson_id")
    .notNull()
    .references(() => salesperson.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salesPlanRelations = relations(salesPlan, ({ one }) => ({
  salesperson: one(salesperson, {
    fields: [salesPlan.salespersonId],
    references: [salesperson.id],
  }),
}));
