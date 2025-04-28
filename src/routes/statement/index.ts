import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { statement } from "@/db/schema/statement-schema";
import { salesperson } from "@/db/schema/salesperson-schema";
import { createStatementSchema, updateStatementSchema } from "./schema";

const statementRouter = new Hono();

statementRouter.get("/", async (c) => {
  const statements = await db.query.statement.findMany({
    with: {
      salesperson: true,
    },
  });
  return c.json(statements);
});

statementRouter.get("/:id", async (c) => {
  const selectedStatement = await db.query.statement.findFirst({
    where: eq(statement.id, Number(c.req.param("id"))),
    with: {
      salesperson: true,
    },
  });

  if (!selectedStatement) {
    throw new HTTPException(404, { message: "Statement not found" });
  }

  return c.json(selectedStatement);
});

statementRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsedStatement = createStatementSchema(body);

  if (parsedStatement instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedStatement.summary,
    });
  }

  const salespersonExists = await db.query.salesperson.findFirst({
    where: eq(salesperson.id, parsedStatement.salespersonId),
  });
  if (!salespersonExists) {
    throw new HTTPException(400, { message: "Salesperson does not exist" });
  }

  const created = await db
    .insert(statement)
    .values({
      description: parsedStatement.description,
      Date: new Date(parsedStatement.date),
      salespersonId: parsedStatement.salespersonId,
    })
    .returning();

  return c.json(created[0], 201);
});

statementRouter.patch("/:id", async (c) => {
  const body = await c.req.json();
  const parsedStatement = updateStatementSchema(body);

  if (parsedStatement instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedStatement.summary,
    });
  }

  const updateData: Partial<typeof statement.$inferInsert> = {};

  if (parsedStatement.description) {
    updateData.description = parsedStatement.description;
  }
  if (parsedStatement.date) {
    updateData.Date = new Date(parsedStatement.date);
  }
  if (parsedStatement.salespersonId) {
    const salespersonExists = await db.query.salesperson.findFirst({
      where: eq(salesperson.id, parsedStatement.salespersonId),
    });
    if (!salespersonExists) {
      throw new HTTPException(400, { message: "Salesperson does not exist" });
    }
    updateData.salespersonId = parsedStatement.salespersonId;
  }

  const updated = await db
    .update(statement)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(statement.id, Number(c.req.param("id"))))
    .returning();

  if (!updated.length) {
    throw new HTTPException(404, { message: "Statement not found" });
  }

  return c.json(updated[0]);
});

statementRouter.delete("/:id", async (c) => {
  const deleted = await db
    .delete(statement)
    .where(eq(statement.id, Number(c.req.param("id"))))
    .returning();

  if (!deleted.length) {
    throw new HTTPException(404, { message: "Statement not found" });
  }

  return c.json({ message: "Statement deleted successfully" });
});

export { statementRouter as statement };
