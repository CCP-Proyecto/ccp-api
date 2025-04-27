import { type } from "arktype";

export const orderProductSchema = type({
  productId: "number.integer",
  quantity: "number.integer",
  "priceAtOrder?": "number",
});

export const createOrderSchema = type({
  customerId: "string",
  "salespersonId?": "string",
  products: orderProductSchema.array(),
});

export const updateOrderSchema = type({
  status: "'pending' | 'sent' | 'delivered'",
}).partial();
