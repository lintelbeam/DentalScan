type ConversationTurn = {
  sender: string;
  content: string;
};

type AnthropicContentBlock = {
  type: string;
  text?: string;
};

type AnthropicResponse = {
  content?: AnthropicContentBlock[];
  error?: {
    message?: string;
  };
};

const DEFAULT_MODEL = "claude-3-haiku-20240307";
const MAX_CONVERSATION_TURNS = 10;
const FALLBACK_MODELS = ["claude-3-haiku-20240307"] as const;

function toAnthropicRole(sender: string): "user" | "assistant" {
  return sender === "dentist" ? "assistant" : "user";
}

function normalizeReply(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function generateClinicReply(conversation: ConversationTurn[]): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.anthropic_api_key;
  if (!apiKey) {
    return null;
  }

  const preferredModel = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const modelsToTry = Array.from(new Set([preferredModel, ...FALLBACK_MODELS]));

  const normalizedConversation = conversation
    .filter((turn) => turn.content.trim().length > 0)
    .slice(-MAX_CONVERSATION_TURNS)
    .map((turn) => ({
      role: toAnthropicRole(turn.sender),
      content: turn.content.trim(),
    }));

  if (normalizedConversation.length === 0) {
    return null;
  }

  let lastError = "Anthropic API request failed";

  for (const model of modelsToTry) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 220,
        temperature: 0.4,
        system:
          "You are a dental clinic coordinator replying to patients after they submit scans. Keep replies concise, empathetic, and actionable. Do not diagnose. Encourage scheduling or waiting for dentist review.",
        messages: normalizedConversation,
      }),
    });

    const payload = (await response.json()) as AnthropicResponse;
    if (response.ok) {
      const text = payload.content
        ?.filter((block) => block.type === "text" && typeof block.text === "string")
        .map((block) => block.text ?? "")
        .join(" ")
        .trim();

      if (!text) {
        return null;
      }

      return normalizeReply(text);
    }

    const message = payload.error?.message ?? "Anthropic API request failed";
    lastError = message;

    // Model can be unavailable for the account; keep trying fallbacks.
    if (response.status === 404 || message.startsWith("model:")) {
      continue;
    }

    throw new Error(message);
  }

  throw new Error(lastError);
}
