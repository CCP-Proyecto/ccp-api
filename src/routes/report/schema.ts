import { type } from "arktype";

export const createReportSchema = type({
  description: "string",
  periodType: "'monthly' | 'quarterly' | 'semiannually'",
  startDate: "string",
  salespersonId: "string",
});
export const updateReportSchema = type({
  "description?": "string",
  "date?": "string",
  "salespersonId?": "string",
});
