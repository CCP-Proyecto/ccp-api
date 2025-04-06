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

  const createdManufacturer = await db
    .insert(manufacturer)
    .values(parsedManufacturer)
    .returning();

  return c.json(createdManufacturer);
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

  if (!updatedManufacturer) {
    throw new HTTPException(404, {
      message: "Manufacturer not found",
    });
  }

  return c.json(updatedManufacturer);
});

manufacturerRouter.delete("/:id", async (c) => {
  const deletedManufacturer = await db
    .delete(manufacturer)
    .where(eq(manufacturer.id, c.req.param("id")));

  if (!deletedManufacturer) {
    throw new HTTPException(404, {
      message: "Manufacturer not found",
    });
  }

  return c.json({ message: "Manufacturer deleted successfully" });
});

export { manufacturerRouter as manufacturer };
