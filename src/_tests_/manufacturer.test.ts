import { beforeEach, describe, expect, mock, test } from "bun:test";
import { manufacturer } from "@/routes/manufacturer";
import { Hono } from "hono";

mock.module("@/db", () => ({
  db: {
    select: mock(() => ({
      from: mock(() => [
        { id: "manu-1", name: "Manufacturer One" },
        { id: "manu-2", name: "Manufacturer Two" },
      ]),
    })),
    query: {
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

const mockDb = require("@/db").db;

describe("Manufacturer API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/manufacturer", manufacturer);
    mockDb.query.manufacturer.findFirst.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe("GET /api/manufacturer", () => {
    test("should return all manufacturers", async () => {
      const res = await app.request("/api/manufacturer", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([
        { id: "manu-1", name: "Manufacturer One" },
        { id: "manu-2", name: "Manufacturer Two" },
      ]);
    });

    test("should return empty array if no manufacturers", async () => {
      mockDb.select.mockReturnValueOnce({
        from: mock(() => []),
      });

      const res = await app.request("/api/manufacturer", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });
  });

  describe("GET /api/manufacturer/:id", () => {
    test("should return a manufacturer if exists", async () => {
      const testManufacturer = {
        id: "manu-123",
        name: "Test Manufacturer",
        address: "123 Test St",
      };
      mockDb.query.manufacturer.findFirst.mockResolvedValueOnce(
        testManufacturer,
      );

      const res = await app.request("/api/manufacturer/manu-123", {
        method: "GET",
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(testManufacturer);
    });

    test("should return 404 if manufacturer doesn't exist", async () => {
      mockDb.query.manufacturer.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/manufacturer/non-existent", {
        method: "GET",
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Manufacturer not found");
    });
  });

  describe("POST /api/manufacturer", () => {
    test("should create a new manufacturer with valid data", async () => {
      const newManufacturer = {
        id: "123454321",
        idType: "CC",
        name: "Test manufacturer",
        phone: "345678493",
        address: "calle test # test - test",
        email: "testmanufacturer@manufacturer.com",
      };

      mockDb.query.manufacturer.findFirst.mockResolvedValueOnce(null);
      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => [newManufacturer]),
        })),
      });

      const res = await app.request("/api/manufacturer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newManufacturer),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual(newManufacturer);
    });

    test("should return 400 when required fields are missing", async () => {
      const invalidManufacturer = {
        id: "manu-123",
      };

      const res = await app.request("/api/manufacturer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidManufacturer),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid request body");
    });

    test("should return 400 when manufacturer already exists", async () => {
      const existingManufacturer = {
        id: "123454321",
        idType: "CC",
        name: "Test manufacturer",
        phone: "345678493",
        address: "calle test # test - test",
        email: "testmanufacturer@manufacturer.com",
      };

      mockDb.query.manufacturer.findFirst.mockResolvedValueOnce(
        existingManufacturer,
      );

      const res = await app.request("/api/manufacturer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existingManufacturer),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Manufacturer already exists");
    });
  });

  describe("PUT /api/manufacturer/:id", () => {
    test("should update manufacturer with valid data", async () => {
      const updateData = {
        name: "Updated Manufacturer Name",
        address: "456 Updated Street",
      };

      const mockUpdatedManufacturer = {
        id: "manu-123",
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [mockUpdatedManufacturer]),
          })),
        })),
      });

      const res = await app.request("/api/manufacturer/manu-123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(200);

      type ManufacturerResponse = {
        id: string;
        name: string;
        address: string;
        updatedAt: string;
      };

      const data = (await res.json()) as ManufacturerResponse;

      expect(data.name).toBe("Updated Manufacturer Name");
      expect(data.address).toBe("456 Updated Street");
      expect(data.id).toBe("manu-123");
      expect(data.updatedAt).toBeDefined();
    });

    test("should return 400 for invalid data", async () => {
      const invalidUpdate = {
        name: 123,
      };

      const res = await app.request("/api/manufacturer/manu-123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidUpdate),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid request body");
    });

    test("should return 404 if manufacturer doesn't exist", async () => {
      const validUpdate = {
        name: "Updated Name",
      };

      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => []),
          })),
        })),
      });

      const res = await app.request("/api/manufacturer/non-existent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdate),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Manufacturer not found");
    });

    test("should allow partial updates", async () => {
      const partialUpdate = {
        name: "Partially Updated Name",
      };

      const mockUpdatedManufacturer = {
        id: "manu-123",
        name: "Partially Updated Name",
        address: "Original Address",
        updatedAt: new Date().toISOString(),
      };

      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [mockUpdatedManufacturer]),
          })),
        })),
      });

      const res = await app.request("/api/manufacturer/manu-123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialUpdate),
      });

      expect(res.status).toBe(200);

      type ManufacturerResponse = {
        id: string;
        name: string;
        address: string;
        updatedAt: string;
      };

      const responseData = (await res.json()) as ManufacturerResponse;

      expect(responseData.name).toBe("Partially Updated Name");
      expect(responseData.address).toBe("Original Address");
    });

    test("should ignore extra fields not in schema", async () => {
      const updateWithExtraFields = {
        name: "Updated Name",
        extraField: "should be ignored",
      };

      const mockUpdatedManufacturer = {
        id: "manu-123",
        name: "Updated Name",
        address: "Original Address",
        updatedAt: new Date().toISOString(),
      };

      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [mockUpdatedManufacturer]),
          })),
        })),
      });

      const res = await app.request("/api/manufacturer/manu-123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateWithExtraFields),
      });

      expect(res.status).toBe(200);

      type ManufacturerResponse = {
        id: string;
        name: string;
        address: string;
        updatedAt: string;
      };

      const data = (await res.json()) as ManufacturerResponse;

      expect(data.name).toBe("Updated Name");
      expect(data.address).toBe("Original Address");
      expect(data.id).toBe("manu-123");
      expect(data.updatedAt).toBeDefined();

      const responseKeys = Object.keys(data);
      expect(responseKeys).not.toContain("extraField");
      expect(responseKeys).toEqual(["id", "name", "address", "updatedAt"]);
    });
  });

  describe("DELETE /api/manufacturer/:id", () => {
    const manufacturerId = "manu-123";

    test("should delete manufacturer successfully", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => [
            { id: manufacturerId, name: "Test Manufacturer" },
          ]),
        })),
      });

      const res = await app.request(`/api/manufacturer/${manufacturerId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ message: "Manufacturer deleted successfully" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    test("should return 404 if manufacturer doesn't exist", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      });

      const res = await app.request("/api/manufacturer/non-existent-id", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Manufacturer not found");
    });
  });
});
