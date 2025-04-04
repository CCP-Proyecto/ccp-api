import { type } from "arktype";

const envType = type({
  BETTER_AUTH_SECRET: "string",
  BETTER_AUTH_URL: "string",
  DATABASE_URL: "string",
  "PORT?": "string",
});

const parsedEnv = envType(process.env);

if (parsedEnv instanceof type.errors) {
  console.error("Invalid environment variables:");
  console.error(parsedEnv);
  process.exit(1);
}

export const env = parsedEnv;
