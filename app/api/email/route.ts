import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json(
      { error: "Server is not configured for email signup." },
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

  const { email, marketingOptIn } = body as {
    email?: unknown;
    marketingOptIn?: unknown;
  };

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  let marketing = true;
  if (marketingOptIn === false) {
    marketing = false;
  } else if (marketingOptIn === true) {
    marketing = true;
  } else if (marketingOptIn !== undefined) {
    return NextResponse.json(
      { error: "marketingOptIn must be a boolean when provided." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("emails").insert({
    email: trimmed,
    marketing_opt_in: marketing,
  });

  if (error) {
    console.error("[api/email] Supabase insert failed:", error);
    return NextResponse.json(
      { error: "Could not save your email. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
