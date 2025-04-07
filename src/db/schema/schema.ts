import { relations } from "drizzle-orm";
import {
  customType,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const numericAsNumber = customType<{ data: number }>({
  dataType: (config) => {
    //@ts-ignore
    if (config?.precision && config?.scale) {
      //@ts-ignore
      return `numeric(${config.precision}, ${config.scale})`;
    }
    return "numeric";
  },
  toDriver(value: number): string {
    return String(value);
  },
  fromDriver(value): number {
    return Number(value);
  },
});

export const manufacturer = pgTable("manufacturer", {
  id: text("id").primaryKey().notNull(),
  idType: text("id_type").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const product = pgTable("product", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numericAsNumber("price", {
    precision: 10,
    scale: 2,
  }),
  amount: integer("amount").notNull(),
  storageCondition: text("storage_condition").notNull(),
  manufacturerId: text("manufacturer_id")
    .notNull()
    .references(() => manufacturer.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const order = pgTable("order", {
  id: serial("id").primaryKey(),
  products: json("products")
    .$type<
      Array<{
        id: number;
        name: string;
        amount: number;
      }>
    >()
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const manufacturerRelations = relations(manufacturer, ({ many }) => ({
  products: many(product),
}));

export const productRelations = relations(product, ({ one }) => ({
  manufacturer: one(manufacturer, {
    fields: [product.manufacturerId],
    references: [manufacturer.id],
  }),
}));
