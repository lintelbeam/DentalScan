import type { Notification } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createCompletedNotification } from "@/lib/notification-service";

type NotificationModel = NonNullable<
  Parameters<typeof createCompletedNotification>[1]
>;

describe("createCompletedNotification", () => {
  it("reuses existing matching notification", async () => {
    const existingNotification: Notification = {
      id: "notif_1",
      userId: "clinic_1",
      title: "Scan Completed",
      message: "Scan scan_123 is ready for review.",
      read: false,
      createdAt: new Date("2026-04-17T10:00:00.000Z"),
    };

    const model = {
      findFirst: vi.fn().mockResolvedValue(existingNotification),
      create: vi.fn(),
    } as unknown as NotificationModel;

    const result = await createCompletedNotification(
      { scanId: "scan_123", userId: "clinic_1" },
      model
    );

    expect(model.findFirst).toHaveBeenCalledTimes(1);
    expect(model.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      notification: existingNotification,
      created: false,
    });
  });

  it("creates notification when no existing match is found", async () => {
    const createdNotification: Notification = {
      id: "notif_2",
      userId: "clinic_1",
      title: "Scan Completed",
      message: "Scan scan_999 is ready for review.",
      read: false,
      createdAt: new Date("2026-04-17T12:00:00.000Z"),
    };

    const model = {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(createdNotification),
    } as unknown as NotificationModel;

    const result = await createCompletedNotification(
      { scanId: "scan_999", userId: "clinic_1" },
      model
    );

    expect(model.findFirst).toHaveBeenCalledTimes(1);
    expect(model.create).toHaveBeenCalledWith({
      data: {
        userId: "clinic_1",
        title: "Scan Completed",
        message: "Scan scan_999 is ready for review.",
        read: false,
      },
    });
    expect(result).toEqual({
      notification: createdNotification,
      created: true,
    });
  });
});
