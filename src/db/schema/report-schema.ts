import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { salesperson } from "./salesperson-schema";
import { ReportPeriodType } from "@/constants";


export const report = pgTable("report", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  Date: timestamp("date").notNull(),
  salespersonId: text("salesperson_id")
    .notNull()
    .references(() => salesperson.id),
  periodType: text("period_type", {
      enum: [
        ReportPeriodType.MONTHLY,
        ReportPeriodType.QUARTERLY,
        ReportPeriodType.SEMIANNUALLY,
      ],
    }).notNull(),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reportRelations = relations(report, ({ one }) => ({
  salesperson: one(salesperson, {
    fields: [report.salespersonId],
    references: [salesperson.id],
  }),
}));
