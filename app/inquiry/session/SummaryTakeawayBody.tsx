"use client";

import { Fragment } from "react";
import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";

const COACHING_PLACEHOLDER = "[COACHING_CTA]";

/** Markdown mapping tuned for the post-session summary document (## sections, paragraphs, emphasis). */
const summaryComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mb-2 mt-8 border-b border-ember/20 pb-2 text-base font-semibold tracking-tight text-ink first:mt-0 sm:text-lg">
      {children}
    </h2>
  ),
  h1: ({ children }) => (
    <h1 className="mb-2 mt-6 text-lg font-semibold text-ink first:mt-0 sm:text-xl">{children}</h1>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-[0.9375rem] font-semibold text-ink first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-[0.9375rem] leading-[1.75] last:mb-0 sm:text-base sm:leading-[1.7]">
      {children}
    </p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-[1.7] sm:text-base">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-5 text-[0.9375rem] leading-[1.7] sm:text-base">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-[inherit]">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-ember-hover underline decoration-ember/35 underline-offset-2 transition-colors hover:text-ember-deep"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-ember/30 pl-4 text-ink-muted">{children}</blockquote>
  ),
  hr: () => <hr className="my-5 border-ink/[0.1]" />,
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-xl border border-ink/[0.08] bg-canvas-mid/80 p-4 text-[0.85em] leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = typeof className === "string" && className.includes("language-");
    if (isBlock) {
      return (
        <code className={`block font-mono ${className ?? ""}`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-md bg-ink/[0.07] px-1.5 py-0.5 font-mono text-[0.88em]"
        {...props}
      >
        {children}
      </code>
    );
  },
};

function CoachingCtaButton() {
  return (
    <div className="my-6 flex w-full justify-center sm:justify-start">
      <a
        href="#"
        className="inline-flex items-center justify-center rounded-2xl bg-ember-deep px-8 py-3.5 text-center text-base font-semibold tracking-wide text-paper shadow-lift transition-[background-color,transform,box-shadow] duration-[var(--t-hover)] ease-[var(--ease-out-soft)] hover:bg-ember-hover hover:shadow-soft hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember/40"
      >
        Schedule time with Akaash
      </a>
    </div>
  );
}

function SegmentMarkdown({ source }: { source: string }) {
  if (!source.trim()) {
    return null;
  }
  return (
    <div className="min-w-0 text-ink [&_*]:text-inherit">
      <Markdown remarkPlugins={[remarkBreaks]} components={summaryComponents}>
        {source}
      </Markdown>
    </div>
  );
}

/**
 * Renders the API summary: markdown body plus [COACHING_CTA] replaced by a primary CTA control.
 */
export function SummaryTakeawayBody({ source }: { source: string }) {
  const parts = source.split(COACHING_PLACEHOLDER);

  return (
    <div className="space-y-0">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? <CoachingCtaButton /> : null}
          <SegmentMarkdown source={part} />
        </Fragment>
      ))}
    </div>
  );
}
