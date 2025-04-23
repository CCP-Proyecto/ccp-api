import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { customer } from "@/db/schema/customer-schema";
import { salesperson } from "@/db/schema/salesperson-schema";
import { createCustomerSchema, updateCustomerSchema } from "./schema";

const customerRouter = new Hono();

// Helper function to check if a customer exists
const customerExists = async (id: string) => {
  return await db.query.customer.findFirst({
    where: eq(customer.id, id),
  });
};

// Get all customers
customerRouter.get("/", async (c) => {
  const customers = await db.select().from(customer);
  return c.json(customers);
});

// Get a specific customer by ID
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

// Create a new customer
customerRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createCustomerSchema(body);

  if (parsed instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsed.summary,
    });
  }

  // Check if the customer already exists
  const exists = await db.query.customer.findFirst({
    where: eq(customer.id, parsed.id),
  });

  if (exists) {
    throw new HTTPException(400, {
      message: "Customer already exists",
    });
  }

  // Validate salespersonId if it's provided
  const {salespersonId} = parsed;

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

  // Create the customer if validation passes
  const created = await db.insert(customer).values(parsed).returning();
  return c.json(created[0]);
});


// Update an existing customer by ID
customerRouter.put("/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateCustomerSchema(body);

  if (parsed instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsed.summary,
    });
  }

  // Explicitly prevent salespersonId from being updated here
  const { salespersonId, ...updateData } = parsed;

  const updated = await db
    .update(customer)
    .set(updateData)
    .where(eq(customer.id, c.req.param("id")))
    .returning();

  if (!updated || updated.length === 0) {
    throw new HTTPException(404, {
      message: "Customer not found",
    });
  }

  return c.json(updated[0]);
});

// Assign a salesperson to a customer
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


// Delete a customer by ID
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
