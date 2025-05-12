import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { salesperson } from "./salesperson-schema";
import { PeriodType } from "@/constants";

export const salesPlan = pgTable("salesPlan", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  period: text("period", {
      enum: [
        PeriodType.MONTHLY,
        PeriodType.QUARTERLY,
        PeriodType.SEMIANNUALLY,
      ],
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
