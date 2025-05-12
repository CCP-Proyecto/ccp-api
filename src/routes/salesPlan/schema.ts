import { PeriodType } from "@/constants";
import { type } from "arktype";

export const createSalesPlanSchema = type({
  description: "string",
  period: type.valueOf(PeriodType),
  salespersonId: "string",
});

export const updateSalesPlanSchema = type({
  "description?": "string",
  "period?": type.valueOf(PeriodType),
  "salespersonId?": "string",
});
