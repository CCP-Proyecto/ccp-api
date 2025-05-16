import { beforeEach, describe, expect, mock, test } from "bun:test";
import { order } from "@/routes/order";
import { Hono } from "hono";

// Mock the db module and all relevant methods
mock.module("@/db", () => ({
  db: {
    query: {
      order: {
        findMany: mock(() => []),
        findFirst: mock(() => null),
      },
      customer: {
        findFirst: mock(() => null),
      },
      salesperson: {
        findFirst: mock(() => null),
      },
      product: {
        findMany: mock(() => []),
      },
      inventory: {
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
        insert: (...args: any[]) => ({
          values: () => ({
            returning: () => [{ id: 1, customerId: 1, total: 100 }],
          }),
        }),
        insertMany: (...args: any[]) => ({}),
        update: (...args: any[]) => ({
          set: () => ({
            where: () => ({}),
          }),
        }),
      }),
    ),
    select: mock(() => ({
      from: mock(() => []),
    })),
  },
}));

const mockDb = require("@/db").db;

describe("Order API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/order", order);

    // Reset all mocks
    Object.values(mockDb.query.order).forEach((fn: any) => fn.mockReset());
    Object.values(mockDb.query.customer).forEach((fn: any) => fn.mockReset());
    Object.values(mockDb.query.salesperson).forEach((fn: any) =>
      fn.mockReset(),
    );
    Object.values(mockDb.query.product).forEach((fn: any) => fn.mockReset());
    Object.values(mockDb.query.inventory).forEach((fn: any) => fn.mockReset());
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockDb.transaction.mockReset();
    mockDb.select.mockReset();
  });

  describe("GET /api/order", () => {
    test("should return all orders", async () => {
      const orders = [{ id: 1, customerId: 1, total: 100 }];
      mockDb.query.order.findMany.mockResolvedValueOnce(orders);

      const res = await app.request("/api/order", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(orders);
    });
  });

  describe("GET /api/order/:id", () => {
    test("should return an order if exists", async () => {
      const order = { id: 1, customerId: 1, total: 100 };
      mockDb.query.order.findFirst.mockResolvedValueOnce(order);

      const res = await app.request("/api/order/1", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(order);
    });

    test("should return 404 if order not found", async () => {
      mockDb.query.order.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/order/999", { method: "GET" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Order not found");
    });
  });

  describe("POST /api/order", () => {
    test("should create a new order with valid data", async () => {
      const newOrder = {
        customerId: "1", // Should be string per schema
        products: [{ productId: 1, quantity: 2 }],
      };

      // Mock all required database calls
      mockDb.query.customer.findFirst.mockResolvedValueOnce({ id: 1 });
      mockDb.query.product.findMany.mockResolvedValueOnce([
        { id: 1, price: 50 },
      ]);
      mockDb.query.inventory.findMany.mockResolvedValueOnce([
        {
          id: 1,
          quantity: 10,
          inventoryProducts: [{ productId: 1 }], // Needed for inventory check
        },
      ]);

      mockDb.transaction.mockImplementationOnce(async (fn) =>
        fn({
          insert: () => ({
            values: () => ({
              returning: () => [{ id: 1, customerId: 1, total: 100 }],
            }),
          }),
          insertMany: () => ({}),
          update: () => ({
            set: () => ({
              where: () => ({}),
            }),
          }),
        }),
      );

      // Mock the full order response with relations
      mockDb.query.order.findFirst.mockResolvedValueOnce({
        id: 1,
        customerId: 1,
        total: 100,
        customer: { id: 1, name: "Test Customer" },
        orderProducts: [
          {
            productId: 1,
            quantity: 2,
            product: { id: 1, name: "Test Product", price: 50 },
          },
        ],
      });

      const res = await app.request("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(1);
      expect(json.customer).toBeDefined();
      expect(json.orderProducts[0].product).toBeDefined();
    });

    test("should return 400 if customer does not exist", async () => {
      const newOrder = {
        customerId: "1",
        products: [{ productId: 1, quantity: 2 }],
      };
      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      expect(res.status).toBe(400);
      const text = await res.text(); // Changed from json() to text()
      expect(text).toContain("Customer does not exist");
    });

    test("should return 400 if product does not exist", async () => {
      const newOrder = {
        customerId: "1",
        products: [{ productId: 1, quantity: 2 }],
      };
      mockDb.query.customer.findFirst.mockResolvedValueOnce({ id: 1 });
      mockDb.query.product.findMany.mockResolvedValueOnce([]);

      const res = await app.request("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      expect(res.status).toBe(400);
      const text = await res.text(); // Changed from json() to text()
      expect(text).toContain("One or more products not found");
    });

    test("should return 400 if insufficient inventory", async () => {
      const newOrder = {
        customerId: "1",
        products: [{ productId: 1, quantity: 20 }],
      };
      mockDb.query.customer.findFirst.mockResolvedValueOnce({ id: 1 });
      mockDb.query.product.findMany.mockResolvedValueOnce([
        { id: 1, price: 50 },
      ]);
      mockDb.query.inventory.findMany.mockResolvedValueOnce([
        {
          id: 1,
          quantity: 10,
          inventoryProducts: [{ productId: 1 }],
        },
      ]);

      const res = await app.request("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      expect(res.status).toBe(400);
      const text = await res.text(); // Changed from json() to text()
      expect(text).toContain("Not enough inventory");
    });
  });

  describe("PATCH /api/order/:id", () => {
    test("should update an order", async () => {
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [{ id: 1, total: 200 }]),
          })),
        })),
      });

      const res = await app.request("/api/order/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total: 200 }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.total).toBe(200);
    });

    test("should return 404 if order not found", async () => {
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => []),
          })),
        })),
      });

      const res = await app.request("/api/order/999", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total: 200 }),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Order not found");
    });
  });

  describe("GET /api/order/customer/:customerId", () => {
    test("should return orders for a customer", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce({ id: 1 });
      mockDb.query.order.findMany.mockResolvedValueOnce([
        { id: 1, customerId: 1 },
      ]);

      const res = await app.request("/api/order/customer/1", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
    });

    test("should return 404 if customer not found", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/order/customer/999", {
        method: "GET",
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Customer not found");
    });
  });

  describe("DELETE /api/order/:id", () => {
    test("should delete an order", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => [{ id: 1 }]),
        })),
      });

      const res = await app.request("/api/order/1", { method: "DELETE" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toContain("deleted");
    });

    test("should return 404 if order not found", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      });

      const res = await app.request("/api/order/999", { method: "DELETE" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Order not found");
    });
  });
});
