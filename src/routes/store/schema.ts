import { type } from "arktype";

export const storeSchema = type({
  name: "string",
  address: "string",
});

export const createStoreSchema = storeSchema;

export const updateStoreSchema = storeSchema.partial();
