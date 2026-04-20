import { z } from "zod";

export const timeframeSchema = z.enum(["5m", "15m", "1H", "4H", "1D", "1W"]);

export const symbolSchema = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .regex(/^[A-Z0-9]+$/i);

export function parseTimeframe(input: string | null | undefined) {
  return timeframeSchema.safeParse(input ?? "1H");
}

export function parseSymbol(input: string | null | undefined) {
  return symbolSchema.safeParse((input ?? "").toUpperCase());
}
