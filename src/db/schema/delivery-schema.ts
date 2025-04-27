import { relations } from "drizzle-orm";
import {
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { order } from "./order-schema";

export const deliveryStatus = {
  IN_TRANSIT: "in transit",
  DELIVERED: "delivered",
  FAILED: "failed",
} as const;

export const delivery = pgTable("delivery", {
  id: serial("id").primaryKey(),
  estimatedDeliveryDate: date("estimated_delivery_date").notNull(),
  actualDeliveryDate: date("actual_delivery_date"),
  status: text("status", {
    enum: [
      deliveryStatus.IN_TRANSIT,
      deliveryStatus.DELIVERED,
      deliveryStatus.FAILED,
    ],
  })
    .notNull()
    .default(deliveryStatus.IN_TRANSIT),
  trackingNumber: text("tracking_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  orderId: integer("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" })
    .unique(),
});

export const deliveryRelations = relations(delivery, ({ one }) => ({
  order: one(order, {
    fields: [delivery.orderId],
    references: [order.id],
  }),
}));
