import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { salesPlan } from "@/db/schema/salesPlan-schema";
import { salesperson } from "@/db/schema/salesperson-schema";
import { createSalesPlanSchema, updateSalesPlanSchema } from "./schema";

const salesPlanRouter = new Hono();

salesPlanRouter.get("/", async (c) => {
  const salesPlans = await db.query.salesPlan.findMany({
    with: {
      salesperson: true,
    },
  });
  return c.json(salesPlans);
});

salesPlanRouter.get("/:id", async (c) => {
  const selectedSalesPlan = await db.query.salesPlan.findFirst({
    where: eq(salesPlan.id, Number(c.req.param("id"))),
    with: {
      salesperson: true,
    },
  });

  if (!selectedSalesPlan) {
    throw new HTTPException(404, { message: "SalesPlan not found" });
  }

  return c.json(selectedSalesPlan);
});

salesPlanRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsedSalesPlan = createSalesPlanSchema(body);

  if (parsedSalesPlan instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedSalesPlan.summary,
    });
  }

  const salespersonExists = await db.query.salesperson.findFirst({
    where: eq(salesperson.id, parsedSalesPlan.salespersonId),
  });
  if (!salespersonExists) {
    throw new HTTPException(400, { message: "Salesperson does not exist" });
  }

  const created = await db
    .insert(salesPlan)
    .values({
      description: parsedSalesPlan.description,
      Date: new Date(parsedSalesPlan.date),
      salespersonId: parsedSalesPlan.salespersonId,
    })
    .returning();

  return c.json(created[0], 201);
});

salesPlanRouter.patch("/:id", async (c) => {
  const body = await c.req.json();
  const parsedSalesPlan = updateSalesPlanSchema(body);

  if (parsedSalesPlan instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedSalesPlan.summary,
    });
  }

  const updateData: Partial<typeof salesPlan.$inferInsert> = {};

  if (parsedSalesPlan.description) {
    updateData.description = parsedSalesPlan.description;
  }
  if (parsedSalesPlan.date) {
    updateData.Date = new Date(parsedSalesPlan.date);
  }
  if (parsedSalesPlan.salespersonId) {
    const salespersonExists = await db.query.salesperson.findFirst({
      where: eq(salesperson.id, parsedSalesPlan.salespersonId),
    });
    if (!salespersonExists) {
      throw new HTTPException(400, { message: "Salesperson does not exist" });
    }
    updateData.salespersonId = parsedSalesPlan.salespersonId;
  }

  const updated = await db
    .update(salesPlan)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(salesPlan.id, Number(c.req.param("id"))))
    .returning();

  if (!updated.length) {
    throw new HTTPException(404, { message: "SalesPlan not found" });
  }

  return c.json(updated[0]);
});

salesPlanRouter.delete("/:id", async (c) => {
  const deleted = await db
    .delete(salesPlan)
    .where(eq(salesPlan.id, Number(c.req.param("id"))))
    .returning();

  if (!deleted.length) {
    throw new HTTPException(404, { message: "SalesPlan not found" });
  }

  return c.json({ message: "SalesPlan deleted successfully" });
});

export { salesPlanRouter as salesPlan };
