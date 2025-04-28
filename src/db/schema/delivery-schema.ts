import { relations } from "drizzle-orm";
import {
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { DeliveryStatus } from "@/constants";
import { order } from "./order-schema";

export const delivery = pgTable("delivery", {
  id: serial("id").primaryKey(),
  estimatedDeliveryDate: date("estimated_delivery_date").notNull(),
  actualDeliveryDate: date("actual_delivery_date"),
  status: text("status", {
    enum: [
      DeliveryStatus.DELIVERED,
      DeliveryStatus.FAILED,
      DeliveryStatus.IN_TRANSIT,
      DeliveryStatus.PENDING,
    ],
  })
    .notNull()
    .default(DeliveryStatus.PENDING),
  trackingNumber: text("tracking_number"),
  notes: text("notes"),
  address: text("address"),
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
