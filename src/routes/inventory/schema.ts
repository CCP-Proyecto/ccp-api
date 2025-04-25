import { type } from "arktype";

export const inventorySchema = type({
  quantity: "number.integer",
  productId: "string.numeric",
  warehouseId: "number.integer",
});

export const createInventorySchema = type({
  inventories: inventorySchema.array(),
});

export const updateInventorySchema = inventorySchema.partial();
