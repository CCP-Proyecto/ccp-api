import { type } from "arktype";

export const createManufacturerSchema = type({
  id: "string.uuid",
  idType: "string",
  name: "string",
  phone: "string",
  address: "string",
  email: "string.email",
});

export const updateManufacturerSchema = createManufacturerSchema.partial();
