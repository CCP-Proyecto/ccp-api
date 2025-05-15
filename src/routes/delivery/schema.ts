import { DeliveryStatus } from "@/constants";
import { type } from "arktype";

export const createDeliverySchema = type({
  orderId: "number.integer",
  estimatedDeliveryDate: "string",
  "trackingNumber?": "string",
  "notes?": "string",
  address: "string",
});

export const updateDeliverySchema = createDeliverySchema.partial()
