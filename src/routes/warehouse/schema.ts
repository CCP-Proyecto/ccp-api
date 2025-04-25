import { type } from "arktype";

export const warehouseSchema = type({
  name: "string",
  address: "string",
});

export const createWarehouseSchema = warehouseSchema;

export const updateWarehouseSchema = warehouseSchema.partial();
