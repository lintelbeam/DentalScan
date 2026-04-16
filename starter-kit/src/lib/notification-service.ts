import type { Notification } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const NOTIFICATION_TITLE = "Scan Completed";

function buildNotificationMessage(scanId: string): string {
  return `Scan ${scanId} is ready for review.`;
}

type NotificationModel = {
  findFirst: typeof prisma.notification.findFirst;
  create: typeof prisma.notification.create;
};

export async function createCompletedNotification(params: {
  scanId: string;
  userId: string;
}, notificationModel: NotificationModel = prisma.notification): Promise<{ notification: Notification; created: boolean }> {
  const { scanId, userId } = params;
  const message = buildNotificationMessage(scanId);

  const existing = await notificationModel.findFirst({
    where: {
      userId,
      title: NOTIFICATION_TITLE,
      message,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    return { notification: existing, created: false };
  }

  const notification = await notificationModel.create({
    data: {
      userId,
      title: NOTIFICATION_TITLE,
      message,
      read: false,
    },
  });

  return { notification, created: true };
}
