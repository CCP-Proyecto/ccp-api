import { env } from "bun";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { verifySession } from "@/middlewares";
import { manufacturer, order, product } from "@/routes";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

app.use(logger());

app.use("/api/*", verifySession);

app.route("/api/manufacturer", manufacturer);
app.route("/api/product", product);
app.route("/api/order", order);

app.onError((error, c) => {
  if (!(error instanceof HTTPException)) {
    return c.json({ message: "Internal server error" }, 500);
  }

  let message = error.message;

  if (error.cause) {
    message += `-${error.cause}`;
  }

  return c.json(
    {
      message,
      status: error.status,
    },
    error.status,
  );
});

export default {
  port: env.PORT ?? 3000,
  fetch: app.fetch,
};
