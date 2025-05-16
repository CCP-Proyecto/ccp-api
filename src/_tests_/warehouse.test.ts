import { beforeEach, describe, expect, mock, test } from "bun:test";
import { warehouse } from "@/routes/warehouse";
import { Hono } from "hono";

mock.module("@/db", () => ({
  db: {
    query: {
      warehouse: {
        findMany: mock(() => [
          { id: 1, name: "Warehouse One", location: "Location One" },
          { id: 2, name: "Warehouse Two", location: "Location Two" },
        ]),
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
mock.module("@/routes/warehouse/schema", () => ({
  createWarehouseSchema: mock((data) => data),
  updateWarehouseSchema: mock((data) => data),
}));

const mockDb = require("@/db").db;
const mockSchemas = require("@/routes/warehouse/schema");

describe("Warehouse API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/warehouse", warehouse);
    mockDb.query.warehouse.findMany.mockReset();
    mockDb.query.warehouse.findFirst.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockSchemas.createWarehouseSchema.mockReset();
    mockSchemas.updateWarehouseSchema.mockReset();
  });

  describe("GET /api/warehouse", () => {
    test("should return all warehouses", async () => {
      const warehouses = [
        { id: 1, name: "Warehouse One", location: "Location One" },
        { id: 2, name: "Warehouse Two", location: "Location Two" },
      ];
      mockDb.query.warehouse.findMany.mockResolvedValueOnce(warehouses);

      const res = await app.request("/api/warehouse", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(warehouses);
    });

    test("should return empty array if no warehouses", async () => {
      mockDb.query.warehouse.findMany.mockResolvedValueOnce([]);

      const res = await app.request("/api/warehouse", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });
  });

  describe("GET /api/warehouse/:id", () => {
    test("should return a warehouse if exists", async () => {
      const testWarehouse = {
        id: 1,
        name: "Test Warehouse",
        location: "Test Location",
        capacity: 1000,
      };
      mockDb.query.warehouse.findFirst.mockResolvedValueOnce(testWarehouse);

      const res = await app.request("/api/warehouse/1", {
        method: "GET",
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(testWarehouse);
    });

    test("should return 404 if warehouse doesn't exist", async () => {
      mockDb.query.warehouse.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/warehouse/999", {
        method: "GET",
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Warehouse not found");
    });
  });

  describe("POST /api/warehouse", () => {
    test("should create a new warehouse with valid data", async () => {
      const newWarehouse = {
        name: "New Warehouse",
        address: "New Location",
      };

      const createdWarehouse = {
        id: 3,
        ...newWarehouse,
      };

      mockSchemas.createWarehouseSchema.mockReturnValueOnce(newWarehouse);
      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => createdWarehouse),
        })),
      });

      const res = await app.request("/api/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWarehouse),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(createdWarehouse);
    });
  });

  describe("PUT /api/warehouse/:id", () => {
    test("should update warehouse with valid data", async () => {
      const updateData = {
        name: "Updated Warehouse Name",
        location: "Updated Location",
      };

      const mockUpdatedWarehouse = {
        id: 1,
        ...updateData,
        capacity: 1000,
        updatedAt: new Date(),
      };

      mockSchemas.updateWarehouseSchema.mockReturnValueOnce(updateData);
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [mockUpdatedWarehouse]),
          })),
        })),
      });

      const res = await app.request("/api/warehouse/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        name: string;
        location: string;
        id: number;
        updatedAt: Date;
      };
      expect(json.name).toBe("Updated Warehouse Name");
      expect(json.location).toBe("Updated Location");
      expect(json.id).toBe(1);
      expect(json.updatedAt).toBeDefined();
    });

    test("should return 404 if warehouse doesn't exist", async () => {
      const validUpdate = {
        name: "Updated Name",
      };

      mockSchemas.updateWarehouseSchema.mockReturnValueOnce(validUpdate);
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => []),
          })),
        })),
      });

      const res = await app.request("/api/warehouse/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdate),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Warehouse not found");
    });

    test("should allow partial updates", async () => {
      const partialUpdate = {
        name: "Partially Updated Name",
      };

      const mockUpdatedWarehouse = {
        id: 1,
        name: "Partially Updated Name",
        location: "Original Location",
        capacity: 1000,
        updatedAt: new Date(),
      };

      mockSchemas.updateWarehouseSchema.mockReturnValueOnce(partialUpdate);
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [mockUpdatedWarehouse]),
          })),
        })),
      });

      const res = await app.request("/api/warehouse/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialUpdate),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as { name: string; location: string };
      expect(json.name).toBe("Partially Updated Name");
      expect(json.location).toBe("Original Location");
    });
  });

  describe("DELETE /api/warehouse/:id", () => {
    test("should delete warehouse successfully", async () => {
      const warehouseId = 1;
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => [{ id: warehouseId, name: "Test Warehouse" }]),
        })),
      });

      const res = await app.request(`/api/warehouse/${warehouseId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ message: "Warehouse deleted successfully" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    test("should return 404 if warehouse doesn't exist", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      });

      const res = await app.request("/api/warehouse/999", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Warehouse not found");
    });
  });
});
