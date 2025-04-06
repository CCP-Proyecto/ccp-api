import { env } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { verifySession } from "@/middlewares";
import { manufacturer, product } from "@/routes";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: "http://localhost:3001", // replace with your origin
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.use(logger());

app.use("/api/*", verifySession);

app.route("/api/manufacturer", manufacturer);

export default {
  port: env.PORT ?? 3000,
  fetch: app.fetch,
};
