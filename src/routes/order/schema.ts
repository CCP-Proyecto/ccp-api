import { type } from "arktype";

export const productSchema = type({
  id: "number",
  name: "string",
  amount: "number.integer",
});

export const createOrderSchema = type({
  products: productSchema.array(),
});
