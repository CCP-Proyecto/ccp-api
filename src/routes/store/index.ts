import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { store } from "@/db/schema/store-schema";
import { createStoreSchema, updateStoreSchema } from "./schema";

const storeRouter = new Hono();

storeRouter.get("/", async (c) => {
  const stores = await db.query.store.findMany();
  return c.json(stores);
});

storeRouter.get("/:id", async (c) => {
  const selectedStore = await db.query.store.findFirst({
    where: eq(store.id, Number(c.req.param("id"))),
  });

  if (!selectedStore) {
    throw new HTTPException(404, { message: "Store not found" });
  }

  return c.json(selectedStore);
});

storeRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsedStore = createStoreSchema(body);

  if (parsedStore instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedStore.summary,
    });
  }

  const created = await db.insert(store).values(parsedStore).returning();

  return c.json(created);
});

storeRouter.put("/:id", async (c) => {
  const body = await c.req.json();
  const parsedStore = updateStoreSchema(body);

  if (parsedStore instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedStore.summary,
    });
  }

  const updated = await db
    .update(store)
    .set({
      parsedStore,
      updatedAt: new Date(),
    })
    .where(eq(store.id, Number(c.req.param("id"))))
    .returning();

  if (!updated.length) {
    throw new HTTPException(404, {
      message: "Store not found",
    });
  }

  return c.json(updated[0]);
});

storeRouter.delete("/:id", async (c) => {
  const deleted = await db
    .delete(store)
    .where(eq(store.id, Number(c.req.param("id"))))
    .returning();

  if (!deleted.length) {
    throw new HTTPException(404, {
      message: "Store not found",
    });
  }

  return c.json({ message: "Store deleted successfully" });
});

export { storeRouter as store };
