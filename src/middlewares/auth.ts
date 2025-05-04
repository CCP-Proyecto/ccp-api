import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { auth } from "@/lib/auth";

export const verifySession = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  console.error("*******************************************");
  console.error(JSON.stringify(session));
  console.error("*******************************************");

  if (!session) {
    throw new HTTPException(401, {
      message: "Invalid or missing session",
    });
  }

  return next();
});
