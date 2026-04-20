import { PAGE_SCHEMAS } from "@/lib/pages/page-schemas";

describe("prediction pages", () => {
  it("defines all new read-only pages", () => {
    expect(PAGE_SCHEMAS.prediction.endpoint).toBe("/api/prediction-engine");
    expect(PAGE_SCHEMAS.whale.endpoint).toBe("/api/whale-flow");
    expect(PAGE_SCHEMAS.derivatives.endpoint).toBe("/api/derivatives");
    expect(PAGE_SCHEMAS.liquidation.endpoint).toBe("/api/liquidation-map");
    expect(PAGE_SCHEMAS.india.endpoint).toBe("/api/india-signals");
  });
});
