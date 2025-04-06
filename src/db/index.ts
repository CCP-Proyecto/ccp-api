import { drizzle } from "drizzle-orm/node-postgres";
import * as authSchema from "./schema/auth-schema";
import * as dataSchema from "./schema/schema";

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
