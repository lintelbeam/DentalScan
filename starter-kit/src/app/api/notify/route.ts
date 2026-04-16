import { NextResponse } from "next/server";
import { DEMO_IDS } from "@/lib/demo-constants";
import { createCompletedNotification } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import { isAllowedValue, readJsonRecord, readOptionalString } from "@/lib/request-validation";

/**
 * CHALLENGE: NOTIFICATION SYSTEM
 * 
 * Your goal is to implement a robust notification logic.
 * 1. When a scan is "completed", create a record in the Notification table.
 * 2. Return a success status to the client.
 * 3. Bonus: Handle potential errors (e.g., database connection issues).
 */

export async function POST(req: Request) {
  let body: Record<string, unknown>;

  try {
    body = await readJsonRecord(req);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const scanId = readOptionalString(body.scanId);
    const status = readOptionalString(body.status);
    const userId = readOptionalString(body.userId) ?? readOptionalString(body.clinicUserId) ?? DEMO_IDS.clinicUserId;

    if (!scanId) {
      return NextResponse.json({ ok: false, error: "scanId is required" }, { status: 400 });
    }

    if (!isAllowedValue(status, ["pending", "completed", "failed"] as const)) {
      return NextResponse.json(
        { ok: false, error: "status must be one of: pending, completed, failed" },
        { status: 400 }
      );
    }

    if (status !== "completed") {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `Notification not created for status '${status}'`,
      });
    }

    const existingScan = await prisma.scan.findUnique({
      where: { id: scanId },
      select: { id: true },
    });

    if (!existingScan) {
      return NextResponse.json({ ok: false, error: "Scan not found" }, { status: 404 });
    }

    const { notification, created } = await createCompletedNotification({
      scanId,
      userId,
    });

    console.log(`[STUB] Notification dispatch simulated for scan ${scanId}`);

    return NextResponse.json({
      ok: true,
      created,
      notification: {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        createdAt: notification.createdAt,
      },
    }, { status: created ? 201 : 200 });
  } catch (err) {
    console.error("Notification API Error:", err);
    return NextResponse.json({ ok: false, error: "Failed to create notification" }, { status: 500 });
  }
}
