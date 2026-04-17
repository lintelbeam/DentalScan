import { describe, expect, it } from "vitest";
import {
  isAllowedValue,
  isJsonRecord,
  readJsonRecord,
  readOptionalString,
  readStringArray,
} from "@/lib/request-validation";

describe("request-validation helpers", () => {
  it("normalizes optional string values", () => {
    expect(readOptionalString("  hello  ")).toBe("hello");
    expect(readOptionalString("   ")).toBeUndefined();
    expect(readOptionalString(123)).toBeUndefined();
  });

  it("validates allowed values", () => {
    const allowed = ["pending", "completed", "failed"] as const;

    expect(isAllowedValue("completed", allowed)).toBe(true);
    expect(isAllowedValue("other", allowed)).toBe(false);
    expect(isAllowedValue(undefined, allowed)).toBe(false);
  });

  it("reads and filters string arrays", () => {
    expect(readStringArray([" a ", "", "b", 42])).toEqual(["a", "b"]);
    expect(readStringArray([])).toBeUndefined();
    expect(readStringArray("not-an-array")).toBeUndefined();
  });

  it("checks JSON records", () => {
    expect(isJsonRecord({ ok: true })).toBe(true);
    expect(isJsonRecord(null)).toBe(false);
    expect(isJsonRecord([])).toBe(false);
  });

  it("reads JSON request bodies as records", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });

    await expect(readJsonRecord(req)).resolves.toEqual({ status: "completed" });
  });

  it("returns empty object when JSON body is not a record", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(["not", "record"]),
    });

    await expect(readJsonRecord(req)).resolves.toEqual({});
  });
});
