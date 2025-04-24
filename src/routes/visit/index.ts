import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
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

  const createdVisit = await db.insert(visit).values(parsedVisit).returning();
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

  const updatedVisit = await db
    .update(visit)
    .set(parsedVisit)
    .where(eq(visit.id, Number.parseInt(c.req.param("id"))))
    .returning();

  if (!updatedVisit || updatedVisit.length === 0) {
    throw new HTTPException(404, {
      message: "Visit not found",
    });
  }

  return c.json(updatedVisit[0]);
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
