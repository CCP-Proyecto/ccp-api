import { DeliveryStatus } from "@/constants";
import { type } from "arktype";

export const createDeliverySchema = type({
  orderId: "number.integer",
  estimatedDeliveryDate: "string",
  "trackingNumber?": "string",
  "notes?": "string",
});

export const updateDeliverySchema = type({
  "status?": type.valueOf(DeliveryStatus),
  "actualDeliveryDate?": "string",
  "trackingNumber?": "string",
  "notes?": "string",
});
