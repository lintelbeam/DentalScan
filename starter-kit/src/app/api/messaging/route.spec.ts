import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    thread: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/anthropic-messaging", () => ({
  generateClinicReply: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { GET, POST } from "./route";

describe("Messaging route validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 400 when neither threadId nor patientId is provided", async () => {
    const req = new Request("http://localhost/api/messaging", { method: "GET" });

    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: "Provide either threadId or patientId",
    });
    expect(vi.mocked(prisma.thread.findUnique)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.thread.findFirst)).not.toHaveBeenCalled();
  });

  it("POST returns 400 when content is missing", async () => {
    const req = new Request("http://localhost/api/messaging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: "patient_1",
        sender: "patient",
      }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: "content is required",
    });
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
  });

  it("POST returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/messaging", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-valid-json",
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: "Invalid JSON body",
    });
  });
});
