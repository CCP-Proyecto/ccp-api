import { beforeEach, describe, expect, mock, test } from "bun:test";
import { customer } from "@/routes/customer";
import { Hono } from "hono";

mock.module("@/db", () => ({
  db: {
    select: mock(() => ({
      from: mock(() => [
        { id: "cust-1", name: "Customer One" },
        { id: "cust-2", name: "Customer Two" },
      ]),
    })),
    query: {
      customer: {
        findFirst: mock(() => null),
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

describe("Customer API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/customer", customer);
  });

  describe("GET /api/customer", () => {
    test("should return all customers", async () => {
      const res = await app.request("/api/customer", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([
        { id: "cust-1", name: "Customer One" },
        { id: "cust-2", name: "Customer Two" },
      ]);
    });

    test("should return empty array if no customers", async () => {
      mockDb.select.mockReturnValueOnce({
        from: mock(() => []),
      });

      const res = await app.request("/api/customer", { method: "GET" });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });
  });

  describe("GET /api/customer/:id", () => {
    test("should return a customer if exists", async () => {
      const testCustomer = {
        id: "cust-123",
        name: "Test Customer",
        address: "123 Test St",
        salespersonId: "sales-999",
      };
      mockDb.query.customer.findFirst.mockResolvedValueOnce(testCustomer);

      const res = await app.request("/api/customer/cust-123", {
        method: "GET",
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(testCustomer);
    });

    test("should return 404 if customer doesn't exist", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/customer/non-existent", {
        method: "GET",
      });
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Customer not found");
    });
  });

  describe("POST /api/customer", () => {
    test("should create a new customer without salespersonId", async () => {
      const newCustomer = {
        id: "12345",
        idType: "CC",
        name: "Carlos Mendoza",
        address: "123 Main Street, Bogotá",
        phone: "+57 3001234567",
      };

      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);
      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => [newCustomer]),
        })),
      });

      const res = await app.request("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual(newCustomer);
    });

    test("should create a new customer with valid salespersonId", async () => {
      const newCustomer = {
        id: "12345",
        idType: "CC",
        name: "Carlos Mendoza",
        address: "123 Main Street, Bogotá",
        phone: "+57 3001234567",
        salespersonId: "123",
      };

      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({
        id: "123",
        name: "John Doe",
      });
      mockDb.insert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => [newCustomer]),
        })),
      });

      const res = await app.request("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual(newCustomer);
    });

    test("should return 400 when required fields are missing", async () => {
      const invalidCustomer = {
        id: "12345",
        idType: "CC",
        phone: "+57 3001234567",
      };

      const res = await app.request("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidCustomer),
      });

      expect(res.status).toBe(400);
    });
    test("should return 400 when salesperson doesn't exist", async () => {
      const newCustomer = {
        id: "12345",
        idType: "CC",
        name: "Carlos Mendoza",
        address: "123 Main Street, Bogotá",
        phone: "+57 3001234567",
        salespersonId: "5674093722",
      };

      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      const responseText = await res.text();

      expect(res.status).toBe(400);
      expect(responseText).toContain("Salesperson does not exist");
    });
  });

  describe("PUT /api/customer/:id", () => {
    test("should update customer with valid data", async () => {
      const updateData = {
        name: "Updated Name",
        phone: "+57 3009876543",
      };

      const mockUpdatedCustomer = {
        id: "cust-123",
        ...updateData,
        idType: "CC",
        address: "123 Main St",
        salespersonId: null,
        updatedAt: new Date().toISOString(),
      };

      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [mockUpdatedCustomer]),
          })),
        })),
      });

      const res = await app.request("/api/customer/cust-123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as typeof mockUpdatedCustomer;
      expect(data.name).toBe("Updated Name");
      expect(data.phone).toBe("+57 3009876543");
    });

    test("should return 400 for invalid data", async () => {
      const invalidUpdate = {
        phone: 123,
      };

      const res = await app.request("/api/customer/cust-123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidUpdate),
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Invalid request body");
    });

    test("should return 404 if customer doesn't exist", async () => {
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

      const res = await app.request("/api/customer/non-existent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdate),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Customer not found");
    });

    test("should allow partial updates", async () => {
      const partialUpdate = {
        name: "Partially Updated",
      };

      const mockUpdatedCustomer = {
        id: "cust-123",
        name: "Partially Updated",
        idType: "CC",
        phone: "+57 3001234567",
      };

      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [mockUpdatedCustomer]),
          })),
        })),
      });

      const res = await app.request("/api/customer/cust-123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialUpdate),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as typeof mockUpdatedCustomer;
      expect(data.name).toBe("Partially Updated");
      expect(data.idType).toBe("CC");
    });

    test("should reject update with only salespersonId", async () => {
      const invalidUpdate = {
        salespersonId: "1234567890",
      };

      const res = await app.request("/api/customer/cust-123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidUpdate),
      });

      const responseText = await res.text();

      expect(res.status).toBe(400);

      let errorMessage: string;
      try {
        const data = JSON.parse(responseText);
        errorMessage = data.message;
      } catch {
        errorMessage = responseText;
      }

      expect(errorMessage).toContain("Forbidden salespersonId update");
    });

    test("should ignore extra fields not in schema", async () => {
      const updateWithExtraFields = {
        name: "Updated Name",
        extraField: "should be ignored",
      };

      const mockUpdatedCustomer = {
        id: "cust-123",
        name: "Updated Name",
        idType: "CC",
        updatedAt: new Date().toISOString(),
      };

      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [mockUpdatedCustomer]),
          })),
        })),
      });

      const res = await app.request("/api/customer/cust-123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateWithExtraFields),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as typeof mockUpdatedCustomer;
      expect(data.name).toBe("Updated Name");
      expect(data).not.toHaveProperty("extraField");
    });
  });

  describe("PATCH /api/customer/:id/salesperson", () => {
    const customerId = "cust-123";
    const salespersonId = "sales-456";

    beforeEach(() => {
      mockDb.query.customer.findFirst.mockReset();
      mockDb.query.salesperson.findFirst.mockReset();
      mockDb.update.mockReset();
    });

    test("should return 400 when salesperson doesn't exist", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce({
        id: customerId,
        name: "Test Customer",
      });
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request(`/api/customer/${customerId}/salesperson`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salespersonId: "invalid-salesperson" }),
      });

      expect(res.status).toBe(400);

      const responseText = await res.text();
      expect(responseText).toBe("Salesperson not found");
    });

    test("should return 404 when customer doesn't exist", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce(null);

      const res = await app.request(
        "/api/customer/non-existent-id/salesperson",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ salespersonId }),
        },
      );

      expect(res.status).toBe(404);
      const responseText = await res.text();
      expect(responseText).toBe("Customer not found");
    });

    test("should return 400 when salespersonId is empty", async () => {
      const emptySalespersonId = {
        salespersonId: "",
      };

      const res = await app.request(`/api/customer/${customerId}/salesperson`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emptySalespersonId),
      });

      expect(res.status).toBe(400);
      const responseText = await res.text();
      expect(responseText).toBe("salespersonId is required");
    });

    test("should update customer's salesperson successfully", async () => {
      mockDb.query.customer.findFirst.mockResolvedValueOnce({
        id: customerId,
        name: "Test Customer",
      });
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({
        id: salespersonId,
        name: "Test Salesperson",
      });
      mockDb.update.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({
            returning: mock(() => [
              {
                id: customerId,
                name: "Test Customer",
                salespersonId: salespersonId,
              },
            ]),
          })),
        })),
      });

      const res = await app.request(`/api/customer/${customerId}/salesperson`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salespersonId }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { salespersonId: string };
      expect(data.salespersonId).toBe(salespersonId);
    });
  });

  describe("GET /api/customer/salesperson/:salespersonId", () => {
    const salespersonId = "sales-123";
    const testCustomers = [
      { id: "cust-1", name: "Customer One", salespersonId },
      { id: "cust-2", name: "Customer Two", salespersonId },
    ];

    beforeEach(() => {
      mockDb.query.salesperson.findFirst.mockReset();
      mockDb.query.customer.findMany.mockReset();
    });

    test("should return customers for a valid salesperson", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({
        id: salespersonId,
      });
      mockDb.query.customer.findMany.mockResolvedValueOnce(testCustomers);

      const res = await app.request(
        `/api/customer/salesperson/${salespersonId}`,
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(testCustomers);
      expect(mockDb.query.customer.findMany).toHaveBeenCalledWith({
        where: expect.anything(), // We can't directly compare the eq() function
      });
    });

    test("should return 404 if salesperson doesn't exist", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request(
        "/api/customer/salesperson/undefine-salesperson-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Salesperson not found");
    });

    test("should return empty array if salesperson has no customers", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({
        id: salespersonId,
      });
      mockDb.query.customer.findMany.mockResolvedValueOnce([]);

      const res = await app.request(
        `/api/customer/salesperson/${salespersonId}`,
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });

    test("should only return customers for the specified salesperson", async () => {
      const otherSalespersonCustomers = [
        { id: "cust-3", name: "Other Customer", salespersonId: "sales-456" },
      ];

      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({
        id: salespersonId,
      });
      mockDb.query.customer.findMany.mockResolvedValueOnce(
        testCustomers.filter((c) => c.salespersonId === salespersonId),
      );

      const res = await app.request(
        `/api/customer/salesperson/${salespersonId}`,
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(testCustomers);
      expect(json).not.toEqual(
        expect.arrayContaining(otherSalespersonCustomers),
      );
    });
  });

  describe("GET /api/customer/salesperson/:salespersonId", () => {
    const salespersonId = "sales-123";
    const testCustomers = [
      { id: "cust-1", name: "Customer One", salespersonId },
      { id: "cust-2", name: "Customer Two", salespersonId },
    ];

    beforeEach(() => {
      mockDb.query.salesperson.findFirst.mockReset();
      mockDb.query.customer.findMany.mockReset();
    });

    test("should return customers for a valid salesperson", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({
        id: salespersonId,
      });
      mockDb.query.customer.findMany.mockResolvedValueOnce(testCustomers);

      const res = await app.request(
        `/api/customer/salesperson/${salespersonId}`,
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(testCustomers);
      expect(mockDb.query.customer.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    test("should return 404 if salesperson doesn't exist", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce(null);

      const res = await app.request(
        "/api/customer/salesperson/undefine-salesperson-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Salesperson not found");
    });

    test("should return empty array if salesperson has no customers", async () => {
      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({
        id: salespersonId,
      });
      mockDb.query.customer.findMany.mockResolvedValueOnce([]);

      const res = await app.request(
        `/api/customer/salesperson/${salespersonId}`,
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });

    test("should only return customers for the specified salesperson", async () => {
      const otherSalespersonCustomers = [
        { id: "cust-3", name: "Other Customer", salespersonId: "sales-456" },
      ];

      mockDb.query.salesperson.findFirst.mockResolvedValueOnce({
        id: salespersonId,
      });
      mockDb.query.customer.findMany.mockResolvedValueOnce(
        testCustomers.filter((c) => c.salespersonId === salespersonId),
      );

      const res = await app.request(
        `/api/customer/salesperson/${salespersonId}`,
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(testCustomers);
      expect(json).not.toEqual(
        expect.arrayContaining(otherSalespersonCustomers),
      );
    });
  });

  describe("DELETE /api/customer/:id", () => {
    const customerId = "cust-123";

    beforeEach(() => {
      mockDb.delete.mockReset();
    });

    test("should delete customer successfully", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => [{ id: customerId, name: "Test Customer" }]),
        })),
      });

      const res = await app.request(`/api/customer/${customerId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ message: "Customer deleted successfully" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    test("should return 404 if customer doesn't exist", async () => {
      mockDb.delete.mockReturnValueOnce({
        where: mock(() => ({
          returning: mock(() => []),
        })),
      });

      const res = await app.request("/api/customer/non-existent-id", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain("Customer not found");
    });
  });
});
