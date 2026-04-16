import { NextResponse } from "next/server";
import { DEMO_IDS, DEMO_SENDER_VALUES } from "@/lib/demo-constants";
import { prisma } from "@/lib/prisma";
import {
  isAllowedValue,
  readJsonRecord,
  readOptionalString,
} from "@/lib/request-validation";

/**
 * CHALLENGE: MESSAGING SYSTEM
 * 
 * Your goal is to build a basic communication channel between the Patient and Dentist.
 * 1. Implement the POST handler to save a new message into a Thread.
 * 2. Implement the GET handler to retrieve message history for a given thread.
 * 3. Focus on data integrity and proper relations.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = readOptionalString(searchParams.get("threadId"));

  if (!threadId) {
    return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
  }

  // TODO: Fetch messages for this thread
  const messages = [];
  if (prisma) {
    // fetch from prisma
  }

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  try {
    const body = await readJsonRecord(req);
    const threadId = readOptionalString(body.threadId) ?? DEMO_IDS.threadId;
    const content = readOptionalString(body.content);
    const senderCandidate = readOptionalString(body.sender);
    const sender = isAllowedValue(senderCandidate, DEMO_SENDER_VALUES)
      ? senderCandidate
      : "patient";

    // TODO: Save message to database
    if (prisma) {
      // save with prisma
    }
    console.log(`[STUB] New message in thread ${threadId}: ${content ?? "(empty)"} (${sender})`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Messaging API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
