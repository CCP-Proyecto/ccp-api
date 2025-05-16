import { beforeEach, describe, expect, mock, test } from "bun:test";
import { report } from "@/routes/report";
import { Hono } from "hono";

// Mock the db module and all relevant methods
mock.module("@/db", () => ({
  db: {
    query: {
      salesperson: {
        findFirst: mock(() => null),
      },
      order: {
        findMany: mock(() => []),
      },
    },
  },
}));

const mockDb = require("@/db").db;

describe("Report API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/report", report);

    // Reset all mocks
    Object.values(mockDb.query.salesperson).forEach((fn: any) => fn.mockReset());
    Object.values(mockDb.query.order).forEach((fn: any) => fn.mockReset());
  });

  describe("GET /api/report", () => {
    const baseQuery = {
      salespersonId: "sp-1",
      periodType: "monthly",
      periodStart: "2024-01-01T00:00:00.000Z",
    };

    test("should return report data for valid query", async () => {
      const salesperson = { id: "sp-1", name: "Sales Person" };
      const orders = [
        { id: 1, total: 100, createdAt: new Date("2024-01-10"), customer: {}, orderProducts: [] },
        { id: 2, total: 200, createdAt: new Date("2024-01-20"), customer: {}, orderProducts: [] },
      ];
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(salesperson);
      mockDb.query.order.findMany.mockResolvedValueOnce(orders);

      const params = new URLSearchParams(baseQuery).toString();
      const res = await app.request(`/api/report?${params}`, { method: "GET" });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.salesperson).toEqual(salesperson);
      expect(json.orders.length).toBe(2);
      expect(json.summary.totalOrders).toBe(2);
      expect(json.summary.totalRevenue).toBe(300);
      expect(json.summary.averageOrderValue).toBe(150);
      expect(json.period.type).toBe("monthly");
    });

    test("should return 400 if missing required query params", async () => {
      const res = await app.request("/api/report", { method: "GET" });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Missing required query parameters");
    });

    test("should return 400 if periodType is invalid", async () => {
      const params = new URLSearchParams({
        ...baseQuery,
        periodType: "invalid",
      }).toString();
      const res = await app.request(`/api/report?${params}`, { method: "GET" });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid periodType");
    });

    test("should return 404 if salesperson not found", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);
      const params = new URLSearchParams(baseQuery).toString();
      const res = await app.request(`/api/report?${params}`, { method: "GET" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Salesperson not found");
    });

    test("should return correct summary for no orders", async () => {
      const salesperson = { id: "sp-1", name: "Sales Person" };
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(salesperson);
      mockDb.query.order.findMany.mockResolvedValueOnce([]);

      const params = new URLSearchParams(baseQuery).toString();
      const res = await app.request(`/api/report?${params}`, { method: "GET" });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.summary.totalOrders).toBe(0);
      expect(json.summary.totalRevenue).toBe(0);
      expect(json.summary.averageOrderValue).toBe(0);
    });
  });
});
