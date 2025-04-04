import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/auth-schema";

import { env } from "@/lib/env";

export const db = drizzle({
  connection: {
    connectionString: env.DATABASE_URL,
  },
  schema,
});
