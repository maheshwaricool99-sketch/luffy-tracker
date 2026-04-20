export const queryKeys = {
  intelligence: {
    all: ["intelligence"] as const,
    feed: (market?: string, filters?: Record<string, unknown>) =>
      ["intelligence", "feed", market ?? "all", filters ?? {}] as const,
    detail: (id: string) => ["intelligence", "detail", id] as const,
  },
  signals: {
    all: ["signals"] as const,
    feed: (filters?: Record<string, unknown>) => ["signals", "feed", filters ?? {}] as const,
    detail: (id: string) => ["signals", "detail", id] as const,
    pulse: () => ["signals", "pulse"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    summary: () => ["dashboard", "summary"] as const,
  },
  health: {
    all: ["health"] as const,
    summary: () => ["health", "summary"] as const,
  },
  watchlists: {
    all: (userId: string) => ["watchlists", userId] as const,
  },
  alerts: {
    all: (userId: string) => ["alerts", userId] as const,
  },
} as const;
