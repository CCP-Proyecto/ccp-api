import { beforeEach, describe, expect, mock, test } from "bun:test";
import { inventory } from "@/routes/inventory";
import { Hono } from "hono";

// Mock the db module and its methods
mock.module("@/db", () => ({
  db: {
    query: {
      inventory: {
        findMany: mock(() => []),
        findFirst: mock(() => null),
      },
      warehouse: {
        findMany: mock(() => []),
        findFirst: mock(() => null),
      },
      product: {
        findMany: mock(() => []),
        findFirst: mock(() => null),
      },
      inventoryProduct: {
        findMany: mock(() => []),
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
    transaction: mock(async (fn) =>
      fn({
        delete: mock(() => ({
          where: mock(() => ({})),
        })),
        query: {
          inventory: {
            findFirst: mock(() => ({
              id: 1,
              quantity: 10,
              warehouseId: 1,
              warehouse: { id: 1, name: "Warehouse 1" },
              products: [
                {
                  product: { id: 1, name: "Product 1" },
                },
              ],
            })),
          },
        },
        insert: mock(() => ({
          values: mock(() => ({})),
        })),
      }),
    ),
  },
}));

const mockDb = require("@/db").db;

describe("Inventory API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/inventory", inventory);

    // Reset all mocks
    Object.values(mockDb.query.inventory).forEach((fn) => fn.mockReset());
    Object.values(mockDb.query.warehouse).forEach((fn) => fn.mockReset());
    Object.values(mockDb.query.product).forEach((fn) => fn.mockReset());
    Object.values(mockDb.query.inventoryProduct).forEach((fn) =>
      fn.mockReset(),
    );
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockDb.transaction.mockReset();
  });

  describe("GET /api/inventory", () => {
    test("should return all inventories", async () => {
      mockDb.query.inventory.findMany.mockResolvedValueOnce([
        {
          id: 1,
          quantity: 10,
          warehouse: { id: 1, name: "Warehouse 1" },
          products: [
            { product: { id: 1, name: "Product 1" } },
            { product: { id: 2, name: "Product 2" } },
          ],
        },
      ]);

      const res = await app.request("/api/inventory", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json[0].warehouse.name).toBe("Warehouse 1");
      expect(json[0].products.length).toBe(2);
    });

    test("should return empty array if no inventories", async () => {
      mockDb.query.inventory.findMany.mockResolvedValueOnce([]);
      const res = await app.request("/api/inventory", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });
  });

  describe("GET /api/inventory/:id", () => {
    test("should return inventory by id", async () => {
      const inventoryObj = {
        id: 1,
        quantity: 10,
        warehouse: { id: 1, name: "Warehouse 1" },
        products: [{ product: { id: 1, name: "Product 1" } }],
      };
      mockDb.query.inventory.findFirst.mockResolvedValueOnce(inventoryObj);

      const res = await app.request("/api/inventory/1", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(1);
      expect(json.products[0].name).toBe("Product 1");
    });

    test("should return 404 if inventory not found", async () => {
      mockDb.query.inventory.findFirst.mockResolvedValueOnce(null);
      const res = await app.request("/api/inventory/999", { method: "GET" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Inventory not found");
    });
  });

  describe("POST /api/inventory", () => {
    test("should create new inventories with valid data", async () => {
      const body = {
        inventories: [{ quantity: 10, productId: 1, warehouseId: 1 }],
      };
      mockDb.query.warehouse.findMany.mockResolvedValueOnce([{ id: 1 }]);
      mockDb.query.product.findMany.mockResolvedValueOnce([
        { id: 1, name: "Product 1" },
      ]);
      mockDb.transaction.mockImplementationOnce(async (fn) =>
        fn({
          insert: (...args: any[]) => ({
            values: (...args: any[]) => ({
              returning: () => [{ id: 1, quantity: 10, warehouseId: 1 }],
            }),
          }),
          delete: (...args: any[]) => ({
            where: (...args: any[]) => ({}),
          }),
          query: {
            inventory: {
              findFirst: () => ({
                id: 1,
                quantity: 10,
                warehouse: { id: 1, name: "Warehouse 1" },
                products: [{ product: { id: 1, name: "Product 1" } }],
              }),
            },
          },
        }),
      );

      const res = await app.request("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json[0].products[0].product.name).toBe("Product 1"); // Fixed assertion
    });

    test("should return 400 if inventories array missing", async () => {
      const res = await app.request("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid request body");
    });

    test("should return 400 if warehouse does not exist", async () => {
      const body = {
        inventories: [{ quantity: 10, productId: 1, warehouseId: 1 }],
      };
      mockDb.query.warehouse.findMany.mockResolvedValueOnce([]);
      const res = await app.request("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("One or more warehouses do not exist");
    });

    test("should return 400 if product does not exist", async () => {
      const body = {
        inventories: [{ quantity: 10, productId: 1, warehouseId: 1 }],
      };
      mockDb.query.warehouse.findMany.mockResolvedValueOnce([{ id: 1 }]);
      mockDb.query.product.findMany.mockResolvedValueOnce([]);
      const res = await app.request("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("One or more products do not exist");
    });
  });

  describe("PUT /api/inventory/:id", () => {
    test("should update inventory with valid data", async () => {
      mockDb.query.inventory.findFirst.mockResolvedValueOnce({ id: 1 });
      mockDb.query.product.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Product 1",
      });
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [{ id: 1, quantity: 20, warehouseId: 1 }]),
          })),
        })),
      });
      mockDb.query.inventory.findFirst.mockResolvedValueOnce({
        id: 1,
        quantity: 20,
        warehouse: { id: 1, name: "Warehouse 1" },
        products: [{ product: { id: 1, name: "Product 1" } }],
      });

      const res = await app.request("/api/inventory/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 20, productId: 1 }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.quantity).toBe(20);
      expect(json.products[0].product.name).toBe("Product 1"); // Fixed assertion
    });

    test("should return 400 for invalid inventory id", async () => {
      const res = await app.request("/api/inventory/abc", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 20 }),
      });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid inventory ID");
    });

    test("should return 404 if inventory not found", async () => {
      mockDb.query.inventory.findFirst.mockResolvedValueOnce(null);
      const res = await app.request("/api/inventory/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 20 }),
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Inventory not found");
    });

    test("should return 400 if product does not exist", async () => {
      mockDb.query.inventory.findFirst.mockResolvedValueOnce({ id: 1 });
      mockDb.query.product.findFirst.mockResolvedValueOnce(null);
      const res = await app.request("/api/inventory/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: 999 }),
      });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Product does not exist");
    });
  });

  describe("DELETE /api/inventory/:id", () => {
    test("should delete inventory successfully", async () => {
      mockDb.query.inventory.findFirst.mockResolvedValueOnce({ id: 1 });
      mockDb.transaction.mockImplementationOnce(async (fn) =>
        fn({
          delete: mock(() => ({
            where: mock(() => ({})),
          })),
        }),
      );
      const res = await app.request("/api/inventory/1", { method: "DELETE" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ message: "Inventory deleted successfully" });
    });

    test("should return 404 if inventory does not exist", async () => {
      mockDb.query.inventory.findFirst.mockResolvedValueOnce(null);
      const res = await app.request("/api/inventory/999", { method: "DELETE" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Inventory not found");
    });

    test("should return 400 for invalid inventory id", async () => {
      const res = await app.request("/api/inventory/abc", { method: "DELETE" });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid inventory ID");
    });
  });

  describe("GET /api/inventory/product/:productId/warehouses", () => {
    test("should return warehouses for a product", async () => {
      mockDb.query.product.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Product 1",
      });
      mockDb.query.inventoryProduct.findMany.mockResolvedValueOnce([
        {
          inventory: {
            warehouse: { id: 1, name: "Warehouse 1" },
            quantity: 5,
          },
        },
        {
          inventory: {
            warehouse: { id: 2, name: "Warehouse 2" },
            quantity: 10,
          },
        },
      ]);
      const res = await app.request("/api/inventory/product/1/warehouses", {
        method: "GET",
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.length).toBe(2);
      expect(json[0].name).toBeDefined();
    });

    test("should return 400 for invalid product id", async () => {
      const res = await app.request("/api/inventory/product/abc/warehouses", {
        method: "GET",
      });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid product ID");
    });

    test("should return 404 if product not found", async () => {
      mockDb.query.product.findFirst.mockResolvedValueOnce(null);
      const res = await app.request("/api/inventory/product/999/warehouses", {
        method: "GET",
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Product not found");
    });

    test("should return empty array if no warehouses", async () => {
      mockDb.query.product.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Product 1",
      });
      mockDb.query.inventoryProduct.findMany.mockResolvedValueOnce([]);
      const res = await app.request("/api/inventory/product/1/warehouses", {
        method: "GET",
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });
  });

  describe("GET /api/inventory/product/:productId/total-quantity", () => {
    test("should return total quantity for a product", async () => {
      mockDb.query.product.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Product 1",
      });
      mockDb.query.inventoryProduct.findMany.mockResolvedValueOnce([
        { inventory: { quantity: 5 } },
        { inventory: { quantity: 10 } },
      ]);
      const res = await app.request("/api/inventory/product/1/total-quantity", {
        method: "GET",
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.totalQuantity).toBe(15);
      expect(json.productId).toBe(1);
    });

    test("should return 400 for invalid product id", async () => {
      const res = await app.request(
        "/api/inventory/product/abc/total-quantity",
        { method: "GET" },
      );
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid product ID");
    });

    test("should return 404 if product not found", async () => {
      mockDb.query.product.findFirst.mockResolvedValueOnce(null);
      const res = await app.request(
        "/api/inventory/product/999/total-quantity",
        { method: "GET" },
      );
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Product not found");
    });
  });

  describe("GET /api/inventory/product/:productId/warehouse/:warehouseId", () => {
    test("should return inventory for product in warehouse", async () => {
      mockDb.query.product.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Product 1",
      });
      mockDb.query.warehouse.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Warehouse 1",
      });
      mockDb.query.inventory.findFirst.mockResolvedValueOnce({
        id: 1,
        quantity: 10,
        warehouse: { id: 1, name: "Warehouse 1" },
        products: [{ product: { id: 1, name: "Product 1" } }],
      });
      const res = await app.request("/api/inventory/product/1/warehouse/1", {
        method: "GET",
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.inventoryId).toBe(1);
      expect(json.product.name).toBe("Product 1");
      expect(json.warehouse.name).toBe("Warehouse 1");
    });

    test("should return 400 for invalid product id", async () => {
      const res = await app.request("/api/inventory/product/abc/warehouse/1", {
        method: "GET",
      });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid product ID");
    });

    test("should return 400 for invalid warehouse id", async () => {
      const res = await app.request("/api/inventory/product/1/warehouse/abc", {
        method: "GET",
      });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid warehouse ID");
    });

    test("should return 404 if product not found", async () => {
      mockDb.query.product.findFirst.mockResolvedValueOnce(null);
      const res = await app.request("/api/inventory/product/999/warehouse/1", {
        method: "GET",
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Product not found");
    });

    test("should return 404 if warehouse not found", async () => {
      mockDb.query.product.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Product 1",
      });
      mockDb.query.warehouse.findFirst.mockResolvedValueOnce(null);
      const res = await app.request("/api/inventory/product/1/warehouse/999", {
        method: "GET",
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Warehouse not found");
    });

    test("should return 404 if product not found in warehouse", async () => {
      mockDb.query.product.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Product 1",
      });
      mockDb.query.warehouse.findFirst.mockResolvedValueOnce({
        id: 1,
        name: "Warehouse 1",
      });
      mockDb.query.inventory.findFirst.mockResolvedValueOnce({
        id: 1,
        quantity: 10,
        warehouse: { id: 1, name: "Warehouse 1" },
        products: [],
      });
      const res = await app.request("/api/inventory/product/1/warehouse/1", {
        method: "GET",
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Product not found in specified warehouse");
    });
  });
});
