import { type } from "arktype";

export const createSalesPlanSchema = type({
  description: "string",
  date: "string",
  salespersonId: "string",
});

export const updateSalesPlanSchema = type({
  "description?": "string",
  "date?": "string",
  "salespersonId?": "string",
});
