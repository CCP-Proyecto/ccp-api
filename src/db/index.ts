import { drizzle } from "drizzle-orm/node-postgres";
import * as authSchema from "./schema/auth-schema"; // optional if needed separately
import * as dataSchema from "./schema"; // ✅ pulls everything from index.ts

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
