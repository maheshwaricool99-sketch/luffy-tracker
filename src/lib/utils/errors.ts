export function errorMessage(error: unknown, fallback = "Request failed") {
  return error instanceof Error ? error.message : fallback;
}
