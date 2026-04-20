import type { MarketDataErrorCode } from "./enums";

export class MarketDataError extends Error {
  constructor(
    public readonly code: MarketDataErrorCode,
    message: string,
    public readonly retryable = true,
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}
