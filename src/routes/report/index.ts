import { type } from "arktype";
import { and, eq, gte, lt } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { addMonths, addQuarters } from "date-fns";

import { db } from "@/db";
import { order } from "@/db/schema/order-schema";
import { salesperson } from "@/db/schema/salesperson-schema";
import { PeriodType } from "@/constants";

const reportRouter = new Hono();

reportRouter.get("/", async (c) => {
  const { salespersonId, periodType, periodStart } = c.req.query();

  if (!salespersonId || !periodType || !periodStart) {
    throw new HTTPException(400, {
      message: "Missing required query parameters: salespersonId, periodType, periodStart"
    });
  }

  if (!Object.values(PeriodType).includes(periodType as PeriodType)) {
    throw new HTTPException(400, {
      message: "Invalid periodType. Must be one of: monthly, quarterly, semiannually"
    });
  }

  const typedPeriodType = periodType as PeriodType;

  const salespersonExists = await db.query.salesperson.findFirst({
    where: eq(salesperson.id, salespersonId),
  });
  if (!salespersonExists) {
    throw new HTTPException(404, { message: "Salesperson not found" });
  }

  const startDate = new Date(periodStart);
  let endDate: Date;

  switch (typedPeriodType) {
    case PeriodType.MONTHLY:
      endDate = addMonths(startDate, 1);
      break;
    case PeriodType.QUARTERLY:
      endDate = addQuarters(startDate, 1);
      break;
    case PeriodType.SEMIANNUALLY:
      endDate = addMonths(startDate, 6);
      break;
    default:
      throw new HTTPException(400, { message: "Invalid period type" });
  }

  const orders = await db.query.order.findMany({
    where: and(
      eq(order.salespersonId, salespersonId),
      gte(order.createdAt, startDate),
      lt(order.createdAt, endDate),
    ),
    with: {
      customer: true,
      orderProducts: {
        with: {
          product: true,
        },
      },
    },
  });

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );

  return c.json({
    period: {
      type: typedPeriodType,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    salesperson: salespersonExists,
    orders,
    summary: {
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    },
  });
});

export { reportRouter as report };
