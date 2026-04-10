import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { NextResponse } from "next/server";
import path from "path";

import { checkAndRecordApiCall } from "@/lib/rateLimit";

/** Prints everything useful to the terminal when Claude / the route fails. */
function logChatRouteFailure(err: unknown) {
  const details: Record<string, unknown> = {
    errorMessage:
      err instanceof Error ? err.message : typeof err === "string" ? err : String(err),
  };

  if (err instanceof Error && err.stack) {
    details.stack = err.stack;
  }

  if (err instanceof APIError) {
    details.statusCode = err.status;
    details.responseBody = err.error;
    details.requestId = err.requestID ?? null;
    details.apiErrorType = err.type ?? null;
  }

  const cause =
    err instanceof Error && "cause" in err ? (err as Error & { cause?: unknown }).cause : undefined;
  if (cause !== undefined && cause !== null) {
    details.cause =
      cause instanceof Error
        ? { message: cause.message, stack: cause.stack }
        : cause;
  }

  console.log("[api/chat] Request failed — full details:");
  console.log(JSON.stringify(details, null, 2));
}

/**
 * Full guide instructions — edit app/api/chat/guide-system-prompt.txt (not this file).
 * That file includes "How you operate" (e.g. always end with a question or invitation),
 * check-in / "End session" copy, TRIGGER 2, examples, Security, and English-default rules.
 */
const GUIDE_SYSTEM_PROMPT = readFileSync(
  path.join(process.cwd(), "app/api/chat/guide-system-prompt.txt"),
  "utf8"
);

type ApiMessage = { role: string; content: string };

/** Optional client label (e.g. legacy “starting point”). Omitted when empty — base guide prompt only. */
function buildSystemPrompt(entryPoint: unknown): string {
  if (typeof entryPoint === "string" && entryPoint.trim()) {
    const safeLabel = JSON.stringify(entryPoint.trim());
    return `${GUIDE_SYSTEM_PROMPT}

## Session context
The person chose this starting point when they began: ${safeLabel}.`;
  }
  return GUIDE_SYSTEM_PROMPT;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: "The server is not configured with ANTHROPIC_API_KEY." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Expected a JSON object body." },
        { status: 400 }
      );
    }

    const { messages, entryPoint } = body as {
      messages?: unknown;
      entryPoint?: unknown;
    };

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        {
          error:
            "Expected `messages` to be an array of { role, content } objects.",
        },
        { status: 400 }
      );
    }

    const normalized: ApiMessage[] = [];
    for (const item of messages) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof (item as ApiMessage).content !== "string"
      ) {
        return NextResponse.json(
          {
            error:
              "Each message must be an object with string `content` and valid `role`.",
          },
          { status: 400 }
        );
      }
      const role = (item as ApiMessage).role;
      if (role !== "user" && role !== "assistant") {
        return NextResponse.json(
          {
            error: 'Each message `role` must be "user" or "assistant".',
          },
          { status: 400 }
        );
      }
      normalized.push({ role, content: (item as ApiMessage).content });
    }

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "`messages` must include at least one turn." },
        { status: 400 }
      );
    }

    const isSessionStart =
      normalized.length === 1 &&
      normalized[0].role === "user" &&
      normalized[0].content !== "[SESSION_CHECKIN]" &&
      normalized[0].content !== "[SESSION_COMPLETE]";

    const rate = checkAndRecordApiCall(request, isSessionStart);
    if (!rate.ok) {
      return NextResponse.json({ error: rate.message }, { status: 429 });
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildSystemPrompt(entryPoint),
      messages: normalized.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      }
    }
    text = text.trim();

    if (!text) {
      console.log("[api/chat] Model returned no text blocks. Raw response summary:", {
        id: response.id,
        model: response.model,
        role: response.role,
        stopReason: response.stop_reason,
        contentTypes: response.content.map((b) => b.type),
      });
      return NextResponse.json(
        { error: "The model returned no text." },
        { status: 502 }
      );
    }

    return NextResponse.json({ content: text });
  } catch (err) {
    logChatRouteFailure(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Could not complete the conversation right now.",
        detail: message,
      },
      { status: 500 }
    );
  }
}
