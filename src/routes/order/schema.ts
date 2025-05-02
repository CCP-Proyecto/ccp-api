import { OrderStatus } from "@/constants";
import { type } from "arktype";

export const orderProductSchema = type({
  productId: "number.integer",
  "salespersonId?":"string.numeric",
  quantity: "number.integer",
  "priceAtOrder?": "number",
});

export const createOrderSchema = type({
  customerId: "string",
  "salespersonId?": "string",
  products: orderProductSchema.array(),
});

export const updateOrderSchema = type({
  status: type.valueOf(OrderStatus),
}).partial();
