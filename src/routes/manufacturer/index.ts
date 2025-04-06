import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { manufacturer } from "@/db/schema/schema";
import { createManufacturerSchema, updateManufacturerSchema } from "./schema";

const manufacturerRouter = new Hono();

manufacturerRouter.get("/", async (c) => {
  const manufacturers = await db.select().from(manufacturer);

  return c.json(manufacturers);
});

manufacturerRouter.get("/:id", async (c) => {
  const selectedManufacturer = await db.query.manufacturer.findFirst({
    where: eq(manufacturer.id, c.req.param("id")),
  });

  if (!selectedManufacturer) {
    throw new HTTPException(404, {
      message: "Manufacturer not found",
    });
  }

  return c.json(selectedManufacturer);
});

manufacturerRouter.post("/", async (c) => {
  const body = await c.req.json();

  const parsedManufacturer = createManufacturerSchema(body);

  if (parsedManufacturer instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedManufacturer.summary,
    });
  }

  const manufacturerExists = await db.query.manufacturer.findFirst({
    where: eq(manufacturer.id, parsedManufacturer.id),
  });

  if (manufacturerExists) {
    throw new HTTPException(400, {
      message: "Manufacturer already exists",
    });
  }

  const createdManufacturer = await db
    .insert(manufacturer)
    .values(parsedManufacturer)
    .returning();

  return c.json(createdManufacturer[0]);
});

manufacturerRouter.put("/:id", async (c) => {
  const body = await c.req.json();

  const parsedManufacturer = updateManufacturerSchema(body);

  if (parsedManufacturer instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedManufacturer.summary,
    });
  }

  const updatedManufacturer = await db
    .update(manufacturer)
    .set(parsedManufacturer)
    .where(eq(manufacturer.id, c.req.param("id")))
    .returning();

  if (!updatedManufacturer || updatedManufacturer.length === 0) {
    throw new HTTPException(404, {
      message: "Manufacturer not found",
    });
  }

  return c.json(updatedManufacturer[0]);
});

manufacturerRouter.delete("/:id", async (c) => {
  const deletedManufacturer = await db
    .delete(manufacturer)
    .where(eq(manufacturer.id, c.req.param("id"))).returning();

  if (!deletedManufacturer || deletedManufacturer.length === 0) {
    throw new HTTPException(404, {
      message: "Manufacturer not found",
    });
  }

  return c.json({ message: "Manufacturer deleted successfully" });
});

export { manufacturerRouter as manufacturer };
