import { DEMO_SENDER_VALUES } from "@/lib/demo-constants";

export const SCAN_STATUS_VALUES = ["pending", "completed", "failed"] as const;
export type ScanStatus = (typeof SCAN_STATUS_VALUES)[number];

export type DemoSender = (typeof DEMO_SENDER_VALUES)[number];

export type NotificationDto = {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type ThreadSummaryDto = {
  id: string;
  patientId: string;
  updatedAt: string;
};

export type MessageDto = {
  id: string;
  threadId: string;
  content: string;
  sender: DemoSender;
  createdAt: string;
};

export type ScansFinalizeRequest = {
  status?: unknown;
  images?: unknown;
  scanId?: unknown;
  userId?: unknown;
  clinicUserId?: unknown;
};

export type ScansFinalizeResponse =
  | {
      ok: true;
      created: boolean;
      scan: {
        id: string;
        status: string;
        imagesCount: number;
        createdAt: string;
        updatedAt: string;
      };
      notification: NotificationDto | null;
      notificationCreated: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type NotifyRequest = {
  scanId?: unknown;
  status?: unknown;
  userId?: unknown;
  clinicUserId?: unknown;
};

export type NotifyResponse =
  | {
      ok: true;
      created: boolean;
      notification: NotificationDto;
    }
  | {
      ok: true;
      skipped: true;
      reason: string;
    }
  | {
      ok: false;
      error: string;
    };

export type MessagingHistoryResponse =
  | {
      ok: true;
      thread: ThreadSummaryDto | null;
      messages: MessageDto[];
    }
  | {
      ok: false;
      error: string;
    };

export type MessagingSendRequest = {
  threadId?: unknown;
  patientId?: unknown;
  content?: unknown;
  sender?: unknown;
};

export type MessagingSendResponse =
  | {
      ok: true;
      threadCreated: boolean;
      thread: ThreadSummaryDto;
      message: MessageDto;
      assistantMessage: MessageDto | null;
    }
  | {
      ok: false;
      error: string;
    };

export function toIsoString(value: Date): string {
  return value.toISOString();
}
