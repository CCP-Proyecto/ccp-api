import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { report } from "@/db/schema/report-schema";
import { salesperson } from "@/db/schema/salesperson-schema";
import { createReportSchema, updateReportSchema } from "./schema";

const reportRouter = new Hono();

reportRouter.get("/", async (c) => {
  const reports = await db.query.report.findMany({
    with: {
      salesperson: true,
    },
  });
  return c.json(reports);
});

reportRouter.get("/:id", async (c) => {
  const selectedReport = await db.query.report.findFirst({
    where: eq(report.id, Number(c.req.param("id"))),
    with: {
      salesperson: true,
    },
  });

  if (!selectedReport) {
    throw new HTTPException(404, { message: "Report not found" });
  }

  return c.json(selectedReport);
});

reportRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsedReport = createReportSchema(body);

  if (parsedReport instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedReport.summary,
    });
  }

  const salespersonExists = await db.query.salesperson.findFirst({
    where: eq(salesperson.id, parsedReport.salespersonId),
  });
  if (!salespersonExists) {
    throw new HTTPException(400, { message: "Salesperson does not exist" });
  }

  const created = await db
    .insert(report)
    .values({
      description: parsedReport.description,
      Date: new Date(parsedReport.date),
      salespersonId: parsedReport.salespersonId,
    })
    .returning();

  return c.json(created[0], 201);
});

reportRouter.patch("/:id", async (c) => {
  const body = await c.req.json();
  const parsedReport = updateReportSchema(body);

  if (parsedReport instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedReport.summary,
    });
  }

  const updateData: Partial<typeof report.$inferInsert> = {};

  if (parsedReport.description) {
    updateData.description = parsedReport.description;
  }
  if (parsedReport.date) {
    updateData.Date = new Date(parsedReport.date);
  }
  if (parsedReport.salespersonId) {
    const salespersonExists = await db.query.salesperson.findFirst({
      where: eq(salesperson.id, parsedReport.salespersonId),
    });
    if (!salespersonExists) {
      throw new HTTPException(400, { message: "Salesperson does not exist" });
    }
    updateData.salespersonId = parsedReport.salespersonId;
  }

  const updated = await db
    .update(report)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(report.id, Number(c.req.param("id"))))
    .returning();

  if (!updated.length) {
    throw new HTTPException(404, { message: "Report not found" });
  }

  return c.json(updated[0]);
});

reportRouter.delete("/:id", async (c) => {
  const deleted = await db
    .delete(report)
    .where(eq(report.id, Number(c.req.param("id"))))
    .returning();

  if (!deleted.length) {
    throw new HTTPException(404, { message: "Report not found" });
  }

  return c.json({ message: "Report deleted successfully" });
});

export { reportRouter as report };
