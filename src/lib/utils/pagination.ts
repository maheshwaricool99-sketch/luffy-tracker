export function encodeCursor(value: string) {
  return Buffer.from(value).toString("base64url");
}

export function decodeCursor(value: string | null | undefined) {
  if (!value) return null;
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
