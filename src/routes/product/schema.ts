import { type } from "arktype";

export const productSchema = type({
  name: "string",
  description: "string",
  price: "number >= 0",
  amount: "number.integer",
  storageCondition: "string",
  manufacturerId: "string.numeric",
});

export const createProductSchema = type({
  products: productSchema.array(),
});

export const updateProductSchema = productSchema.partial();
