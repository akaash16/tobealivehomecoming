import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { checkAndRecordApiCall } from "@/lib/rateLimit";

const SUMMARY_SYSTEM = `You are summarizing a guided self-inquiry conversation. The user came in with something on their mind and was asked reflective questions by a guide. Your job is to create a warm, specific, substantive summary.

Always speak directly to the user in second person — 'you', never 'they' or 'the user'.

Format your response in markdown with these exact sections:

## Your Situation
One or two sentences about what the person brought to the session. Be specific — use their words where possible.

## What Emerged Today
The key themes, realizations, or shifts that happened during the conversation. Reference what the person actually said. Don't use generic language. If they said 'I realized I'm scared of being seen,' say that.

## The Central Pattern
This should be concise and simple. In 2-3 sentences, name the core pattern or dynamic at play. What is actually going on underneath everything they shared? You can speak to identity-level observations here if appropriate — how they see themselves, what beliefs are operating, what they're protecting or avoiding. Keep it clean and direct.

## Next Steps
Write a warm, personal closing. Use something along these lines (adjust to feel natural with the rest of the summary):

'This experience was made with love by Akaash. He has spent his life exploring what it means to truly be alive — understanding his own patterns, sitting with hard truths, and learning how to come home to himself. He wants to share what he's learned with you, so you too can feel like life is vibrant and unlimited. If something opened up here that you want to explore further, you can schedule time with him for coaching.'

After that paragraph, on its own line, write exactly this:
[COACHING_CTA]

Do not include any greeting or closing outside of these sections. Just the four sections.`;

function logSummaryFailure(err: unknown) {
  const details: Record<string, unknown> = {
    errorMessage:
      err instanceof Error ? err.message : typeof err === "string" ? err : String(err),
  };
  if (err instanceof Error && err.stack) details.stack = err.stack;
  if (err instanceof APIError) {
    details.statusCode = err.status;
    details.responseBody = err.error;
    details.requestId = err.requestID ?? null;
  }
  console.log("[api/summary] Request failed — full details:");
  console.log(JSON.stringify(details, null, 2));
}

type ApiMessage = { role: string; content: string };

/** Anthropic requires the final message in `messages` to be from the user before the model replies. */
const SUMMARY_REQUEST_USER_TURN = {
  role: "user" as const,
  content: "Please generate the session summary now.",
};

const SUMMARY_MODEL = "claude-sonnet-4-6";

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

    const { messages } = body as { messages?: unknown };
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

    const rate = checkAndRecordApiCall(request, false);
    if (!rate.ok) {
      return NextResponse.json({ error: rate.message }, { status: 429 });
    }

    const anthropic = new Anthropic({ apiKey });

    const threadMessages = normalized.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const last = threadMessages[threadMessages.length - 1];
    const messagesForApi =
      last?.role === "assistant"
        ? [...threadMessages, SUMMARY_REQUEST_USER_TURN]
        : threadMessages;

    const response = await anthropic.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 4096,
      system: SUMMARY_SYSTEM,
      messages: messagesForApi,
    });

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      }
    }
    text = text.trim();

    if (!text) {
      return NextResponse.json(
        { error: "The model returned no text." },
        { status: 502 }
      );
    }

    return NextResponse.json({ content: text });
  } catch (err) {
    logSummaryFailure(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Could not generate the summary right now.",
        detail: message,
      },
      { status: 500 }
    );
  }
}
