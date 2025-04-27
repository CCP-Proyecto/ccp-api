import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { numericAsNumber } from "../types/custom-types";
import { customer } from "./customer-schema";
import { delivery } from "./delivery-schema";
import { product } from "./product-schema";
import { salesperson } from "./salesperson-schema";

export const orderStatus = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
} as const;

export const order = pgTable("order", {
  id: serial("id").primaryKey(),
  status: text("status", {
    enum: [orderStatus.PENDING, orderStatus.SENT, orderStatus.DELIVERED],
  })
    .notNull()
    .default(orderStatus.PENDING),
  total: numericAsNumber("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  customerId: text("customer_id")
    .notNull()
    .references(() => customer.id, { onDelete: "cascade" }),
  salespersonId: text("salesperson_id").references(() => salesperson.id, {
    onDelete: "cascade",
  }),
});

export const orderProduct = pgTable("order_product", {
  orderId: integer("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  priceAtOrder: numericAsNumber("price_at_order", {
    precision: 10,
    scale: 2,
  }).notNull(),
});

export const orderRelations = relations(order, ({ one, many }) => ({
  customer: one(customer, {
    fields: [order.customerId],
    references: [customer.id],
  }),
  salesperson: one(salesperson, {
    fields: [order.salespersonId],
    references: [salesperson.id],
  }),
  delivery: one(delivery, {
    fields: [order.id],
    references: [delivery.orderId],
  }),
  orderProducts: many(orderProduct),
}));

export const orderProductRelations = relations(orderProduct, ({ one }) => ({
  order: one(order, {
    fields: [orderProduct.orderId],
    references: [order.id],
  }),
  product: one(product, {
    fields: [orderProduct.productId],
    references: [product.id],
  }),
}));
