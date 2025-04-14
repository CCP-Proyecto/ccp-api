import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { customer } from "@/db/schema/customer-schema";
import { createCustomerSchema, updateCustomerSchema } from "./schema";

const customerRouter = new Hono();

customerRouter.get("/", async (c) => {
  const customers = await db.select().from(customer);
  return c.json(customers);
});

customerRouter.get("/:id", async (c) => {
  const selectedCustomer = await db.query.customer.findFirst({
    where: eq(customer.id, c.req.param("id")),
  });

  if (!selectedCustomer) {
    throw new HTTPException(404, {
      message: "Customer not found",
    });
  }

  return c.json(selectedCustomer);
});

customerRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createCustomerSchema(body);

  if (parsed instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsed.summary,
    });
  }

  const exists = await db.query.customer.findFirst({
    where: eq(customer.id, parsed.id),
  });

  if (exists) {
    throw new HTTPException(400, {
      message: "Customer already exists",
    });
  }

  const created = await db.insert(customer).values(parsed).returning();
  return c.json(created[0]);
});

customerRouter.put("/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateCustomerSchema(body);

  if (parsed instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsed.summary,
    });
  }

  const updated = await db
    .update(customer)
    .set(parsed)
    .where(eq(customer.id, c.req.param("id")))
    .returning();

  if (!updated || updated.length === 0) {
    throw new HTTPException(404, {
      message: "Customer not found",
    });
  }

  return c.json(updated[0]);
});

customerRouter.delete("/:id", async (c) => {
  const deleted = await db.delete(customer).where(eq(customer.id, c.req.param("id"))).returning();

  if (!deleted || deleted.length === 0) {
    throw new HTTPException(404, {
      message: "Customer not found",
    });
  }

  return c.json({ message: "Customer deleted successfully" });
});

export { customerRouter as customer };
