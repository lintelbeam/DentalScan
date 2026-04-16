import { NextResponse } from "next/server";
import { DEMO_IDS } from "@/lib/demo-constants";
import { prisma } from "@/lib/prisma";
import { readJsonRecord, readOptionalString } from "@/lib/request-validation";

/**
 * CHALLENGE: NOTIFICATION SYSTEM
 * 
 * Your goal is to implement a robust notification logic.
 * 1. When a scan is "completed", create a record in the Notification table.
 * 2. Return a success status to the client.
 * 3. Bonus: Handle potential errors (e.g., database connection issues).
 */

export async function POST(req: Request) {
  try {
    const body = await readJsonRecord(req);
    const scanId = readOptionalString(body.scanId) ?? DEMO_IDS.scanId;
    const status = readOptionalString(body.status);

    if (status === "completed" && prisma) {
      // TODO: Implement the notification creation logic here
      // example: await prisma.notification.create({ ... })
      
      console.log(`[STUB] Notification triggered for scan ${scanId}`);
      
      return NextResponse.json({ ok: true, message: "Notification triggered" });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notification API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
