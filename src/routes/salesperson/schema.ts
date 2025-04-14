import { type } from "arktype";

export const createSalespersonSchema = type({
  id: "string.numeric",
  idType: "string",
  name: "string",
  phone: "string",
  email: "string.email",
});

export const updateSalespersonSchema = createSalespersonSchema.partial();