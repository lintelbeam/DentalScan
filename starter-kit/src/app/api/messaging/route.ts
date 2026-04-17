import { NextResponse } from "next/server";
import {
  type DemoSender,
  type MessageDto,
  type MessagingHistoryResponse,
  type MessagingSendRequest,
  type MessagingSendResponse,
  type ThreadSummaryDto,
  toIsoString,
} from "@/lib/api-contracts";
import { DEMO_IDS, DEMO_SENDER_VALUES } from "@/lib/demo-constants";
import { generateClinicReply } from "@/lib/anthropic-messaging";
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

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ResolvedThread = {
  id: string;
  patientId: string;
};

type PersistedMessage = {
  id: string;
  threadId: string;
  content: string;
  sender: string;
  createdAt: Date;
};

function normalizeSender(sender: string): DemoSender {
  return sender === "dentist" ? "dentist" : "patient";
}

function toThreadSummaryDto(thread: {
  id: string;
  patientId: string;
  updatedAt: Date;
}): ThreadSummaryDto {
  return {
    id: thread.id,
    patientId: thread.patientId,
    updatedAt: toIsoString(thread.updatedAt),
  };
}

function toMessageDto(message: PersistedMessage): MessageDto {
  return {
    id: message.id,
    threadId: message.threadId,
    content: message.content,
    sender: normalizeSender(message.sender),
    createdAt: toIsoString(message.createdAt),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = readOptionalString(searchParams.get("threadId"));
  const patientId = readOptionalString(searchParams.get("patientId"));

  if (!threadId && !patientId) {
    return NextResponse.json<MessagingHistoryResponse>(
      { ok: false, error: "Provide either threadId or patientId" },
      { status: 400 }
    );
  }

  try {
    if (threadId) {
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!thread) {
        return NextResponse.json<MessagingHistoryResponse>({ ok: false, error: "Thread not found" }, { status: 404 });
      }

      if (patientId && thread.patientId !== patientId) {
        return NextResponse.json<MessagingHistoryResponse>(
          { ok: false, error: "threadId does not belong to the provided patientId" },
          { status: 409 }
        );
      }

      return NextResponse.json<MessagingHistoryResponse>({
        ok: true,
        thread: toThreadSummaryDto(thread),
        messages: thread.messages.map(toMessageDto),
      });
    }

    if (!patientId) {
      return NextResponse.json<MessagingHistoryResponse>(
        { ok: false, error: "Provide either threadId or patientId" },
        { status: 400 }
      );
    }

    const resolvedPatientId = patientId;
    const thread = await prisma.thread.findFirst({
      where: { patientId: resolvedPatientId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!thread) {
      return NextResponse.json<MessagingHistoryResponse>({
        ok: true,
        thread: null,
        messages: [],
      });
    }

    return NextResponse.json<MessagingHistoryResponse>({
      ok: true,
      thread: toThreadSummaryDto(thread),
      messages: thread.messages.map(toMessageDto),
    });
  } catch (err) {
    console.error("Messaging GET API Error:", err);
    return NextResponse.json<MessagingHistoryResponse>({ ok: false, error: "Failed to load message history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: MessagingSendRequest;

  try {
    body = (await readJsonRecord(req)) as MessagingSendRequest;
  } catch {
    return NextResponse.json<MessagingSendResponse>({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const threadId = readOptionalString(body.threadId);
    const patientId = readOptionalString(body.patientId) ?? DEMO_IDS.patientId;
    const content = readOptionalString(body.content);
    const senderCandidate = readOptionalString(body.sender);
    const sender: DemoSender = isAllowedValue(senderCandidate, DEMO_SENDER_VALUES)
      ? senderCandidate
      : "patient";

    if (!content) {
      return NextResponse.json<MessagingSendResponse>({ ok: false, error: "content is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let resolvedThread: ResolvedThread | null = null;
      let threadCreated = false;

      if (threadId) {
        const existingThread = await tx.thread.findUnique({
          where: { id: threadId },
          select: {
            id: true,
            patientId: true,
          },
        });

        if (existingThread) {
          if (existingThread.patientId !== patientId) {
            throw new HttpError(409, "threadId does not belong to the provided patientId");
          }
          resolvedThread = existingThread;
        } else {
          const createdThread = await tx.thread.create({
            data: {
              id: threadId,
              patientId,
            },
            select: {
              id: true,
              patientId: true,
            },
          });
          resolvedThread = createdThread;
          threadCreated = true;
        }
      } else {
        const existingThread = await tx.thread.findFirst({
          where: { patientId },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            patientId: true,
          },
        });

        if (existingThread) {
          resolvedThread = existingThread;
        } else {
          const createdThread = await tx.thread.create({
            data: {
              patientId,
            },
            select: {
              id: true,
              patientId: true,
            },
          });
          resolvedThread = createdThread;
          threadCreated = true;
        }
      }

      if (!resolvedThread) {
        throw new HttpError(500, "Unable to resolve messaging thread");
      }

      const message = await tx.message.create({
        data: {
          threadId: resolvedThread.id,
          content,
          sender,
        },
      });

      const updatedThread = await tx.thread.update({
        where: { id: resolvedThread.id },
        data: { patientId: resolvedThread.patientId },
        select: {
          id: true,
          patientId: true,
          updatedAt: true,
        },
      });

      return { message, thread: updatedThread, threadCreated };
    });

    let assistantMessage: PersistedMessage | null = null;

    if (sender === "patient") {
      try {
        const history = await prisma.message.findMany({
          where: { threadId: result.thread.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            sender: true,
            content: true,
          },
        });

        const aiReply = await generateClinicReply(history.reverse());

        if (aiReply) {
          assistantMessage = await prisma.$transaction(async (tx) => {
            const createdAssistantMessage = await tx.message.create({
              data: {
                threadId: result.thread.id,
                sender: "dentist",
                content: aiReply,
              },
            });

            await tx.thread.update({
              where: { id: result.thread.id },
              data: { patientId: result.thread.patientId },
            });

            return createdAssistantMessage;
          });
        }
      } catch (assistantError) {
        console.error("Anthropic reply generation failed:", assistantError);
      }
    }

    return NextResponse.json<MessagingSendResponse>(
      {
        ok: true,
        threadCreated: result.threadCreated,
        thread: toThreadSummaryDto(result.thread),
        message: toMessageDto(result.message),
        assistantMessage: assistantMessage ? toMessageDto(assistantMessage) : null,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json<MessagingSendResponse>({ ok: false, error: err.message }, { status: err.status });
    }

    console.error("Messaging API Error:", err);
    return NextResponse.json<MessagingSendResponse>({ ok: false, error: "Failed to send message" }, { status: 500 });
  }
}
