/**
 * RUNTIME CONFIG — PAPER MODE ONLY
 *
 * Live trading mode has been permanently removed.
 * API keys are not required and are ignored if present.
 *
 * The only config this file exposes is whether the paper engine
 * is enabled (always true) and the price feed health.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** @deprecated Use getPaperModeStatus() from paper-mode.ts instead. */
export type PaperRuntimeConfig = {
  enabled: true;
  mode: "paper";
  paperTradingOnly: true;
  liveTradingEnabled: false;
  updatedAtMs: number;
};

// ── Config (static — no file I/O needed) ─────────────────────────────────────

function buildConfig(): PaperRuntimeConfig {
  return {
    enabled: true,
    mode: "paper",
    paperTradingOnly: true,
    liveTradingEnabled: false,
    updatedAtMs: Date.now(),
  };
}

export async function readPaperRuntimeConfig(): Promise<PaperRuntimeConfig> {
  return buildConfig();
}

/** @deprecated No-op in paper mode. Config is static. */
export async function writePaperRuntimeConfig(
  _input: Partial<PaperRuntimeConfig>,
): Promise<PaperRuntimeConfig> {
  return buildConfig();
}

export function redactPaperRuntimeConfig(config: PaperRuntimeConfig) {
  return {
    ...config,
    // API key fields always empty — not supported in paper mode
    apiKey: "",
    apiSecret: "",
    hasApiKey: false,
    hasApiSecret: false,
  };
}

export function getPaperRuntimeConfigPath(): string {
  // No config file in paper mode
  return "(paper-mode-only — no config file)";
}
