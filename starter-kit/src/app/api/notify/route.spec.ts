import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scan: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notification-service", () => ({
  createCompletedNotification: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createCompletedNotification } from "@/lib/notification-service";
import { POST } from "./route";

describe("POST /api/notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when scanId is missing", async () => {
    const req = new Request("http://localhost/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, error: "scanId is required" });
  });

  it("skips notification when status is not completed", async () => {
    const req = new Request("http://localhost/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId: "scan_1", status: "pending" }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      skipped: true,
      reason: "Notification not created for status 'pending'",
    });
    expect(vi.mocked(prisma.scan.findUnique)).not.toHaveBeenCalled();
    expect(vi.mocked(createCompletedNotification)).not.toHaveBeenCalled();
  });

  it("returns 404 when completed scan does not exist", async () => {
    vi.mocked(prisma.scan.findUnique).mockResolvedValueOnce(null as never);

    const req = new Request("http://localhost/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId: "scan_missing", status: "completed" }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ ok: false, error: "Scan not found" });
  });

  it("creates notification for completed scan", async () => {
    vi.mocked(prisma.scan.findUnique).mockResolvedValueOnce({ id: "scan_123" } as never);
    vi.mocked(createCompletedNotification).mockResolvedValueOnce({
      created: true,
      notification: {
        id: "notif_123",
        userId: "clinic_1",
        title: "Scan Completed",
        message: "Scan scan_123 is ready for review.",
        read: false,
        createdAt: new Date("2026-04-17T12:00:00.000Z"),
      } as never,
    });

    const req = new Request("http://localhost/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId: "scan_123", status: "completed", userId: "clinic_1" }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.created).toBe(true);
    expect(body.notification.id).toBe("notif_123");
    expect(createCompletedNotification).toHaveBeenCalledWith({
      scanId: "scan_123",
      userId: "clinic_1",
    });
  });
});
