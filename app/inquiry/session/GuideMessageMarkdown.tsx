"use client";

import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";

/**
 * Renders guide chat text as Markdown while matching the session bubble typography
 * (size, line height, ink color). User bubbles stay plain text in the parent page.
 */
const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 leading-[inherit] last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-2 list-disc pl-5 last:mb-0 [&>li]:mt-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal pl-5 last:mb-0 [&>li]:mt-1">{children}</ol>
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
    <blockquote className="my-2 border-l-2 border-ember/25 pl-3 text-ink-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-ink/[0.12]" />,
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-[0.9375rem] font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-[0.9375rem] font-semibold first:mt-0">{children}</h3>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-xl border border-ink/[0.08] bg-paper/90 p-3 text-[0.85em] leading-relaxed">
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
        className="rounded bg-ink/[0.06] px-1 py-0.5 font-mono text-[0.9em]"
        {...props}
      >
        {children}
      </code>
    );
  },
};

export function GuideMessageMarkdown({ source }: { source: string }) {
  return (
    <div className="min-w-0 [&_*]:text-inherit">
      <Markdown remarkPlugins={[remarkBreaks]} components={components}>
        {source}
      </Markdown>
    </div>
  );
}
