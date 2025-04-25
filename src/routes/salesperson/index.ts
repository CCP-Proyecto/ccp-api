import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { salesperson } from "@/db/schema/salesperson-schema";
import { createSalespersonSchema, updateSalespersonSchema } from "./schema";

const salespersonRouter = new Hono();

salespersonRouter.get("/", async (c) => {
  const salespeople = await db.select().from(salesperson);
  return c.json(salespeople);
});

salespersonRouter.get("/:id", async (c) => {
  const selectedSalesperson = await db.query.salesperson.findFirst({
    where: eq(salesperson.id, c.req.param("id")),
  });

  if (!selectedSalesperson) {
    throw new HTTPException(404, {
      message: "Salesperson not found",
    });
  }

  return c.json(selectedSalesperson);
});

salespersonRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createSalespersonSchema(body);

  if (parsed instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsed.summary,
    });
  }

  const exists = await db.query.salesperson.findFirst({
    where: eq(salesperson.id, parsed.id),
  });

  if (exists) {
    throw new HTTPException(400, {
      message: "Salesperson already exists",
    });
  }

  const created = await db.insert(salesperson).values(parsed).returning();
  return c.json(created[0]);
});

salespersonRouter.put("/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateSalespersonSchema(body);

  if (parsed instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsed.summary,
    });
  }

  const updated = await db
    .update(salesperson)
    .set({
      ...parsed,
      updatedAt: new Date(),
    })
    .where(eq(salesperson.id, c.req.param("id")))
    .returning();

  if (!updated || updated.length === 0) {
    throw new HTTPException(404, {
      message: "Salesperson not found",
    });
  }

  return c.json(updated[0]);
});

salespersonRouter.delete("/:id", async (c) => {
  const deleted = await db
    .delete(salesperson)
    .where(eq(salesperson.id, c.req.param("id")))
    .returning();

  if (!deleted || deleted.length === 0) {
    throw new HTTPException(404, {
      message: "Salesperson not found",
    });
  }

  return c.json({ message: "Salesperson deleted successfully" });
});

export { salespersonRouter as salesperson };
