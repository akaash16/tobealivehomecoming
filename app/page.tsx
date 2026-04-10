import Link from "next/link";
import { Cormorant } from "next/font/google";

import { AtmosphereLayer } from "./components/AtmosphereLayer";

const landingSerif = Cormorant({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

/**
 * Landing — hero: serif title, tagline, outline CTA, trust row.
 */
export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <AtmosphereLayer variant="landing" />
      <div className="relative z-10 flex min-h-dvh flex-col px-8 pb-16 pt-16 sm:px-10 sm:pb-20 sm:pt-20">
        <main className="flex w-full flex-1 flex-col items-center justify-center text-center">
          <div className="flex max-w-xl flex-col items-center">
            <h1
              className={`${landingSerif.className} mb-4 text-center text-ink sm:mb-5`}
            >
              <span className="block text-[2rem] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[2.5rem] sm:leading-[1.06]">
                To Be Alive
              </span>
              <span className="mt-1 block text-[2.35rem] font-medium leading-[1.08] tracking-[-0.02em] sm:mt-0 sm:text-[3rem] sm:leading-[1.05]">
                Homecoming
              </span>
            </h1>

            <p className="max-w-md text-[0.9375rem] leading-[1.75] text-ink-muted sm:text-lg sm:leading-[1.8]">
              You already know more than you think.
              <br />
              This is a space to hear it.
            </p>

            <div className="mt-7 sm:mt-8">
              <Link
                href="/inquiry"
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full border border-[#C4775A] bg-paper/50 px-7 py-3 text-sm font-semibold tracking-wide text-ink shadow-soft backdrop-blur-[2px] transition-[background-color,border-color,box-shadow,transform,color] duration-[var(--t-hover)] ease-[var(--ease-out-soft)] hover:border-[#B5703B] hover:bg-paper/80 hover:shadow-lift hover:-translate-y-0.5 active:translate-y-0 sm:min-h-[3.25rem] sm:px-9 sm:text-[0.9375rem]"
              >
                <svg
                  className="h-[1.05rem] w-[1.05rem] shrink-0 text-[#B5703B]"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.1" />
                  <circle cx="10" cy="10" r="4.5" stroke="currentColor" strokeWidth="1.1" />
                  <circle cx="10" cy="10" r="1.2" fill="currentColor" />
                </svg>
                Begin the inquiry.
              </Link>
            </div>

            <ul
              className="mt-11 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-ink-muted sm:text-[0.8125rem]"
              aria-label="Session details"
            >
              <li className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 shrink-0 text-[#8B6914]/85"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.35" />
                  <path
                    d="M12 7v5l3.5 2"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>~10 min</span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 shrink-0 text-[#8B6914]/85"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.35" />
                </svg>
                <span>Private</span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 shrink-0 text-[#8B6914]/85"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M6 12.5l4 4 8-9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Free</span>
              </li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
