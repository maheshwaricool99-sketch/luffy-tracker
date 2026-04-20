export function publicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://127.0.0.1:3000";
}
