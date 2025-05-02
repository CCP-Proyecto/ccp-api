import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { customer } from "@/db/schema/customer-schema";
import { salesperson } from "@/db/schema/salesperson-schema";
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

  const { salespersonId } = parsed;

  if (salespersonId) {
    const salespersonExists = await db.query.salesperson.findFirst({
      where: eq(salesperson.id, salespersonId),
    });

    if (!salespersonExists) {
      throw new HTTPException(400, {
        message: "Invalid request body",
        cause: "Salesperson does not exist",
      });
    }
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

  const { salespersonId, ...updateData } = parsed;

  const updated = await db
    .update(customer)
    .set({
      ...updateData,
      salespersonId,
      updatedAt: new Date(),
    })
    .where(eq(customer.id, c.req.param("id")))
    .returning();

  if (!updated || updated.length === 0) {
    throw new HTTPException(404, {
      message: "Customer not found",
    });
  }

  return c.json(updated[0]);
});

customerRouter.patch("/:id/salesperson", async (c) => {
  const { salespersonId } = await c.req.json();

  if (!salespersonId) {
    throw new HTTPException(400, {
      message: "salespersonId is required",
    });
  }

  const customerId = c.req.param("id");

  const customerExists = await db.query.customer.findFirst({
    where: eq(customer.id, customerId),
  });

  if (!customerExists) {
    throw new HTTPException(404, {
      message: "Customer not found",
    });
  }

  const salespersonExists = await db.query.salesperson.findFirst({
    where: eq(salesperson.id, salespersonId),
  });

  if (!salespersonExists) {
    throw new HTTPException(400, {
      message: "Salesperson not found",
    });
  }

  const updated = await db
    .update(customer)
    .set({ salespersonId })
    .where(eq(customer.id, customerId))
    .returning();

  return c.json(updated[0]);
});

customerRouter.get("/salesperson/:salespersonId", async (c) => {
  const salespersonId = c.req.param("salespersonId");

  const salespersonExists = await db.query.salesperson.findFirst({
    where: eq(salesperson.id, salespersonId),
  });

  if (!salespersonExists) {
    throw new HTTPException(404, {
      message: "Salesperson not found",
    });
  }

  const customers = await db.query.customer.findMany({
    where: eq(customer.salespersonId, salespersonId),
  });

  return c.json(customers);
});

customerRouter.delete("/:id", async (c) => {
  const deleted = await db
    .delete(customer)
    .where(eq(customer.id, c.req.param("id")))
    .returning();

  if (!deleted || deleted.length === 0) {
    throw new HTTPException(404, {
      message: "Customer not found",
    });
  }

  return c.json({ message: "Customer deleted successfully" });
});

export { customerRouter as customer };
