import { beforeEach, describe, expect, mock, test } from "bun:test";
import { statement } from "@/routes/statement";
import { Hono } from "hono";

// Mock the db module and all relevant methods
mock.module("@/db", () => ({
  db: {
    query: {
      statement: {
        findMany: mock(() => []),
      },
      salesperson: {
        findFirst: mock(() => null),
      },
      customer: {
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

describe("Statement API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/statement", statement);

    // Reset all mocks
    Object.values(mockDb.query.statement).forEach((fn: any) => fn.mockReset());
    Object.values(mockDb.query.salesperson).forEach((fn: any) => fn.mockReset());
    Object.values(mockDb.query.customer).forEach((fn: any) => fn.mockReset());
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe("GET /api/statement", () => {
    test("should return statements for a salesperson", async () => {
      const statements = [
        { id: 1, description: "desc", date: "2024-06-01", salespersonId: "sp-1", customerId: "c-1" },
      ];
      mockDb.query.statement.findMany.mockResolvedValueOnce(statements);

      const res = await app.request("/api/statement?salespersonId=sp-1", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(statements);
    });
  });

  describe("POST /api/statement", () => {
    const validStatement = {
      description: "Test statement",
      date: "2024-06-01",
      salespersonId: "sp-1",
      customerId: "c-1",
    };

    test("should create a new statement with valid data", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({ id: "sp-1" });
      mockDb.query.customer.findFirst.mockResolvedValueOnce({ id: "c-1" });
      mockDb.insert.mockImplementationOnce(() => ({
        values: () => ({
          returning: () => [{
            id: 1,
            description: "Test statement",
            Date: new Date("2024-06-01"),
            salespersonId: "sp-1",
            customerId: "c-1",
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }],
        }),
      }));

      const res = await app.request("/api/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validStatement),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toMatchObject({
        id: 1,
        description: "Test statement",
        salespersonId: "sp-1",
        customerId: "c-1",
        Date: expect.any(String),
      });
    });

    test("should return 400 if salesperson does not exist", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validStatement),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Salesperson does not exist");
    });

    test("should return 400 if customer does not exist", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({ id: "sp-1" });
      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validStatement),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Customer does not exist");
    });

    test("should return 400 for missing required fields", async () => {
      const invalidStatement = {
        description: "Missing fields",
      };

      const res = await app.request("/api/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidStatement),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid request body");
    });
  });

  describe("PATCH /api/statement/:id", () => {
    test("should update a statement", async () => {
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [{ id: 1, description: "Updated" }]),
          })),
        })),
      });

      const res = await app.request("/api/statement/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Updated" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.description).toBe("Updated");
    });

    test("should return 404 if statement not found", async () => {
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => []),
          })),
        })),
      });

      const res = await app.request("/api/statement/999", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Doesn't matter" }),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Statement not found");
    });

    test("should return 400 if updating to non-existent salesperson", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/statement/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salespersonId: "sp-2" }),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Salesperson does not exist");
    });

    test("should return 400 if updating to non-existent customer", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({ id: "sp-1" });
      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/statement/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: "c-2" }),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Customer does not exist");
    });
  });

  describe("DELETE /api/statement/:id", () => {
    test("should delete a statement", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => [{ id: 1 }]),
        })),
      });

      const res = await app.request("/api/statement/1", { method: "DELETE" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toContain("deleted");
    });

    test("should return 404 if statement not found", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      });

      const res = await app.request("/api/statement/999", { method: "DELETE" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Statement not found");
    });
  });
});
