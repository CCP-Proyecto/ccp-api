import { beforeEach, describe, expect, mock, test } from "bun:test";
import { salesperson } from "@/routes/salesperson";
import { Hono } from "hono";

mock.module("@/db", () => ({
  db: {
    query: {
      salesperson: {
        findMany: mock(() => [
          { id: "1", name: "John Doe", email: "john@example.com" },
          { id: "2", name: "Jane Smith", email: "jane@example.com" },
        ]),
        findFirst: mock(() => null),
      },
    },
    select: mock(() => ({
      from: mock(() => [
        { id: "1", name: "John Doe", email: "john@example.com" },
        { id: "2", name: "Jane Smith", email: "jane@example.com" },
      ]),
    })),
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
mock.module("@/routes/salesperson/schema", () => ({
  createSalespersonSchema: mock((data) => data),
  updateSalespersonSchema: mock((data) => data),
}));

const mockDb = require("@/db").db;
const mockSchemas = require("@/routes/salesperson/schema");

describe("Salesperson API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/salesperson", salesperson);
    mockDb.select.mockReset();
    mockDb.query.salesperson.findMany.mockReset();
    mockDb.query.salesperson.findFirst.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockSchemas.createSalespersonSchema.mockReset();
    mockSchemas.updateSalespersonSchema.mockReset();
  });

  describe("GET /api/salesperson", () => {
    test("should return all salespeople", async () => {
      const salespeople = [
        { id: "1", name: "John Doe", email: "john@example.com" },
        { id: "2", name: "Jane Smith", email: "jane@example.com" },
      ];
      mockDb.select.mockReturnValueOnce({
        from: mock(() => salespeople),
      });

      const res = await app.request("/api/salesperson", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(salespeople);
    });

    test("should return empty array if no salespeople", async () => {
      mockDb.select.mockReturnValueOnce({
        from: mock(() => []),
      });

      const res = await app.request("/api/salesperson", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });
  });

  describe("GET /api/salesperson/:id", () => {
    test("should return a salesperson if exists", async () => {
      const testSalesperson = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
      };
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(testSalesperson);

      const res = await app.request("/api/salesperson/1", {
        method: "GET",
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(testSalesperson);
    });

    test("should return 404 if salesperson doesn't exist", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/salesperson/999", {
        method: "GET",
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Salesperson not found");
    });
  });

  describe("POST /api/salesperson", () => {
    test("should create a new salesperson with valid data", async () => {
      const newSalesperson = {
        id: "354342",
        idType: "CC",
        name: "New Person",
        phone:"4324234123",
        email: "new@example.com",
      };

      const createdSalesperson = {
        ...newSalesperson,
      };

      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);
      mockSchemas.createSalespersonSchema.mockReturnValueOnce(newSalesperson);
      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => [createdSalesperson]),
        })),
      });

      const res = await app.request("/api/salesperson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSalesperson),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(createdSalesperson);
    });

    test("should return 400 if salesperson already exists", async () => {
      const existingSalesperson = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
      };

      mockSchemas.createSalespersonSchema.mockReturnValueOnce(existingSalesperson);
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(existingSalesperson);

      const res = await app.request("/api/salesperson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existingSalesperson),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Salesperson already exists");
    });
  });

  describe("PUT /api/salesperson/:id", () => {
    test("should update salesperson with valid data", async () => {
      const updateData = {
        name: "Updated Name",
        email: "updated@example.com",
      };

      const mockUpdatedSalesperson = {
        id: "1",
        ...updateData,
        phone: "123-456-7890",
        updatedAt: new Date(),
      };

      mockSchemas.updateSalespersonSchema.mockReturnValueOnce(updateData);
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [mockUpdatedSalesperson]),
          })),
        })),
      });

      const res = await app.request("/api/salesperson/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(200);
      const json = await res.json() as  { name: string; email: string; id: string;  updatedAt: Date};
      expect(json.name).toBe("Updated Name");
      expect(json.email).toBe("updated@example.com");
      expect(json.id).toBe("1");
      expect(json.updatedAt).toBeDefined();
    });

    test("should return 404 if salesperson doesn't exist", async () => {
      const validUpdate = {
        name: "Updated Name",
      };

      mockSchemas.updateSalespersonSchema.mockReturnValueOnce(validUpdate);
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => []),
          })),
        })),
      });

      const res = await app.request("/api/salesperson/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdate),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Salesperson not found");
    });
  });

  describe("DELETE /api/salesperson/:id", () => {
    test("should delete salesperson successfully", async () => {
      const salespersonId = "1";
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => [{ id: salespersonId, name: "Test Person" }]),
        })),
      });

      const res = await app.request(`/api/salesperson/${salespersonId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ message: "Salesperson deleted successfully" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    test("should return 404 if salesperson doesn't exist", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      });

      const res = await app.request("/api/salesperson/999", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Salesperson not found");
    });
  });
});
