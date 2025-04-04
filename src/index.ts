import { env } from "bun";
import { Hono } from "hono";

import { auth } from "@/lib/auth";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

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

app.use("/api/*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Invalid or missing session" }, 401);
  }

  next();
});

app.get("/api/product", async (c) => {
  return c.json({ name: "Cheetos", price: 100 });
});

export default {
  port: env.PORT ?? 3000,
  fetch: app.fetch,
};
