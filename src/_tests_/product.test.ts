import { beforeEach, describe, expect, mock, test } from "bun:test";
import { product } from "@/routes/product";
import { Hono } from "hono";

// Sample data for tests
const mockProducts = [
  {
    id: 1,
    name: "Product One",
    description: "Description One",
    price: 99.99,
    manufacturerId: 1,
    manufacturer: { id: 1, name: "Manufacturer One" },
  },
  {
    id: 2,
    name: "Product Two",
    description: "Description Two",
    price: 199.99,
    manufacturerId: 2,
    manufacturer: { id: 2, name: "Manufacturer Two" },
  },
];

// Mock the entire db module
mock.module("@/db", () => ({
  db: {
    query: {
      product: {
        findMany: mock(() => mockProducts),
        findFirst: mock(() => null),
      },
      manufacturer: {
        findFirst: mock(() => null),
      },
    },
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => []),
      })),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      })),
    })),
    delete: mock(() => ({
      where: mock(() => ({
        returning: mock(() => []),
      })),
    })),
  },
}));

// Mock the schema validation
mock.module("@/routes/product/schema", () => ({
  createProductSchema: mock((data) => data),
  updateProductSchema: mock((data) => data),
}));

const mockDb = require("@/db").db;
const mockSchemas = require("@/routes/product/schema");

describe("Product API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/product", product);
    mockDb.query.product.findMany.mockReset();
    mockDb.query.product.findFirst.mockReset();
    mockDb.query.manufacturer.findFirst.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockSchemas.createProductSchema.mockReset();
    mockSchemas.updateProductSchema.mockReset();
  });

  describe("GET /api/product", () => {
    test("should return all products with manufacturer data", async () => {
      mockDb.query.product.findMany.mockResolvedValueOnce(mockProducts);

      const res = await app.request("/api/product", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockProducts);

      // Verify each product has manufacturer data
      json.forEach((product: any) => {
        expect(product.manufacturer).toBeDefined();
        expect(product.manufacturerId).toBeDefined();
      });
    });

    test("should return empty array if no products", async () => {
      mockDb.query.product.findMany.mockResolvedValueOnce([]);

      const res = await app.request("/api/product", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });
  });

  describe("GET /api/product/:id", () => {
    test("should return a product if exists", async () => {
      const testProduct = mockProducts[0];
      mockDb.query.product.findFirst.mockResolvedValueOnce(testProduct);

      const res = await app.request("/api/product/1", {
        method: "GET",
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(testProduct);
      expect(json.manufacturer).toBeDefined();
    });

    test("should return 404 if product doesn't exist", async () => {
      mockDb.query.product.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/product/999", {
        method: "GET",
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Product not found");
    });
  });

  describe("POST /api/product", () => {
    test("should create new products with valid data and existing manufacturer", async () => {
      const newProducts = {
        products: [
          {
            name: "papilla",
            description: "papilla rica",
            price: 1.18,
            storageCondition: "refrigerado",
            manufacturerId: "1",
          },
        ],
      };

      const createdProduct = {
        id: 3,
        name: "New Product",
        description: "New Description",
        price: 149.99,
        manufacturerId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock schema validation to return the input data unchanged
      mockSchemas.createProductSchema.mockReturnValueOnce(newProducts);

      // Mock manufacturer existence check to return true
      mockDb.query.manufacturer.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Existing Manufacturer",
      });

      // Mock product insertion to return the created product
      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => [createdProduct]),
        })),
      });

      const res = await app.request("/api/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProducts),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as any[];
      expect(json[0].id).toBe(3);
      expect(json[0].name).toBe("New Product");
      expect(json[0].manufacturerId).toBe(1);
    });

    test("should return 400 if manufacturer doesn't exist", async () => {
      const newProducts = {
        products: [
          {
            name: "papilla",
            description: "papilla rica",
            price: 1.18,
            storageCondition: "refrigerado",
            manufacturerId: "999",
          },
        ],
      };

      mockSchemas.createProductSchema.mockReturnValueOnce(newProducts);

      mockDb.query.manufacturer.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProducts),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Manufacturer does not exist");
    });

    test("should return 400 if missing manufacturerId", async () => {
      const invalidProducts = {
        products: [
          {
            name: "New Product",
            description: "New Description",
            price: 149.99,
            // Missing manufacturerId
          },
        ],
      };

      // Mock schema validation to return the input data unchanged
      mockSchemas.createProductSchema.mockReturnValueOnce(invalidProducts);

      const res = await app.request("/api/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidProducts),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Manufacturer id is required");
    });
  });

  describe("PUT /api/product/:id", () => {
    test("should update product with valid data and existing manufacturer", async () => {
      const updateData = {
        name: "Updated Product Name",
        price: 299.99,
        manufacturerId: 2,
      };

      const updatedProduct = {
        id: 1,
        name: "Updated Product Name",
        description: "Description One",
        price: 299.99,
        manufacturerId: 2,
        updatedAt: new Date(),
      };

      // Mock schema validation
      mockSchemas.updateProductSchema.mockReturnValueOnce(updateData);

      // Mock manufacturer existence check
      mockDb.query.manufacturer.findFirst.mockResolvedValueOnce({
        id: 2,
        name: "Manufacturer Two",
      });

      // Mock update operation
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [updatedProduct]),
          })),
        })),
      });

      const res = await app.request("/api/product/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        name: string;
        price: number;
        manufacturerId: number;
        updatedAt: Date;
      };
      expect(json.name).toBe("Updated Product Name");
      expect(json.price).toBe(299.99);
      expect(json.manufacturerId).toBe(2);
      expect(json.updatedAt).toBeDefined();
    });

    test("should return 404 if product doesn't exist", async () => {
      const updateData = {
        name: "Updated Name",
        manufacturerId: 1,
      };

      // Mock schema validation
      mockSchemas.updateProductSchema.mockReturnValueOnce(updateData);

      // Mock manufacturer existence check
      mockDb.query.manufacturer.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Existing Manufacturer",
      });

      // Mock update returning empty array to simulate product not found
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => []),
          })),
        })),
      });

      const res = await app.request("/api/product/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Product not found");
    });
  });

  describe("DELETE /api/product/:id", () => {
    test("should delete product successfully", async () => {
      const productId = 1;
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => [{ id: productId, name: "Test Product" }]),
        })),
      });

      const res = await app.request(`/api/product/${productId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ message: "Product deleted successfully" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    test("should return 404 if product doesn't exist", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      });

      const res = await app.request("/api/product/999", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Product not found");
    });
  });
});
