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
  const salespersonId = c.req.query("salespersonId");

  if (salespersonId) {
    const salesPlans = await db.query.salesPlan.findMany({
      where: eq(salesPlan.salespersonId, salespersonId),
      with: {
        salesperson: true,
      },
    });
    return c.json(salesPlans);
  }

  const salesPlans = await db.query.salesPlan.findMany({
    with: {
      salesperson: true,
    },
  });
  return c.json(salesPlans);
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
      period: parsedSalesPlan.period,
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
  if (parsedSalesPlan.period) {
    updateData.period = parsedSalesPlan.period;
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
