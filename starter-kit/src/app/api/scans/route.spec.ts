import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/notification-service", () => ({
  createCompletedNotification: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

describe("POST /api/scans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid status", async () => {
    const req = new Request("http://localhost/api/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "done",
        images: ["img-1"],
      }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: "status must be one of: pending, completed, failed",
    });
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
  });

  it("returns 400 when completed scan has no images", async () => {
    const req = new Request("http://localhost/api/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        images: [],
      }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: "images is required for completed scans",
    });
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
  });
});
