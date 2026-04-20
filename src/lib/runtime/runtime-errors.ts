import { AppRouteError } from "@/lib/http/response";

export class RuntimePolicyError extends Error {
  constructor(
    public readonly code:
      | "MAINTENANCE_MODE_ACTIVE"
      | "READ_ONLY_MODE_ENABLED"
      | "SIGNUPS_DISABLED"
      | "SIGNAL_PUBLISHING_PAUSED"
      | "SCANNERS_PAUSED"
      | "UPGRADES_FROZEN"
      | "EXPERIMENTS_PAUSED"
      | "RUNTIME_FLAG_FORBIDDEN"
      | "RUNTIME_FLAG_UNKNOWN",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RuntimePolicyError";
  }
}

export function toRuntimeErrorResponse(error: unknown) {
  if (error instanceof AppRouteError) {
    return {
      status: error.status,
      body: {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      },
    };
  }
  if (error instanceof RuntimePolicyError) {
    return {
      status: error.status,
      body: {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }
  return null;
}
