import { type } from "arktype";
import { and, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { customer } from "@/db/schema/customer-schema";
import { salesperson } from "@/db/schema/salesperson-schema";
import { visit } from "@/db/schema/visit-schema";
import { createVisitSchema, updateVisitSchema } from "./schema";

const visitRouter = new Hono();

visitRouter.get("/", async (c) => {
  const visits = await db.select().from(visit);
  return c.json(visits);
});

visitRouter.get("/:id", async (c) => {
  const selectedVisit = await db.query.visit.findFirst({
    where: eq(visit.id, Number.parseInt(c.req.param("id"))),
  });

  if (!selectedVisit) {
    throw new HTTPException(404, {
      message: "Visit not found",
    });
  }

  return c.json(selectedVisit);
});

visitRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsedVisit = createVisitSchema(body);

  if (parsedVisit instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedVisit.summary,
    });
  }

  const { customerId, salespersonId } = parsedVisit;

  const [customerExists, salespersonExists] = await Promise.all([
    db.query.customer.findFirst({
      where: eq(customer.id, customerId),
    }),
    db.query.salesperson.findFirst({
      where: eq(salesperson.id, salespersonId),
    }),
  ]);

  if (!customerExists) {
    throw new HTTPException(400, {
      message: "Customer does not exist",
    });
  }

  if (!salespersonExists) {
    throw new HTTPException(400, {
      message: "Salesperson does not exist",
    });
  }

  const createdVisit = await db
    .insert(visit)
    .values({ ...parsedVisit, visitDate: new Date(parsedVisit.visitDate) })
    .returning();

  return c.json(createdVisit[0]);
});

visitRouter.put("/:id", async (c) => {
  const body = await c.req.json();
  const parsedVisit = updateVisitSchema(body);

  if (parsedVisit instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedVisit.summary,
    });
  }

  const { customerId, salespersonId } = parsedVisit;

  if (customerId) {
    const customerExists = await db.query.customer.findFirst({
      where: eq(customer.id, customerId),
    });
    if (!customerExists) {
      throw new HTTPException(400, {
        message: "Customer does not exist",
      });
    }
  }

  if (salespersonId) {
    const salespersonExists = await db.query.salesperson.findFirst({
      where: eq(salesperson.id, salespersonId),
    });
    if (!salespersonExists) {
      throw new HTTPException(400, {
        message: "Salesperson does not exist",
      });
    }
  }

  const updatedVisit = await db
    .update(visit)
    .set({
      ...parsedVisit,
      visitDate: parsedVisit.visitDate
        ? new Date(parsedVisit.visitDate)
        : undefined,
      updatedAt: new Date(),
    })
    .where(eq(visit.id, Number.parseInt(c.req.param("id"))))
    .returning();

  if (!updatedVisit || updatedVisit.length === 0) {
    throw new HTTPException(404, {
      message: "Visit not found",
    });
  }

  return c.json(updatedVisit[0]);
});

visitRouter.get("/salesperson/:salespersonId", async (c) => {
  const salespersonIdParam = c.req.param("salespersonId");
  if (
    !salespersonIdParam ||
    Number.isNaN(Number.parseInt(salespersonIdParam))
  ) {
    throw new HTTPException(400, { message: "Invalid salesperson ID" });
  }

  const visits = await db.query.visit.findMany({
    where: eq(visit.salespersonId, salespersonIdParam),
  });

  return c.json(visits);
});

visitRouter.get("/salesperson/:salespersonId/date/:date", async (c) => {
  const salespersonIdParam = c.req.param("salespersonId");
  const salespersonId = Number.parseInt(salespersonIdParam);
  const dateString = c.req.param("date");

  if (Number.isNaN(salespersonId)) {
    throw new HTTPException(400, { message: "Invalid salesperson ID" });
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    throw new HTTPException(400, { message: "Invalid date format" });
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const visits = await db.query.visit.findMany({
    where: and(
      eq(visit.salespersonId, salespersonIdParam),
      gte(visit.visitDate, startOfDay),
      lte(visit.visitDate, endOfDay),
    ),
  });

  return c.json(visits);
});

visitRouter.delete("/:id", async (c) => {
  const deletedVisit = await db
    .delete(visit)
    .where(eq(visit.id, Number.parseInt(c.req.param("id"))))
    .returning();

  if (!deletedVisit || deletedVisit.length === 0) {
    throw new HTTPException(404, {
      message: "Visit not found",
    });
  }

  return c.json({ message: "Visit deleted successfully" });
});

export { visitRouter as visit };
