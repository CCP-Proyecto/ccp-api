import { PeriodType } from "@/constants";
import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { salesperson } from "./salesperson-schema";

export const salesPlan = pgTable("salesPlan", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  period: text("period", {
    enum: [PeriodType.MONTHLY, PeriodType.QUARTERLY, PeriodType.ANNUALLY],
  }).notNull(),
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
