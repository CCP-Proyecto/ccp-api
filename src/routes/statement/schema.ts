import { type } from "arktype";

export const createStatementSchema = type({
  description: "string",
  date: "string",
  salespersonId: "string",
  customerId: "string",
});

export const updateStatementSchema = createStatementSchema.partial();
