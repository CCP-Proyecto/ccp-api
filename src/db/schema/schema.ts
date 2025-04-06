import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const manufacturer = pgTable("manufacturer", {
  id: text("id").primaryKey(),
  idType: text("id_type").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

