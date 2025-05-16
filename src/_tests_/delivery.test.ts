import { beforeEach, describe, expect, mock, test } from "bun:test";
import { delivery } from "@/routes/delivery";
import { Hono } from "hono";

// Mock the db module and all relevant methods
mock.module("@/db", () => ({
  db: {
    query: {
      delivery: {
        findMany: mock(() => []),
        findFirst: mock(() => null),
      },
      order: {
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

const mockDb = require("@/db").db;

describe("Delivery API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/delivery", delivery);

    // Reset all mocks
    Object.values(mockDb.query.delivery).forEach((fn: any) => fn.mockReset());
    Object.values(mockDb.query.order).forEach((fn: any) => fn.mockReset());
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe("GET /api/delivery", () => {
    test("should return all deliveries", async () => {
      const deliveries = [{ id: 1, orderId: 1 }];
      mockDb.query.delivery.findMany.mockResolvedValueOnce(deliveries);

      const res = await app.request("/api/delivery", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(deliveries);
    });
  });

  describe("GET /api/delivery/:id", () => {
    test("should return a delivery if exists", async () => {
      const deliveryObj = { id: 1, orderId: 1 };
      mockDb.query.delivery.findFirst.mockResolvedValueOnce(deliveryObj);

      const res = await app.request("/api/delivery/1", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(deliveryObj);
    });

    test("should return 404 if delivery not found", async () => {
      mockDb.query.delivery.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/delivery/999", { method: "GET" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Delivery not found");
    });
  });

  describe("POST /api/delivery", () => {
    test("should create a new delivery with valid data", async () => {
      const newDelivery = {
        orderId: 1,
        estimatedDeliveryDate: "2024-06-01",
        trackingNumber: "TRACK123",
        notes: "Leave at door",
        address: "123 Main St",
      };
      mockDb.query.order.findFirst.mockResolvedValueOnce({ id: 1 }); // order exists
      mockDb.query.delivery.findFirst.mockResolvedValueOnce(null); // no existing delivery
      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => [{ ...newDelivery, id: 1 }]),
        })),
      });

      const res = await app.request("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDelivery),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.orderId).toBe(1);
      expect(json.id).toBe(1);
    });

    test("should return 400 if order does not exist", async () => {
      const newDelivery = {
        orderId: 1,
        estimatedDeliveryDate: "2024-06-01",
        trackingNumber: "TRACK123",
        notes: "Leave at door",
        address: "123 Main St",
      };
      mockDb.query.order.findFirst.mockResolvedValueOnce(null); // order does not exist

      const res = await app.request("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDelivery),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Order does not exist");
    });

    test("should return 400 if delivery already exists for order", async () => {
      const newDelivery = {
        orderId: 1,
        estimatedDeliveryDate: "2024-06-01",
        trackingNumber: "TRACK123",
        notes: "Leave at door",
        address: "123 Main St",
      };
      mockDb.query.order.findFirst.mockResolvedValueOnce({ id: 1 }); // order exists
      mockDb.query.delivery.findFirst.mockResolvedValueOnce({
        id: 2,
        orderId: 1,
      }); // delivery exists

      const res = await app.request("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDelivery),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Delivery already exists");
    });
  });

  describe("PATCH /api/delivery/:id", () => {
    test("should update a delivery", async () => {
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [{ id: 1, status: "delivered" }]),
          })),
        })),
      });

      const res = await app.request("/api/delivery/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("delivered");
    });

    test("should return 404 if delivery not found", async () => {
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => []),
          })),
        })),
      });

      const res = await app.request("/api/delivery/999", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Delivery not found");
    });
  });

  describe("DELETE /api/delivery/:id", () => {
    test("should delete a delivery", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => [{ id: 1 }]),
        })),
      });

      const res = await app.request("/api/delivery/1", { method: "DELETE" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toContain("deleted");
    });

    test("should return 404 if delivery not found", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      });

      const res = await app.request("/api/delivery/999", { method: "DELETE" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Delivery not found");
    });
  });
});
