export type JsonRecord = Record<string, unknown>;

export async function readJsonRecord(req: Request): Promise<JsonRecord> {
  const body = await req.json();
  return isJsonRecord(body) ? body : {};
}

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isAllowedValue<T extends readonly string[]>(
  value: string | undefined,
  allowedValues: T
): value is T[number] {
  return Boolean(value) && allowedValues.includes(value as T[number]);
}
