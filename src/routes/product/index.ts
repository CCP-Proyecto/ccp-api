import { type } from "arktype";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db } from "@/db";
import { manufacturer } from "@/db/schema/manufacturer-schema";
import { product } from "@/db/schema/product-schema";
import { createProductSchema, updateProductSchema } from "./schema";

const productRouter = new Hono();

productRouter.get("/", async (c) => {
  const products = await db.query.product.findMany({
    with: {
      manufacturer: true,
    },
  });

  return c.json(products);
});

productRouter.get("/:id", async (c) => {
  const selectedProduct = await db.query.product.findFirst({
    where: eq(product.id, Number(c.req.param("id"))),
    with: {
      manufacturer: true,
    },
  });

  if (!selectedProduct) {
    throw new HTTPException(404, {
      message: "Product not found",
    });
  }

  return c.json(selectedProduct);
});

productRouter.post("/", async (c) => {
  const body = await c.req.json();

  const parsedProduct = createProductSchema(body);

  if (parsedProduct instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedProduct.summary,
    });
  }

  const manufacturerId = parsedProduct.products[0]?.manufacturerId;

  if (!manufacturerId) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: "Manufacturer id is required",
    });
  }

  const manufacturerExists = await db.query.manufacturer.findFirst({
    where: eq(manufacturer.id, manufacturerId),
  });

  if (!manufacturerExists) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: "Manufacturer does not exist",
    });
  }

  const createdProducts = await db
    .insert(product)
    .values(parsedProduct.products)
    .returning();

  return c.json(createdProducts);
});

productRouter.put("/:id", async (c) => {
  const body = await c.req.json();

  const parsedProduct = updateProductSchema(body);

  if (parsedProduct instanceof type.errors) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: parsedProduct.summary,
    });
  }

  if (!parsedProduct.manufacturerId) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: "Manufacturer id is required",
    });
  }

  const manufacturerExists = await db.query.manufacturer.findFirst({
    where: eq(manufacturer.id, parsedProduct.manufacturerId),
  });

  if (!manufacturerExists) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: "Manufacturer does not exist",
    });
  }

  const updatedProduct = await db
    .update(product)
    .set({
      ...parsedProduct,
      updatedAt: new Date(),
    })
    .where(eq(product.id, Number(c.req.param("id"))))
    .returning();

  if (!updatedProduct || updatedProduct.length === 0) {
    throw new HTTPException(404, {
      message: "Product not found",
    });
  }

  return c.json(updatedProduct[0]);
});

productRouter.delete("/:id", async (c) => {
  const deletedProduct = await db
    .delete(product)
    .where(eq(product.id, Number(c.req.param("id"))))
    .returning();

  if (!deletedProduct || deletedProduct.length === 0) {
    throw new HTTPException(404, {
      message: "Product not found",
    });
  }

  return c.json({ message: "Product deleted successfully" });
});

export { productRouter as product };
