import { PeriodType } from "@/constants";
import { type } from "arktype";

export const createSalesPlanSchema = type({
  name: "string",
  description: "string",
  period: type.valueOf(PeriodType),
  salespersonId: "string",
});

export const updateSalesPlanSchema = type({
  "name?": "string",
  "description?": "string",
  "period?": type.valueOf(PeriodType),
  "salespersonId?": "string",
});
