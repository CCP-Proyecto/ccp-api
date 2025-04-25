import { drizzle } from "drizzle-orm/node-postgres";
import * as dataSchema from "./schema";
import * as authSchema from "./schema/auth-schema";

import { env } from "@/lib/env";

export const db = drizzle({
  connection: {
    connectionString: env.DATABASE_URL,
  },
  schema: {
    ...authSchema,
    ...dataSchema,
  },
});
