import { Hono } from "hono";

const manufacturer = new Hono();

manufacturer.get("/", (c) => {
  return c.json({ message: "Hello World" });
});

export { manufacturer };
