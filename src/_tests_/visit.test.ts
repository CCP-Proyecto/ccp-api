import { beforeEach, describe, expect, mock, test } from "bun:test";
import { visit } from "@/routes/visit";
import { Hono } from "hono";

// Mock the db module and all relevant methods
mock.module("@/db", () => ({
  db: {
    select: mock(() => ({
      from: mock(() => []),
    })),
    query: {
      visit: {
        findFirst: mock(() => null),
      },
      customer: {
        findFirst: mock(() => null),
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

describe("Visit API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/visit", visit);

    // Reset all mocks
    mockDb.select.mockReset();
    Object.values(mockDb.query.visit).forEach((fn: any) => fn.mockReset());
    Object.values(mockDb.query.customer).forEach((fn: any) => fn.mockReset());
    Object.values(mockDb.query.salesperson).forEach((fn: any) =>
      fn.mockReset(),
    );
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe("GET /api/visit", () => {
    test("should return all visits", async () => {
      const visits = [
        {
          id: 1,
          visitDate: "2024-06-01",
          comments: "Test",
          customerId: "1",
          salespersonId: "2",
        },
      ];
      mockDb.select.mockReturnValueOnce({
        from: mock(() => visits),
      });

      const res = await app.request("/api/visit", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(visits);
    });
  });

  describe("GET /api/visit/:id", () => {
    test("should return a visit if exists", async () => {
      const visitObj = {
        id: 1,
        visitDate: "2024-06-01",
        comments: "Test",
        customerId: "1",
        salespersonId: "2",
      };
      mockDb.query.visit.findFirst.mockResolvedValueOnce(visitObj);

      const res = await app.request("/api/visit/1", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(visitObj);
    });

    test("should return 404 if visit not found", async () => {
      mockDb.query.visit.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/visit/999", { method: "GET" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Visit not found");
    });
  });

  describe("POST /api/visit", () => {
    const validVisit = {
      visitDate: "2024-06-01",
      comments: "Initial visit",
      customerId: "1",
      salespersonId: "2",
    };

    test("should create a new visit with valid data", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce({ id: "1" });
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({ id: "2" });
      mockDb.insert.mockImplementationOnce(() => ({
        values: () => ({
          returning: () => [
            {
              id: 1,
              ...validVisit,
              visitDate: new Date(validVisit.visitDate).toISOString(),
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            },
          ],
        }),
      }));

      const res = await app.request("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validVisit),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toMatchObject({
        id: 1,
        comments: "Initial visit",
        customerId: "1",
        salespersonId: "2",
        visitDate: expect.any(String),
      });
    });

    test("should return 400 if customer does not exist", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validVisit),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Customer does not exist");
    });

    test("should return 400 if salesperson does not exist", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce({ id: "1" });
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validVisit),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Salesperson does not exist");
    });

    test("should return 400 for missing required fields", async () => {
      const invalidVisit = {
        comments: "Missing fields",
      };

      const res = await app.request("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidVisit),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid request body");
    });
  });

  describe("PUT /api/visit/:id", () => {
    test("should update a visit", async () => {
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [{ id: 1, comments: "Updated" }]),
          })),
        })),
      });

      const res = await app.request("/api/visit/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: "Updated" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json() as {comments: string};
      expect(json.comments).toBe("Updated");
    });

    test("should return 404 if visit not found", async () => {
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => []),
          })),
        })),
      });

      const res = await app.request("/api/visit/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: "Doesn't matter" }),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Visit not found");
    });

    test("should return 400 if updating to non-existent customer", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/visit/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: "999" }),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Customer does not exist");
    });

    test("should return 400 if updating to non-existent salesperson", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce({ id: "1" });
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/visit/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salespersonId: "999" }),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Salesperson does not exist");
    });
  });

  describe("GET /api/visit/salesperson/:salespersonId", () => {
    test("should return visits for a salesperson", async () => {
      const visits = [
        { id: 1, salespersonId: 2, customerId: 1, visitDate: "2024-06-01" },
      ];
      mockDb.query.visit.findMany = mock(() => visits);

      const res = await app.request("/api/visit/salesperson/2", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(visits);
    });

    test("should return 400 for invalid salesperson ID", async () => {
      const res = await app.request("/api/visit/salesperson/abc", { method: "GET" });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid salesperson ID");
    });
  });

  describe("GET /api/visit/salesperson/:salespersonId/date/:date", () => {
    test("should return visits for a salesperson on a specific date", async () => {
      const visits = [
        { id: 1, salespersonId: 2, customerId: 1, visitDate: "2024-06-01T10:00:00.000Z" },
      ];
      mockDb.query.visit.findMany = mock(() => visits);

      const res = await app.request("/api/visit/salesperson/2/date/2024-06-01", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(visits);
    });

    test("should return 400 for invalid salesperson ID", async () => {
      const res = await app.request("/api/visit/salesperson/abc/date/2024-06-01", { method: "GET" });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid salesperson ID");
    });

    test("should return 400 for invalid date format", async () => {
      const res = await app.request("/api/visit/salesperson/2/date/not-a-date", { method: "GET" });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid date format");
    });
  });


  describe("DELETE /api/visit/:id", () => {
    test("should delete a visit", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => [{ id: 1 }]),
        })),
      });

      const res = await app.request("/api/visit/1", { method: "DELETE" });
      expect(res.status).toBe(200);
      const json = await res.json() as {message: string};
      expect(json.message).toContain("deleted");
    });

    test("should return 404 if visit not found", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      });

      const res = await app.request("/api/visit/999", { method: "DELETE" });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Visit not found");
    });
  });
});
