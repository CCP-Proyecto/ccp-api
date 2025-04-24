import { type } from "arktype";

export const createCustomerSchema = type({
  id: "string.numeric",
  idType: "string",
  name: "string",
  address: "string",
  phone: "string",
});

export const updateCustomerSchema = createCustomerSchema.partial();
