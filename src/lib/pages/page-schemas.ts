export const PAGE_SCHEMAS = {
  whale: {
    title: "Whale Flow",
    endpoint: "/api/whale-flow",
    description: "Crypto-only smart money watchlist. Read-only.",
  },
  derivatives: {
    title: "Derivatives",
    endpoint: "/api/derivatives",
    description: "Crypto-only funding and open-interest view. Read-only.",
  },
  liquidation: {
    title: "Liquidation Map",
    endpoint: "/api/liquidation-map",
    description: "Crypto-only approximate liquidation bands. Read-only.",
  },
  prediction: {
    title: "Prediction Engine",
    endpoint: "/api/prediction-engine",
    description: "Cross-market predictive setups before move. Read-only.",
  },
  india: {
    title: "Indian Stocks Signals",
    endpoint: "/api/india-signals",
    description: "NSE/BSE read-only predictive signals with market-hours awareness.",
  },
} as const;
