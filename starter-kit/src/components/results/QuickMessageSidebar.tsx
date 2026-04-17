"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, SendHorizontal } from "lucide-react";
import { DEMO_IDS } from "@/lib/demo-constants";

type ThreadSummary = {
  id: string;
  patientId: string;
  updatedAt: string;
};

type MessageItem = {
  id: string;
  threadId: string;
  content: string;
  sender: string;
  createdAt: string;
  pending?: boolean;
};

type MessagingHistoryResponse = {
  ok?: boolean;
  error?: string;
  thread?: ThreadSummary | null;
  messages?: MessageItem[];
};

type MessagingSendResponse = {
  ok?: boolean;
  error?: string;
  thread?: ThreadSummary;
  message?: MessageItem;
  assistantMessage?: MessageItem | null;
};

export default function QuickMessageSidebar({
  patientId = DEMO_IDS.patientId,
  initialThreadId,
}: {
  patientId?: string;
  initialThreadId?: string;
}) {
  const [thread, setThread] = useState<ThreadSummary | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [historyError, setHistoryError] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "error">("idle");
  const [sendError, setSendError] = useState("");
  const [retryContent, setRetryContent] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryStatus("loading");
    setHistoryError("");

    try {
      const requestThreadId = thread?.id ?? initialThreadId;
      const query = requestThreadId
        ? `threadId=${encodeURIComponent(requestThreadId)}`
        : `patientId=${encodeURIComponent(patientId)}`;
      const response = await fetch(`/api/messaging?${query}`, { cache: "no-store" });
      const payload = (await response.json()) as MessagingHistoryResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to load messages");
      }

      setThread(payload.thread ?? null);
      setMessages(payload.messages ?? []);
      setHistoryStatus("ready");
    } catch (error) {
      setHistoryStatus("error");
      setHistoryError(error instanceof Error ? error.message : "Unable to load messages");
    }
  }, [initialThreadId, patientId, thread?.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const canSend = useMemo(
    () => sendStatus !== "sending" && draft.trim().length > 0,
    [draft, sendStatus]
  );

  const sendMessage = useCallback(
    async (overrideContent?: string) => {
      const content = (overrideContent ?? draft).trim();

      if (!content || sendStatus === "sending") {
        return;
      }

      const optimisticId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const optimisticMessage: MessageItem = {
        id: optimisticId,
        threadId: thread?.id ?? "pending",
        content,
        sender: "patient",
        createdAt: new Date().toISOString(),
        pending: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setDraft("");
      setSendStatus("sending");
      setSendError("");
      setRetryContent(null);

      try {
        const response = await fetch("/api/messaging", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            threadId: thread?.id,
            patientId,
            content,
            sender: "patient",
          }),
        });

        const payload = (await response.json()) as MessagingSendResponse;

        if (!response.ok || !payload.ok || !payload.message || !payload.thread) {
          throw new Error(payload.error ?? "Failed to send message");
        }

        setThread(payload.thread);
        setMessages((prev) => {
          const reconciled = prev.map((item) => (item.id === optimisticId ? payload.message! : item));
          if (!payload.assistantMessage) {
            return reconciled;
          }
          return [...reconciled, payload.assistantMessage];
        });
        setSendStatus("idle");
      } catch (error) {
        setMessages((prev) => prev.filter((item) => item.id !== optimisticId));
        setSendStatus("error");
        setSendError(error instanceof Error ? error.message : "Failed to send message");
        setRetryContent(content);
        setDraft((currentDraft) => (currentDraft.length > 0 ? currentDraft : content));
      }
    },
    [draft, patientId, sendStatus, thread?.id]
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void sendMessage();
    },
    [sendMessage]
  );

  const handleDraftKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing || event.key !== "Enter") {
        return;
      }

      const sendWithModifier = event.ctrlKey || event.metaKey;
      const sendWithEnter = !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;

      if (!sendWithModifier && !sendWithEnter) {
        return;
      }

      event.preventDefault();
      if (canSend) {
        void sendMessage();
      }
    },
    [canSend, sendMessage]
  );

  return (
    <aside className="w-full rounded-xl border border-zinc-800 bg-zinc-950/95 p-4 text-zinc-100">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-200">Quick Message</h2>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          {thread ? `Thread ${thread.id.slice(0, 8)}` : "No thread yet"}
        </span>
      </div>

      <div className="quick-message-scrollbar mb-3 h-72 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        {historyStatus === "loading" && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading messages...
          </div>
        )}

        {historyStatus === "error" && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-red-300">{historyError}</p>
            <button
              type="button"
              onClick={() => {
                void loadHistory();
              }}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-600 px-3 py-2 text-xs hover:bg-zinc-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Loading
            </button>
          </div>
        )}

        {historyStatus === "ready" && messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center text-sm text-zinc-500">
            No messages yet. Ask the clinic a question.
          </div>
        )}

        {historyStatus === "ready" && messages.length > 0 && (
          <ul className="space-y-2">
            {messages.map((message) => {
              const isPatient = message.sender === "patient";

              return (
                <li key={message.id} className={`flex ${isPatient ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-lg px-3 py-2 text-sm ${
                      isPatient ? "bg-blue-500 text-white" : "bg-zinc-800 text-zinc-100"
                    } ${message.pending ? "opacity-70" : ""}`}
                  >
                    <p>{message.content}</p>
                    <p className="mt-1 text-[10px] text-white/80">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {message.pending ? " · sending..." : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {sendStatus === "error" && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
          <p>{sendError}</p>
          {retryContent && (
            <button
              type="button"
              onClick={() => {
                void sendMessage(retryContent);
              }}
              className="mt-2 inline-flex items-center gap-1 rounded border border-red-400/60 px-2 py-1 hover:bg-red-500/20"
            >
              <RefreshCw className="h-3 w-3" />
              Retry send
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="quick-message" className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Message to clinic
        </label>
        <textarea
          id="quick-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleDraftKeyDown}
          placeholder="Write a short note for your dentist..."
          rows={3}
          aria-describedby="quick-message-shortcuts"
          aria-keyshortcuts="Enter,Control+Enter,Meta+Enter"
          className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <p id="quick-message-shortcuts" className="text-[11px] text-zinc-500">
          Enter sends. Shift+Enter adds a new line. Ctrl+Enter (or Cmd+Enter) also sends.
        </p>
        <button
          type="submit"
          disabled={!canSend}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            canSend ? "bg-blue-500 text-white hover:bg-blue-400" : "cursor-not-allowed bg-zinc-700 text-zinc-400"
          }`}
        >
          {sendStatus === "sending" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <SendHorizontal className="h-4 w-4" />
              Send Message
            </>
          )}
        </button>
      </form>
    </aside>
  );
}
