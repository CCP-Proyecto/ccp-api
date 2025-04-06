import { auth } from "@/lib/auth";
import { createMiddleware } from "hono/factory";

export const verifySession = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Invalid or missing session" }, 401);
  }

  next();
});
