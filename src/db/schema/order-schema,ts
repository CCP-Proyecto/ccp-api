import { pgTable, serial, timestamp, json } from "drizzle-orm/pg-core";

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
