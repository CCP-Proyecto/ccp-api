import { ReportPeriodType } from "@/constants";
import { type } from "arktype";

export const createReportSchema = type({
  description: "string",
  periodType: type.valueOf(ReportPeriodType),
  periodStart: "string",
  salespersonId: "string",
});

export const updateReportSchema = type({
  "description?": "string",
  "date?": "string",
  "periodType?": type.valueOf(ReportPeriodType),
  "periodStart?": "string",
  "periodEnd?": "string",
  "salespersonId?": "string",
});
