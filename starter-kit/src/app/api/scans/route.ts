import { NextResponse } from "next/server";
import { DEMO_IDS } from "@/lib/demo-constants";
import { createCompletedNotification } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import { isAllowedValue, readJsonRecord, readOptionalString, readStringArray } from "@/lib/request-validation";

export async function POST(req: Request) {
  let body: Record<string, unknown>;

  try {
    body = await readJsonRecord(req);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const status = readOptionalString(body.status) ?? "completed";
    const images = readStringArray(body.images);
    const scanId = readOptionalString(body.scanId);
    const userId = readOptionalString(body.userId) ?? readOptionalString(body.clinicUserId) ?? DEMO_IDS.clinicUserId;

    if (!isAllowedValue(status, ["pending", "completed", "failed"] as const)) {
      return NextResponse.json(
        { ok: false, error: "status must be one of: pending, completed, failed" },
        { status: 400 }
      );
    }

    if (status === "completed" && (!images || images.length === 0)) {
      return NextResponse.json(
        { ok: false, error: "images is required for completed scans" },
        { status: 400 }
      );
    }

    const serializedImages = images ? JSON.stringify(images) : undefined;

    const result = await prisma.$transaction(async (tx) => {
      let scan;
      let scanCreated = false;

      if (scanId) {
        const existing = await tx.scan.findUnique({ where: { id: scanId } });

        if (existing) {
          scan = await tx.scan.update({
            where: { id: scanId },
            data: {
              status,
              ...(serializedImages ? { images: serializedImages } : {}),
            },
          });
        } else {
          scan = await tx.scan.create({
            data: {
              id: scanId,
              status,
              ...(serializedImages ? { images: serializedImages } : {}),
            },
          });
          scanCreated = true;
        }
      } else {
        scan = await tx.scan.create({
          data: {
            status,
            ...(serializedImages ? { images: serializedImages } : {}),
          },
        });
        scanCreated = true;
      }

      if (status !== "completed") {
        return { scan, scanCreated, notification: null, notificationCreated: false };
      }

      const { notification, created } = await createCompletedNotification(
        { scanId: scan.id, userId },
        tx.notification
      );

      console.log(`[STUB] Notification dispatch simulated for scan ${scan.id}`);

      return { scan, scanCreated, notification, notificationCreated: created };
    });

    return NextResponse.json(
      {
        ok: true,
        created: result.scanCreated,
        scan: {
          id: result.scan.id,
          status: result.scan.status,
          imagesCount: images?.length ?? 0,
          createdAt: result.scan.createdAt,
          updatedAt: result.scan.updatedAt,
        },
        notification: result.notification
          ? {
              id: result.notification.id,
              userId: result.notification.userId,
              title: result.notification.title,
              message: result.notification.message,
              read: result.notification.read,
              createdAt: result.notification.createdAt,
            }
          : null,
        notificationCreated: result.notificationCreated,
      },
      { status: result.scanCreated ? 201 : 200 }
    );
  } catch (err) {
    console.error("Scan Finalization API Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to finalize scan" }, { status: 500 });
  }
}
