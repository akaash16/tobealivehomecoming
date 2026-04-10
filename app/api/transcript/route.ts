import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json(
      { error: "Server is not configured for transcript storage." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { conversation } = body as { conversation?: unknown };

  if (!Array.isArray(conversation) || conversation.length === 0) {
    return NextResponse.json(
      { error: "conversation must be a non-empty array." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("transcripts").insert({
    conversation,
  });

  if (error) {
    console.error("[api/transcript] Supabase insert failed:", error);
    return NextResponse.json(
      { error: "Could not save transcript." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
