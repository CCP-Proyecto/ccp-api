import { customType } from "drizzle-orm/pg-core";

export const numericAsNumber = customType<{ data: number }>({
  dataType: (config) => {
    //@ts-ignore
    if (config?.precision && config?.scale) {
      //@ts-ignore
      return `numeric(${config.precision}, ${config.scale})`;
    }
    return "numeric";
  },
  toDriver(value: number): string {
    return String(value);
  },
  fromDriver(value): number {
    return Number(value);
  },
});
