import type { jsPDF } from "jspdf";

/** Mirrors `ChatMessage` from the session page (kept local to avoid circular imports). */
export type SessionExportMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "notice"; text: string }
  | {
      id: string;
      role: "guide";
      text: string;
      variant?: "default" | "takeaway";
      takeawayHeading?: string;
      summaryDocument?: boolean;
      staticWelcome?: boolean;
    };

const COACHING_REPLACEMENT =
  "[Schedule time with Akaash — link to be added]";

function guidePlainText(
  m: Extract<SessionExportMessage, { role: "guide" }>
): string {
  if (m.variant === "takeaway") {
    return m.text.replace(
      /\r?\n?\[COACHING_CTA\]\r?\n?/g,
      `\n\n${COACHING_REPLACEMENT}\n\n`
    );
  }
  return m.text;
}

function stripInlineMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

/** Full session as plain text: You / Guide / Note, welcome + summary included. */
export function buildSessionTxt(messages: SessionExportMessage[]): string {
  const header = `Homecoming — session\n${new Date().toLocaleString()}\n\n---\n\n`;
  const blocks: string[] = [];

  for (const m of messages) {
    if (m.role === "notice") {
      blocks.push(`Note:\n${m.text}`);
      continue;
    }
    if (m.role === "user") {
      blocks.push(`You:\n${m.text}`);
      continue;
    }
    let block = "Guide:\n";
    if (m.variant === "takeaway" && m.takeawayHeading) {
      block += `${m.takeawayHeading}\n\n`;
    }
    block += guidePlainText(m);
    blocks.push(block);
  }

  return header + blocks.join("\n\n");
}

const INK: [number, number, number] = [61, 43, 31];
const MUTED: [number, number, number] = [107, 83, 73];
const EMBER: [number, number, number] = [158, 82, 46];

type PdfCtx = {
  doc: jsPDF;
  margin: number;
  pageH: number;
  contentW: number;
  y: number;
};

function newPage(ctx: PdfCtx) {
  ctx.doc.addPage();
  ctx.y = ctx.margin;
}

function ensureGap(ctx: PdfCtx, nextLineHeight: number) {
  if (ctx.y + nextLineHeight > ctx.pageH - ctx.margin) {
    newPage(ctx);
  }
}

function writeParagraph(
  ctx: PdfCtx,
  text: string,
  opts: {
    size?: number;
    lineH?: number;
    bold?: boolean;
    color?: [number, number, number];
  } = {}
) {
  const size = opts.size ?? 11;
  const lineH = opts.lineH ?? Math.round(size * 1.45);
  const bold = opts.bold ?? false;
  const color = opts.color ?? INK;
  const cleaned = stripInlineMarkdown(text);
  if (!cleaned.trim()) return;

  ctx.doc.setFont("helvetica", bold ? "bold" : "normal");
  ctx.doc.setFontSize(size);
  ctx.doc.setTextColor(...color);

  const lines = ctx.doc.splitTextToSize(cleaned, ctx.contentW);
  for (const line of lines) {
    ensureGap(ctx, lineH);
    ctx.doc.text(line, ctx.margin, ctx.y);
    ctx.y += lineH;
  }
}

function writeLabelThenBlock(ctx: PdfCtx, label: string, body: string) {
  writeParagraph(ctx, label, { bold: true, size: 11, lineH: 14 });
  writeParagraph(ctx, body, { size: 11, lineH: 16 });
  ctx.y += 10;
}

/** Summary markdown: ## headers bold/accent; body paragraphs; CTA line replaced. */
function writeSummaryMarkdownPdf(ctx: PdfCtx, raw: string) {
  const md = raw.replace(
    /\r?\n?\[COACHING_CTA\]\r?\n?/g,
    `\n\n${COACHING_REPLACEMENT}\n\n`
  );
  const lines = md.split("\n");
  const para: string[] = [];

  function flushPara() {
    const t = para.join("\n").trim();
    para.length = 0;
    if (!t) return;
    writeParagraph(ctx, t, { size: 11, lineH: 16 });
    ctx.y += 6;
  }

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushPara();
      writeParagraph(ctx, line.slice(3).trim(), {
        bold: true,
        size: 13,
        lineH: 20,
        color: EMBER,
      });
      ctx.y += 4;
    } else {
      para.push(line);
    }
  }
  flushPara();
}

export async function buildSessionPdfBlob(
  messages: SessionExportMessage[]
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
    orientation: "portrait",
  });
  const margin = 54;
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 2 * margin;

  const ctx: PdfCtx = {
    doc,
    margin,
    pageH,
    contentW,
    y: margin,
  };

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Homecoming", margin, ctx.y);
  ctx.y += 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(new Date().toLocaleString(), margin, ctx.y);
  ctx.y += 36;
  doc.setTextColor(...INK);

  for (const m of messages) {
    if (m.role === "notice") {
      writeLabelThenBlock(ctx, "Note:", m.text);
      continue;
    }
    if (m.role === "user") {
      writeLabelThenBlock(ctx, "You:", m.text);
      continue;
    }

    if (m.summaryDocument && m.variant === "takeaway") {
      writeParagraph(ctx, "Guide:", { bold: true, size: 11, lineH: 14 });
      if (m.takeawayHeading) {
        writeParagraph(ctx, m.takeawayHeading, {
          bold: true,
          size: 12,
          lineH: 17,
          color: EMBER,
        });
        ctx.y += 4;
      }
      writeSummaryMarkdownPdf(ctx, m.text);
      ctx.y += 12;
      continue;
    }

    if (m.variant === "takeaway") {
      writeParagraph(ctx, "Guide:", { bold: true, size: 11, lineH: 14 });
      if (m.takeawayHeading) {
        writeParagraph(ctx, m.takeawayHeading, {
          bold: true,
          size: 12,
          lineH: 17,
          color: EMBER,
        });
        ctx.y += 4;
      }
      writeParagraph(ctx, guidePlainText(m), { size: 11, lineH: 16 });
      ctx.y += 12;
      continue;
    }

    writeLabelThenBlock(ctx, "Guide:", guidePlainText(m));
  }

  return doc.output("blob");
}

export async function downloadSessionZip(
  messages: SessionExportMessage[]
): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const base = `returning-home-session-${date}`;

  const JSZip = (await import("jszip")).default;
  const { saveAs } = await import("file-saver");

  const txt = buildSessionTxt(messages);
  const pdfBlob = await buildSessionPdfBlob(messages);

  const zip = new JSZip();
  zip.file(`${base}.txt`, txt);
  zip.file(`${base}.pdf`, pdfBlob);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `${base}.zip`);
}
