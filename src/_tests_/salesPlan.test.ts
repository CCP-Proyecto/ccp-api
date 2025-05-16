import { beforeEach, describe, expect, mock, test } from "bun:test";
import { salesPlan } from "@/routes/salesPlan";
import { Hono } from "hono";

// Mock the db module and all relevant methods
mock.module("@/db", () => ({
  db: {
    query: {
      salesPlan: {
        findMany: mock(() => []),
      },
      salesperson: {
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

describe("SalesPlan API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/salesPlan", salesPlan);

    // Reset all mocks
    Object.values(mockDb.query.salesPlan).forEach((fn: any) => fn.mockReset());
    Object.values(mockDb.query.salesperson).forEach((fn: any) => fn.mockReset());
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe("GET /api/salesPlan", () => {
    test("should return all sales plans", async () => {
      const plans = [{ id: 1, name: "Plan 1" }];
      mockDb.query.salesPlan.findMany.mockResolvedValueOnce(plans);

      const res = await app.request("/api/salesPlan", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(plans);
    });

    test("should return sales plans for a salesperson", async () => {
      const plans = [{ id: 2, name: "Plan 2", salespersonId: "sp-1" }];
      mockDb.query.salesPlan.findMany.mockResolvedValueOnce(plans);

      const res = await app.request("/api/salesPlan?salespersonId=sp-1", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(plans);
    });
  });

  describe("POST /api/salesPlan", () => {
    test("should create a new sales plan with valid data", async () => {
      const newPlan = {
        name: "Q2 Plan",
        description: "Quarter 2 sales plan",
        period: "quarterly",
        salespersonId: "sp-1"
      };

      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({
        id: "sp-1",
        name: "John Doe"
      });

      mockDb.insert.mockImplementationOnce(() => ({
        values: () => ({
          returning: () => [{
            id: 1,
            name: "Q2 Plan",
            description: "Quarter 2 sales plan",
            period: "quarterly",
            salespersonId: "sp-1",
          }]
        })
      }));

      const res = await app.request("/api/salesPlan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
      });

      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json).toEqual({
        id: 1,
        name: "Q2 Plan",
        description: "Quarter 2 sales plan",
        period: "quarterly",
        salespersonId: "sp-1"
      });
    });

    test("should return 400 if salesperson does not exist", async () => {
      const newPlan = {
        name: "Q2 Plan",
        description: "Quarter 2 sales plan",
        period: "quarterly", // <-- valid value
        salespersonId: "sp-1"
      };

      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/salesPlan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toBe("Salesperson does not exist");
    });

    test("should return 400 for missing required fields", async () => {
      const invalidPlan = {
        name: "Q2 Plan",
        // Missing description, period, and salespersonId
      };

      const res = await app.request("/api/salesPlan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPlan),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid request body");
    });

    test("should return 400 for invalid field types", async () => {
      const invalidPlan = {
        name: "Q2 Plan",
        description: 12345, // Should be string
        period: "Q2",
        salespersonId: "sp-1"
      };

      const res = await app.request("/api/salesPlan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPlan),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid request body");
    });
  });

  describe("PATCH /api/salesPlan/:id", () => {
    test("should update a sales plan", async () => {
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [{ id: 1, name: "Updated Plan" }]),
          })),
        })),
      });

      const res = await app.request("/api/salesPlan/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Plan" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Updated Plan");
    });

    test("should return 404 if sales plan not found", async () => {
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => []),
          })),
        })),
      });

      const res = await app.request("/api/salesPlan/999", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Doesn't matter" }),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("SalesPlan not found");
    });

    test("should return 400 if updating to non-existent salesperson", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/salesPlan/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salespersonId: "sp-2" }),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Salesperson does not exist");
    });
  });

  describe("DELETE /api/salesPlan/:id", () => {
    test("should delete a sales plan", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => [{ id: 1 }]),
        })),
      });

      const res = await app.request("/api/salesPlan/1", { method: "DELETE" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toContain("deleted");
    });

    test("should return 404 if sales plan not found", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      });

      const res = await app.request("/api/salesPlan/999", { method: "DELETE" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("SalesPlan not found");
    });
  });
});
