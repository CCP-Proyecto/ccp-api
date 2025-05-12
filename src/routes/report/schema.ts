import { PeriodType } from "@/constants";
import { type } from "arktype";

export const createReportSchema = type({
  description: "string",
  periodType: type.valueOf(PeriodType),
  periodStart: "string",
  salespersonId: "string",
});

export const updateReportSchema = type({
  "description?": "string",
  "date?": "string",
  "periodType?": type.valueOf(PeriodType),
  "periodStart?": "string",
  "periodEnd?": "string",
  "salespersonId?": "string",
});
