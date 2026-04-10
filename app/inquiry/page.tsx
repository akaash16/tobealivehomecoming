"use client";

import { Cormorant } from "next/font/google";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AtmosphereLayer } from "../components/AtmosphereLayer";

const orientationSerif = Cormorant({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  return EMAIL_RE.test(t);
}

const glassCard =
  "rounded-2xl border border-[rgba(184,149,106,0.15)] bg-[rgba(255,255,255,0.45)] px-8 py-7 backdrop-blur-sm";

const iconCircle =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(184,149,106,0.2)] bg-[rgba(255,255,255,0.7)]";

const numberCol = `${orientationSerif.className} min-w-[32px] shrink-0 text-[22px] font-normal leading-none text-[#B5703B]`;

/**
 * Orientation: centered hero, stacked frosted cards, Begin (email + Start → session).
 */
export default function InquiryPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Checked = send marketing updates (default on). */
  const [marketingUpdates, setMarketingUpdates] = useState(true);
  /** Checked = allow anonymous transcript save; unchecked adds ?noTranscript=1 (default on). */
  const [saveTranscriptAnonymously, setSaveTranscriptAnonymously] =
    useState(true);

  async function handleStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email");
      return;
    }
    setEmailError("");
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          marketingOptIn: marketingUpdates,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSubmitError(
          typeof data.error === "string"
            ? data.error
            : "Something went wrong. Please try again."
        );
        setIsSubmitting(false);
        return;
      }
      const q = saveTranscriptAnonymously ? "" : "?noTranscript=1";
      router.push(`/inquiry/session${q}`);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <AtmosphereLayer variant="orientation" />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <div className="flex flex-col px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16 md:pb-20 md:pt-20">
        <header className="mx-auto mb-12 max-w-xl text-center sm:mb-14 md:mb-16">
          <h1
            className={`${orientationSerif.className} text-[1.75rem] font-medium leading-[1.12] tracking-[-0.02em] text-ink sm:text-[2rem] sm:leading-[1.1]`}
          >
            Before We Begin
          </h1>
          <p className="mx-auto mt-6 max-w-[480px] text-[15px] leading-[1.7] text-[#6B5A48] sm:mt-8 sm:text-base">
            Here&apos;s a quick orientation. This space is designed to help you hear
            yourself differently than you ever have. Often, the issue isn&apos;t that
            we&apos;re not doing enough, but that we aren&apos;t listening to what&apos;s
            already here.
          </p>
        </header>

        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
          <div className={`${glassCard}`}>
            <div className="flex gap-4">
              <span className={numberCol} aria-hidden>
                1.
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="mb-1.5 text-[17px] font-semibold leading-snug text-[#3D2E1F]">
                  Bring whatever&apos;s on your mind.
                </h2>
                <p className="text-[15px] leading-[1.65] text-[#6B5A48]">
                  A decision you&apos;re circling. A feeling you can&apos;t name.
                  Something heavy you&apos;re carrying. You don&apos;t need to have it
                  figured out — that&apos;s what this space is for.
                </p>
              </div>
            </div>
          </div>

          <div className={`${glassCard}`}>
            <div className="flex gap-4">
              <span className={numberCol} aria-hidden>
                2.
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="mb-1.5 text-[17px] font-semibold leading-snug text-[#3D2E1F]">
                  You&apos;ll be asked a few honest questions.
                </h2>
                <p className="text-[15px] leading-[1.65] text-[#6B5A48]">
                  Not to analyze or diagnose — just to help you slow down enough to
                  hear what&apos;s underneath the noise. Answer however feels true.
                  There are no wrong responses.
                </p>
              </div>
            </div>
          </div>

          <div className={`${glassCard}`}>
            <div className="flex gap-4">
              <span className={numberCol} aria-hidden>
                3.
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="mb-1.5 text-[17px] font-semibold leading-snug text-[#3D2E1F]">
                  When you&apos;re done, you&apos;ll get a summary.
                </h2>
                <p className="text-[15px] leading-[1.65] text-[#6B5A48]">
                  A reflection of what came through — what you said, what shifted,
                  and what might be worth sitting with. The whole thing takes about
                  five minutes.
                </p>
              </div>
            </div>
          </div>

          <div className={`${glassCard}`}>
            <div className="flex gap-4">
              <div className={iconCircle} aria-hidden>
                <svg
                  className="h-4 w-4 text-[#6B5A48]"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 8h8.5M9.5 5L13 8l-3.5 3"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="mb-1.5 text-[17px] font-semibold leading-snug text-[#3D2E1F]">
                  Begin
                </h2>
                <p className="text-[15px] leading-[1.65] text-[#6B5A48]">
                  Enter your email and the session will start immediately.
                </p>

                <form
                  onSubmit={handleStart}
                  className="mt-5 flex flex-col gap-3 sm:mt-6"
                  noValidate
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <label htmlFor="inquiry-email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="inquiry-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={email}
                      disabled={isSubmitting}
                      onChange={(ev) => {
                        setEmail(ev.target.value);
                        if (emailError) setEmailError("");
                        if (submitError) setSubmitError("");
                      }}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={
                        emailError ? "inquiry-email-error" : undefined
                      }
                      className="min-h-[50px] w-full flex-1 rounded-xl border border-[rgba(184,149,106,0.2)] bg-[rgba(255,255,255,0.6)] px-[18px] py-[14px] text-[15px] text-[#3D2E1F] shadow-none transition-[border-color,box-shadow] placeholder:text-[#A09382] focus:border-[rgba(181,112,59,0.4)] focus:outline-none focus:ring-1 focus:ring-[rgba(181,112,59,0.15)] disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex min-h-[50px] shrink-0 items-center justify-center rounded-xl bg-ember-deep px-8 py-3 text-sm font-semibold tracking-wide text-paper shadow-soft transition-[background-color,box-shadow,transform] duration-[var(--t-hover)] ease-[var(--ease-out-soft)] hover:bg-ember-hover hover:shadow-lift hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 sm:min-w-[7.5rem] sm:px-10 sm:text-[0.9375rem]"
                    >
                      {isSubmitting ? "Starting…" : "Start"}
                    </button>
                  </div>
                  <div className="mt-4 flex flex-col gap-2.5">
                    <label
                      htmlFor="marketing-updates"
                      className="flex cursor-pointer items-start gap-2.5"
                    >
                      <input
                        id="marketing-updates"
                        type="checkbox"
                        className="peer sr-only"
                        checked={marketingUpdates}
                        onChange={(ev) =>
                          setMarketingUpdates(ev.target.checked)
                        }
                        disabled={isSubmitting}
                      />
                      <span
                        className="peer-checked:[&_.inquiry-check-icon]:opacity-100 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-[rgba(184,149,106,0.3)] bg-[rgba(255,255,255,0.5)] transition-all peer-checked:border-[#B5703B] peer-checked:bg-[#B5703B] peer-disabled:opacity-50"
                        aria-hidden
                      >
                        <svg
                          className="inquiry-check-icon h-2.5 w-2.5 opacity-0 transition-opacity"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M2.5 6l2.5 2.5 5-5"
                            stroke="#fff"
                            strokeWidth="1.85"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="text-[13px] leading-[1.5] text-[#8B7A68]">
                        Please send me occasional updates and resources (we never
                        spam).
                      </span>
                    </label>
                    <label
                      htmlFor="save-transcript-anonymously"
                      className="flex cursor-pointer items-start gap-2.5"
                    >
                      <input
                        id="save-transcript-anonymously"
                        type="checkbox"
                        className="peer sr-only"
                        checked={saveTranscriptAnonymously}
                        onChange={(ev) =>
                          setSaveTranscriptAnonymously(ev.target.checked)
                        }
                        disabled={isSubmitting}
                      />
                      <span
                        className="peer-checked:[&_.inquiry-check-icon]:opacity-100 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-[rgba(184,149,106,0.3)] bg-[rgba(255,255,255,0.5)] transition-all peer-checked:border-[#B5703B] peer-checked:bg-[#B5703B] peer-disabled:opacity-50"
                        aria-hidden
                      >
                        <svg
                          className="inquiry-check-icon h-2.5 w-2.5 opacity-0 transition-opacity"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M2.5 6l2.5 2.5 5-5"
                            stroke="#fff"
                            strokeWidth="1.85"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="text-[13px] leading-[1.5] text-[#8B7A68]">
                        Save my conversation transcript anonymously to help
                        improve the experience for others (your transcript is
                        never linked to your email).
                      </span>
                    </label>
                  </div>
                  {emailError ? (
                    <p
                      id="inquiry-email-error"
                      className="text-sm text-ember-hover sm:text-[0.9375rem]"
                      role="alert"
                    >
                      {emailError}
                    </p>
                  ) : null}
                  {submitError ? (
                    <p
                      className="text-sm text-ember-hover sm:text-[0.9375rem]"
                      role="alert"
                    >
                      {submitError}
                    </p>
                  ) : null}
                </form>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
