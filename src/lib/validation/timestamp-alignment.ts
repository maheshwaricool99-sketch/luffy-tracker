export function validateTimestampAlignment(priceTs: number, candleTs: number) {
  const deltaMs = Math.abs(priceTs - candleTs);
  return {
    ok: deltaMs <= 2 * 60_000,
    deltaMs,
  };
}
