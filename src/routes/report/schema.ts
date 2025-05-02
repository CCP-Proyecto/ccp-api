import { type } from "arktype";

export const createReportSchema = type({
  description: "string",
  date: "string",
  salespersonId: "string",
});

export const updateReportSchema = type({
  "description?": "string",
  "date?": "string",
  "salespersonId?": "string",
});
