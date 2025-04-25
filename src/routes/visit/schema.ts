import { type } from "arktype";

export const createVisitSchema = type({
  date: "string.date",
  comments: "string",
  customerId: "string.numeric",
  salespersonId: "string.numeric",
});

export const updateVisitSchema = createVisitSchema.partial();
