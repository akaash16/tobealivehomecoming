"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { AtmosphereLayer } from "../../components/AtmosphereLayer";
import { GuideMessageMarkdown } from "./GuideMessageMarkdown";
import { downloadSessionZip } from "./sessionExport";
import { SummaryTakeawayBody } from "./SummaryTakeawayBody";

/**
 * Chat with Claude. Full API history in apiHistoryRef (includes hidden signals only — no UI-only welcome).
 * End flow: [SESSION_COMPLETE] → closing + feeling check → user replies → chat API (transition only)
 * → then /api/summary → takeaway card + Save session (ZIP: PDF + TXT).
 */

/** Shown on load only; never sent to /api/chat or included in apiHistoryRef. */
const STATIC_WELCOME_ID = "local-guide-welcome";
const STATIC_WELCOME_TEXT =
  "Thanks for being here. Be as open and honest as you can — the more honest you are, the more this will give back to you. The session will last about five minutes before I suggest wrapping up and putting together a summary. Whenever you're ready, share what's on your mind.";

const SESSION_MS = 5 * 60 * 1000;
const SESSION_CHECKIN_TOKEN = "[SESSION_CHECKIN]";
const SESSION_COMPLETE_TOKEN = "[SESSION_COMPLETE]";
const KEEP_GOING_TEXT = "I want to keep going";

/** Max typed / visible user turns before auto session-end (reflection after close can add one more). */
const MAX_USER_MESSAGES = 30;
const MAX_INPUT_CHARS = 2000;
const CHAR_COUNT_VISIBLE_AFTER = 1500;

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "notice"; text: string }
  | {
      id: string;
      role: "guide";
      text: string;
      variant?: "default" | "takeaway";
      takeawayHeading?: string;
      summaryDocument?: boolean;
      /** True for the opening line shown before any API call (not in apiHistoryRef). */
      staticWelcome?: boolean;
    };

type ApiTurn = { role: "user" | "assistant"; content: string };

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function appendApi(ref: { current: ApiTurn[] }, turn: ApiTurn) {
  ref.current = [...ref.current, turn];
}

function createInitialMessages(): ChatMessage[] {
  return [
    {
      id: STATIC_WELCOME_ID,
      role: "guide",
      text: STATIC_WELCOME_TEXT,
      staticWelcome: true,
    },
  ];
}

/** User + guide turns only, for anonymous transcript (excludes welcome, notices, summary). */
function messagesToTranscriptConversation(
  msgs: ChatMessage[]
): { role: "user" | "guide"; text: string }[] {
  const out: { role: "user" | "guide"; text: string }[] = [];
  for (const m of msgs) {
    if (m.role === "user") {
      out.push({ role: "user", text: m.text });
    } else if (m.role === "guide") {
      if (m.staticWelcome) continue;
      out.push({ role: "guide", text: m.text });
    }
  }
  return out;
}

function InquirySessionPage() {
  const searchParams = useSearchParams();
  const noTranscript = searchParams.get("noTranscript") === "1";

  const [messages, setMessages] = useState<ChatMessage[]>(createInitialMessages);
  const [draft, setDraft] = useState("");
  const [isAwaitingReply, setIsAwaitingReply] = useState(false);
  /** After the brief closing message: user can answer "how was that" before we generate the summary. */
  const [awaitingFinalReflection, setAwaitingFinalReflection] = useState(false);
  /** Input hidden and footer shows "Session complete" after the summary (or unrecoverable end). */
  const [sessionFullyClosed, setSessionFullyClosed] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [showEndSession, setShowEndSession] = useState(false);
  const [saveSessionBusy, setSaveSessionBusy] = useState(false);

  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const apiHistoryRef = useRef<ApiTurn[]>([]);
  const isAwaitingReplyRef = useRef(false);
  const timerStartedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkInApiSentRef = useRef(false);
  const sessionClosedRef = useRef(false);
  const pendingCheckInRef = useRef(false);
  /** After 30 user messages we auto-call sendSessionEnd once. */
  const autoEndFromCapRef = useRef(false);

  useEffect(() => {
    isAwaitingReplyRef.current = isAwaitingReply;
  }, [isAwaitingReply]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isAwaitingReply, checkInOpen, sessionFullyClosed, awaitingFinalReflection]);

  async function postChat(apiMessages: ApiTurn[]): Promise<string> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages }),
    });

    const data = (await res.json()) as { content?: string; error?: string };

    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Request failed");
    }

    const reply = typeof data.content === "string" ? data.content.trim() : "";
    if (!reply) {
      throw new Error("Empty response from guide.");
    }
    return reply;
  }

  async function postSummary(apiMessages: ApiTurn[]): Promise<string> {
    const res = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages }),
    });

    const data = (await res.json()) as { content?: string; error?: string };

    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Request failed");
    }

    const summary =
      typeof data.content === "string" ? data.content.trim() : "";
    if (!summary) {
      throw new Error("Empty summary from server.");
    }
    return summary;
  }

  async function sendSessionEnd() {
    if (sessionClosedRef.current) return;
    sessionClosedRef.current = true;
    setCheckInOpen(false);
    setShowEndSession(false);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setIsAwaitingReply(true);
    appendApi(apiHistoryRef, { role: "user", content: SESSION_COMPLETE_TOKEN });
    try {
      const reply = await postChat(apiHistoryRef.current);
      appendApi(apiHistoryRef, { role: "assistant", content: reply });
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "guide",
          text: reply,
        },
      ]);
      setAwaitingFinalReflection(true);
    } catch {
      apiHistoryRef.current = apiHistoryRef.current.slice(0, -1);
      sessionClosedRef.current = false;
      autoEndFromCapRef.current = false;
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "guide",
          text: "The closing didn't quite land — you can try again from the button when you're ready.",
        },
      ]);
    } finally {
      setIsAwaitingReply(false);
    }
  }

  useEffect(() => {
    if (sessionClosedRef.current || sessionFullyClosed) return;
    const userCount = messages.filter((m) => m.role === "user").length;
    if (
      userCount < MAX_USER_MESSAGES ||
      isAwaitingReply ||
      checkInOpen ||
      autoEndFromCapRef.current
    ) {
      return;
    }
    autoEndFromCapRef.current = true;
    void sendSessionEnd();
    // sendSessionEnd only uses refs and setState; omitting avoids re-running every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [messages, isAwaitingReply, checkInOpen, sessionFullyClosed]);

  function flushPendingCheckIn() {
    if (!pendingCheckInRef.current || checkInApiSentRef.current) {
      return;
    }
    if (sessionClosedRef.current) {
      return;
    }
    if (isAwaitingReplyRef.current) return;
    pendingCheckInRef.current = false;
    void runCheckIn();
  }

  function startSessionTimerIfNeeded() {
    if (timerStartedRef.current) return;
    timerStartedRef.current = true;
    timerRef.current = setTimeout(() => {
      pendingCheckInRef.current = true;
      flushPendingCheckIn();
    }, SESSION_MS);
  }

  async function runCheckIn() {
    if (checkInApiSentRef.current) return;
    if (sessionClosedRef.current) return;
    checkInApiSentRef.current = true;
    pendingCheckInRef.current = false;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setIsAwaitingReply(true);
    appendApi(apiHistoryRef, { role: "user", content: SESSION_CHECKIN_TOKEN });
    try {
      const reply = await postChat(apiHistoryRef.current);
      appendApi(apiHistoryRef, { role: "assistant", content: reply });
      setCheckInOpen(true);
    } catch {
      apiHistoryRef.current = apiHistoryRef.current.slice(0, -1);
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "guide",
          text: "That pause didn't quite come through — you can keep chatting, or use Back when you're ready.",
        },
      ]);
    } finally {
      setIsAwaitingReply(false);
    }
  }

  async function handleKeepGoing() {
    if (messages.filter((m) => m.role === "user").length >= MAX_USER_MESSAGES) {
      return;
    }
    setCheckInOpen(false);
    setShowEndSession(true);

    const noticeId = createId();
    const uid = createId();
    appendApi(apiHistoryRef, { role: "user", content: KEEP_GOING_TEXT });
    setMessages((prev) => [
      ...prev,
      { id: noticeId, role: "notice", text: "You chose to keep going" },
      { id: uid, role: "user", text: KEEP_GOING_TEXT },
    ]);
    setIsAwaitingReply(true);
    try {
      const reply = await postChat(apiHistoryRef.current);
      appendApi(apiHistoryRef, { role: "assistant", content: reply });
      setMessages((prev) => [
        ...prev,
        { id: createId(), role: "guide", text: reply },
      ]);
    } catch {
      apiHistoryRef.current = apiHistoryRef.current.slice(0, -1);
      setMessages((prev) => prev.filter((m) => m.id !== uid && m.id !== noticeId));
      setShowEndSession(false);
      setCheckInOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "guide",
          text: "Something slipped — choose Keep going or Wrap it up again when you're ready.",
        },
      ]);
    } finally {
      setIsAwaitingReply(false);
    }
  }

  function handleWrapItUp() {
    setMessages((prev) => [
      ...prev,
      { id: createId(), role: "notice", text: "Wrapping up" },
    ]);
    void sendSessionEnd();
  }

  async function sendFromUser(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isAwaitingReply) {
      return;
    }
    if (sessionFullyClosed || checkInOpen) {
      return;
    }

    const userMessageCount = messages.filter((m) => m.role === "user").length;
    if (!awaitingFinalReflection && userMessageCount >= MAX_USER_MESSAGES) {
      return;
    }

    if (awaitingFinalReflection) {
      const uid = createId();
      appendApi(apiHistoryRef, { role: "user", content: trimmed });
      setMessages((prev) => [...prev, { id: uid, role: "user", text: trimmed }]);
      setDraft("");
      setIsAwaitingReply(true);
      try {
        const transition = await postChat(apiHistoryRef.current);
        appendApi(apiHistoryRef, { role: "assistant", content: transition });
        setMessages((prev) => [
          ...prev,
          { id: createId(), role: "guide", text: transition },
        ]);

        try {
          const summaryText = await postSummary(apiHistoryRef.current);
          setMessages((prev) => {
            if (!noTranscript) {
              const conversation = messagesToTranscriptConversation(prev);
              if (conversation.length > 0) {
                void fetch("/api/transcript", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ conversation }),
                })
                  .then(async (res) => {
                    if (!res.ok) {
                      let detail: unknown;
                      try {
                        detail = await res.json();
                      } catch {
                        detail = await res.text();
                      }
                      console.error("[transcript] save failed:", res.status, detail);
                    }
                  })
                  .catch((err) => console.error("[transcript] save failed:", err));
              }
            }
            return [
              ...prev,
              {
                id: createId(),
                role: "guide",
                text: summaryText,
                variant: "takeaway",
                takeawayHeading: "Your session summary",
                summaryDocument: true,
              },
            ];
          });
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: createId(),
              role: "guide",
              text: "The written summary didn't quite come through — what you shared above is still here. You can save a transcript of the conversation from the button below.",
              variant: "takeaway",
              takeawayHeading: "Session note",
            },
          ]);
        }

        setAwaitingFinalReflection(false);
        setSessionFullyClosed(true);
      } catch {
        apiHistoryRef.current = apiHistoryRef.current.slice(0, -1);
        setMessages((prev) => prev.filter((m) => m.id !== uid));
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "guide",
            text: "Something didn't quite connect — when you're ready, you can try sending your reply again.",
          },
        ]);
      } finally {
        setIsAwaitingReply(false);
      }
      return;
    }

    startSessionTimerIfNeeded();

    const uid = createId();
    appendApi(apiHistoryRef, { role: "user", content: trimmed });
    setMessages((prev) => [...prev, { id: uid, role: "user", text: trimmed }]);
    setDraft("");
    setIsAwaitingReply(true);

    try {
      const reply = await postChat(apiHistoryRef.current);
      appendApi(apiHistoryRef, { role: "assistant", content: reply });
      setMessages((prev) => [
        ...prev,
        { id: createId(), role: "guide", text: reply },
      ]);
    } catch {
      apiHistoryRef.current = apiHistoryRef.current.slice(0, -1);
      setMessages((prev) => prev.filter((m) => m.id !== uid));
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "guide",
          text: "Something didn't quite connect that time — it happens. When you feel ready, you can try sending again.",
        },
      ]);
    } finally {
      setIsAwaitingReply(false);
      flushPendingCheckIn();
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void sendFromUser(draft);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendFromUser(draft);
    }
  }

  async function handleSaveSession() {
    if (saveSessionBusy) return;
    setSaveSessionBusy(true);
    try {
      await downloadSessionZip(messages);
    } catch (err) {
      console.error(err);
    } finally {
      setSaveSessionBusy(false);
    }
  }

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const inputLocked =
    sessionFullyClosed ||
    checkInOpen ||
    isAwaitingReply ||
    (userMessageCount >= MAX_USER_MESSAGES && !awaitingFinalReflection);

  return (
    <div className="relative flex h-dvh w-full min-h-0 min-w-0 max-w-[100vw] flex-col overflow-x-hidden overflow-y-hidden">
      <AtmosphereLayer variant="session" />
      {showEndSession && !sessionFullyClosed && (
        <button
          type="button"
          onClick={() => void sendSessionEnd()}
          disabled={isAwaitingReply}
          className="fixed right-4 top-[5.25rem] z-40 rounded-full border border-ink/[0.1] bg-paper/95 px-4 py-2 text-xs font-medium text-ink-muted shadow-soft backdrop-blur-sm transition-[background-color,border-color,color,opacity] duration-[var(--t-hover)] ease-[var(--ease-out-soft)] hover:border-ember/25 hover:bg-ember-mist/50 hover:text-ink disabled:pointer-events-none disabled:opacity-50 sm:right-10 sm:top-[5.5rem] sm:text-sm"
        >
          End session
        </button>
      )}

      <header className="relative z-30 flex shrink-0 items-center justify-between gap-4 border-b border-ink/[0.08] bg-canvas/90 px-4 py-5 backdrop-blur-md sm:px-10">
        <p className="min-w-0 flex-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-faint sm:tracking-[0.2em]">
          Homecoming
        </p>
        <Link
          href="/inquiry"
          className="shrink-0 rounded-2xl border border-ink/[0.08] bg-paper/90 px-4 py-2.5 text-xs font-semibold tracking-wide text-ink transition-[background-color,border-color,box-shadow,transform] duration-[var(--t-hover)] ease-[var(--ease-out-soft)] hover:border-ember/28 hover:bg-ember-mist/60 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember/30 sm:text-sm"
        >
          Back
        </Link>
      </header>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-10 sm:px-10 sm:py-12">
          <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-5 pb-6">
            {messages.map((m) =>
              m.role === "notice" ? (
                <p
                  key={m.id}
                  className="chat-message-enter px-2 py-2 text-center text-xs leading-relaxed text-ink-muted/90 sm:text-sm"
                >
                  {m.text}
                </p>
              ) : (
                <div
                  key={m.id}
                  className={`chat-message-enter flex flex-col gap-3 ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[min(88%,28rem)] rounded-2xl rounded-br-md border border-ember/20 bg-bubble-user px-5 py-3.5 text-[0.9375rem] leading-[1.65] text-ink shadow-soft sm:px-6 sm:py-4 sm:text-base"
                        : m.variant === "takeaway"
                          ? m.summaryDocument
                            ? "max-w-[min(96%,42rem)] rounded-[1.35rem] border-2 border-ember/40 bg-gradient-to-b from-paper via-paper to-ember-mist/50 px-7 py-7 text-[0.9375rem] leading-[1.7] text-ink shadow-lift ring-2 ring-ember/10 sm:px-10 sm:py-9 sm:text-base"
                            : "max-w-[min(92%,36rem)] rounded-2xl rounded-bl-md border-2 border-ember/20 bg-ember-mist/35 px-6 py-5 text-[0.9375rem] leading-[1.7] text-ink shadow-soft ring-1 ring-ink/[0.05] sm:px-7 sm:py-6 sm:text-base"
                          : "max-w-[min(92%,32rem)] rounded-2xl rounded-bl-md border border-ink/[0.07] bg-bubble-guide px-5 py-3.5 text-[0.9375rem] leading-[1.65] text-ink shadow-soft sm:px-6 sm:py-4 sm:text-base"
                    }
                  >
                    {m.role === "guide" && m.variant === "takeaway" && (
                      <p
                        className={
                          m.summaryDocument
                            ? "mb-5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-ember-hover sm:mb-6"
                            : "mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ember-hover"
                        }
                      >
                        {m.takeawayHeading ?? "Summary"}
                      </p>
                    )}
                    {m.role === "user" ? (
                      <div className="whitespace-pre-wrap">{m.text}</div>
                    ) : m.variant === "takeaway" && m.summaryDocument ? (
                      <SummaryTakeawayBody source={m.text} />
                    ) : (
                      <GuideMessageMarkdown source={m.text} />
                    )}
                  </div>
                  {m.role === "guide" && m.variant === "takeaway" && (
                    <button
                      type="button"
                      onClick={() => void handleSaveSession()}
                      disabled={saveSessionBusy}
                      className="chat-message-enter ml-0 rounded-2xl border border-ink/[0.1] bg-paper px-4 py-2.5 text-sm font-semibold text-ink transition-[background-color,border-color] duration-[var(--t-hover)] ease-[var(--ease-out-soft)] hover:border-ember/30 hover:bg-ember-mist/40 disabled:pointer-events-none disabled:opacity-50 sm:ml-1"
                    >
                      {saveSessionBusy ? "Preparing…" : "Save session"}
                    </button>
                  )}
                </div>
              )
            )}

            {checkInOpen && (
              <div className="chat-message-enter flex flex-col gap-4 sm:gap-5">
                <div className="max-w-[min(92%,32rem)] rounded-2xl rounded-bl-md border border-ink/[0.07] bg-bubble-guide px-5 py-3.5 text-[0.9375rem] leading-[1.65] text-ink shadow-soft sm:px-6 sm:py-4 sm:text-base">
                  Before we keep going — we&apos;ve been here for a few minutes.
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <button
                    type="button"
                    disabled={isAwaitingReply}
                    onClick={() => void handleKeepGoing()}
                    className="rounded-2xl bg-ember-deep px-5 py-2.5 text-sm font-semibold text-paper shadow-soft transition-[background-color,transform] duration-[var(--t-hover)] ease-[var(--ease-out-soft)] hover:bg-ember-hover disabled:pointer-events-none disabled:opacity-40"
                  >
                    Keep going
                  </button>
                  <button
                    type="button"
                    disabled={isAwaitingReply}
                    onClick={() => handleWrapItUp()}
                    className="rounded-2xl border border-ink/[0.12] bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition-[background-color,border-color] duration-[var(--t-hover)] ease-[var(--ease-out-soft)] hover:border-ember/28 hover:bg-ember-mist/40 disabled:pointer-events-none disabled:opacity-40"
                  >
                    Wrap it up
                  </button>
                </div>
              </div>
            )}

            {isAwaitingReply && (
              <div className="chat-message-enter flex justify-start" aria-live="polite">
                <div
                  className="max-w-[min(92%,32rem)] rounded-2xl rounded-bl-md border border-ink/[0.07] bg-bubble-guide px-5 py-4 shadow-soft sm:px-6 sm:py-5"
                  aria-busy="true"
                >
                  <span className="sr-only">The guide is responding</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full bg-ink/25 animate-pulse"
                      style={{ animationDuration: "1.2s" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-ink/20 animate-pulse [animation-delay:150ms]"
                      style={{ animationDuration: "1.2s" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-ink/15 animate-pulse [animation-delay:300ms]"
                      style={{ animationDuration: "1.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div
              ref={scrollAnchorRef}
              aria-hidden="true"
              className="h-px w-full shrink-0"
            />
          </div>
        </div>

        <div className="shrink-0 w-full min-w-0 border-t border-ink/[0.08] bg-sand/95 px-4 py-6 backdrop-blur-md sm:px-10 sm:py-7">
          <div className="mx-auto w-full min-w-0 max-w-2xl">
            {!sessionFullyClosed ? (
              <form
                onSubmit={handleSubmit}
                className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor="session-message" className="sr-only">
                    Your message
                  </label>
                  <textarea
                    id="session-message"
                    cols={1}
                    value={draft}
                    onChange={(e) =>
                      setDraft(e.target.value.slice(0, MAX_INPUT_CHARS))
                    }
                    onKeyDown={handleKeyDown}
                    placeholder="What's on your mind?"
                    rows={2}
                    maxLength={MAX_INPUT_CHARS}
                    disabled={inputLocked}
                    style={{ width: "100%", minWidth: 0 }}
                    className="min-h-[3.25rem] min-w-0 w-full max-w-full resize-y rounded-2xl border border-ink/[0.08] bg-paper px-5 py-3.5 text-[0.9375rem] leading-[1.65] text-ink shadow-inner transition-[border-color,box-shadow] duration-[var(--t-hover)] ease-[var(--ease-out-soft)] placeholder:text-ink-faint focus:border-ember/35 focus:outline-none focus:ring-2 focus:ring-ember-mist disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[3.5rem] sm:text-base"
                  />
                  {draft.length > CHAR_COUNT_VISIBLE_AFTER ? (
                    <p className="text-right text-[0.7rem] tabular-nums text-ink-faint sm:text-xs">
                      {draft.length.toLocaleString()} /{" "}
                      {MAX_INPUT_CHARS.toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={!draft.trim() || inputLocked}
                  className="inline-flex h-12 w-full min-w-0 shrink-0 items-center justify-center rounded-2xl bg-ember-deep px-10 text-sm font-semibold tracking-wide text-paper shadow-soft transition-[background-color,opacity,transform,box-shadow] duration-[var(--t-hover)] ease-[var(--ease-out-soft)] hover:bg-ember-hover hover:shadow-lift hover:-translate-y-0.5 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-35 sm:h-[3.5rem] sm:w-auto sm:self-stretch sm:px-12"
                >
                  Send
                </button>
              </form>
            ) : (
              <div className="py-6 text-center sm:py-8">
                <p className="text-sm leading-relaxed text-ink-muted sm:text-base sm:whitespace-nowrap">
                  Thanks for being here. This conversation is yours to keep.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** useSearchParams requires Suspense in the App Router during static generation. */
export default function InquirySessionPageWithSuspense() {
  return (
    <Suspense fallback={null}>
      <InquirySessionPage />
    </Suspense>
  );
}
