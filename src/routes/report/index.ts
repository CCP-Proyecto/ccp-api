import { type } from "arktype";
import { and, eq, gte, lt } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { order } from "@/db/schema/order-schema";
import { report } from "@/db/schema/report-schema";
import { salesperson } from "@/db/schema/salesperson-schema";
import { addMonths, addQuarters } from "date-fns";
import {
  createReportSchema,
  updateReportSchema,
} from "./schema";

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

  const startDate = new Date(parsedReport.periodStart);
  let endDate: Date;

  switch (parsedReport.periodType) {
    case "monthly":
      endDate = addMonths(startDate, 1);
      break;
    case "quarterly":
      endDate = addQuarters(startDate, 1);
      break;
    case "semiannually":
      endDate = addMonths(startDate, 6);
      break;
    default:
      throw new HTTPException(400, { message: "Invalid period type" });
  }

  const orders = await db.query.order.findMany({
    where: and(
      eq(order.salespersonId, parsedReport.salespersonId),
      gte(order.createdAt, startDate),
      lt(order.createdAt, endDate),
    ),
    with: {
      customer: true,
      orderProducts: {
        with: {
          product: true,
        },
      },
    },
  });

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );

  const createdReport = await db
    .insert(report)
    .values({
      description: `Sales report for ${parsedReport.periodType} period starting ${startDate.toISOString()}`,
      Date: new Date(),
      salespersonId: parsedReport.salespersonId,
      periodType: parsedReport.periodType,
      periodStart: startDate,
      periodEnd: endDate,
    })
    .returning();

  return c.json(
    {
      report: createdReport[0],
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        type: parsedReport.periodType,
      },
      orders,
      summary: {
        totalOrders,
        totalRevenue,
      },
    },
    201,
  );
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

reportRouter.get("/salesperson/:salespersonId", async (c) => {
  const salespersonId = c.req.param("salespersonId");

  const salespersonExists = await db.query.salesperson.findFirst({
    where: eq(salesperson.id, salespersonId),
  });

  if (!salespersonExists) {
    throw new HTTPException(404, { message: "Salesperson not found" });
  }

  const reports = await db.query.report.findMany({
    where: eq(report.salespersonId, salespersonId),
    with: {
      salesperson: true,
    },
  });

  const orders = await db.query.order.findMany({
    where: eq(order.salespersonId, salespersonId),
    with: {
      customer: true,
      salesperson: true,
      orderProducts: {
        with: {
          product: true,
        },
      },
    },
  });

  return c.json({
    reports,
    orders,
  });
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
