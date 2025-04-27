import { type } from "arktype";

export const createDeliverySchema = type({
  orderId: "number.integer",
  estimatedDeliveryDate: "string",
  "trackingNumber?": "string",
  "notes?": "string",
});

export const updateDeliverySchema = type({
  status: "'in transit' | 'delivered' | 'failed'",
  actualDeliveryDate: "string",
  "trackingNumber?": "string",
  notes: "string",
}).partial();
