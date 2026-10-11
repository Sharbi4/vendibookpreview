/**
 * Minimal but dependable multi-page PDF writer for Deno / Supabase Edge.
 *
 * Produces a standards-compliant PDF 1.4 with Helvetica / Helvetica-Bold,
 * real text wrapping, headings, key/value tables, page headers and footers,
 * and absolute field boxes that can be handed to SignNow as signature or
 * text fields. No browser-only dependency is involved.
 *
 * NOTE: coordinates inside the builder are PDF user space (origin bottom
 * left). `FieldBox` values are converted to SignNow space (origin top left)
 * by `toSignNowBox`.
 */

export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const MARGIN_TOP = 74;
const MARGIN_BOTTOM = 62;

/** Helvetica advance widths (units/1000) for WinAnsi 32..126. */
const W_REGULAR: Record<string, number> = {};
const W_BOLD: Record<string, number> = {};
{
  const regular =
    '278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584';
  const bold =
    '278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584';
  const r = regular.split(' ').map(Number);
  const b = bold.split(' ').map(Number);
  for (let i = 0; i < r.length; i++) W_REGULAR[String.fromCharCode(32 + i)] = r[i];
  for (let i = 0; i < b.length; i++) W_BOLD[String.fromCharCode(32 + i)] = b[i];
}

type FontKey = 'F1' | 'F2';

function widthOf(text: string, size: number, font: FontKey): number {
  const table = font === 'F2' ? W_BOLD : W_REGULAR;
  let total = 0;
  for (const ch of text) total += table[ch] ?? 500;
  return (total / 1000) * size;
}

function escapePdf(s: string): string {
  // Keep the byte stream WinAnsi-safe: unmapped characters become ASCII.
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\()]/g, '\\$&');
}

export interface FieldBox {
  /** 0-based page index. */
  page: number;
  /** PDF user-space coordinates (origin bottom-left). */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Convert a PDF-space box to SignNow's top-left origin coordinates. */
export function toSignNowBox(box: FieldBox): { page: number; x: number; y: number; w: number; h: number } {
  return { page: box.page, x: Math.round(box.x), y: Math.round(PAGE_HEIGHT - box.y - box.h), w: Math.round(box.w), h: Math.round(box.h) };
}

export interface PdfDocOptions {
  title: string;
  /** Printed in the footer of every page, e.g. "v2026-09-18". */
  version: string;
  /** Optional reference printed in the header, e.g. an order number. */
  reference?: string;
}

export class PdfDoc {
  private pages: string[] = [];
  private stream = '';
  private y = PAGE_HEIGHT - MARGIN_TOP;
  private readonly contentWidth = PAGE_WIDTH - MARGIN_X * 2;

  constructor(private readonly opts: PdfDocOptions) {
    this.startPage();
  }

  get pageIndex(): number {
    return this.pages.length;
  }

  private startPage() {
    this.stream = '';
    this.y = PAGE_HEIGHT - MARGIN_TOP;
    // Running header: brand + document title (+ reference when supplied).
    this.text('VENDIBOOK', MARGIN_X, PAGE_HEIGHT - 44, 9, 'F2', 0.35);
    const right = this.opts.reference
      ? `${this.opts.title} - ${this.opts.reference}`
      : this.opts.title;
    const w = widthOf(right, 8.5, 'F1');
    this.text(right, PAGE_WIDTH - MARGIN_X - w, PAGE_HEIGHT - 44, 8.5, 'F1', 0.45);
    this.line(MARGIN_X, PAGE_HEIGHT - 52, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 52, 0.75);
  }

  private endPage() {
    this.pages.push(this.stream);
  }

  private ensureSpace(needed: number) {
    if (this.y - needed >= MARGIN_BOTTOM) return;
    this.endPage();
    this.startPage();
  }

  private text(value: string, x: number, y: number, size: number, font: FontKey, gray = 0) {
    this.stream += `BT\n${gray} ${gray} ${gray} rg\n/${font} ${size} Tf\n${x} ${y} Td\n(${escapePdf(value)}) Tj\nET\n0 0 0 rg\n`;
  }

  private line(x1: number, y1: number, x2: number, y2: number, width = 0.5, gray = 0.7) {
    this.stream += `${gray} ${gray} ${gray} RG\n${width} w\n${x1} ${y1} m\n${x2} ${y2} l\nS\n0 0 0 RG\n`;
  }

  private wrap(value: string, size: number, font: FontKey, maxWidth: number): string[] {
    const out: string[] = [];
    for (const rawLine of value.split('\n')) {
      const words = rawLine.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); continue; }
      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (widthOf(candidate, size, font) <= maxWidth) {
          line = candidate;
        } else {
          if (line) out.push(line);
          line = word;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }

  /** Large document title, used once on the first page. */
  documentTitle(value: string, subtitle?: string) {
    this.ensureSpace(60);
    this.text(value, MARGIN_X, this.y - 22, 20, 'F2');
    this.y -= 32;
    if (subtitle) {
      this.text(subtitle, MARGIN_X, this.y - 12, 10, 'F1', 0.35);
      this.y -= 20;
    }
    this.line(MARGIN_X, this.y, PAGE_WIDTH - MARGIN_X, this.y, 1, 0.55);
    this.y -= 18;
  }

  heading(value: string) {
    this.ensureSpace(42);
    this.y -= 8;
    this.text(value, MARGIN_X, this.y - 12, 11.5, 'F2');
    this.y -= 22;
  }

  paragraph(value: string, size = 9.5) {
    if (!value?.trim()) return;
    const lines = this.wrap(value, size, 'F1', this.contentWidth);
    const lh = size * 1.35;
    for (const line of lines) {
      this.ensureSpace(lh);
      if (line) this.text(line, MARGIN_X, this.y - size, size, 'F1', 0.12);
      this.y -= lh;
    }
    this.y -= 4;
  }

  bullets(items: string[], size = 9.5) {
    const lh = size * 1.35;
    for (const item of items) {
      if (!item?.trim()) continue;
      const lines = this.wrap(item, size, 'F1', this.contentWidth - 14);
      lines.forEach((line, i) => {
        this.ensureSpace(lh);
        if (i === 0) this.text('-', MARGIN_X, this.y - size, size, 'F1', 0.3);
        this.text(line, MARGIN_X + 14, this.y - size, size, 'F1', 0.12);
        this.y -= lh;
      });
    }
    this.y -= 4;
  }

  /** Two-column label/value summary block used on transaction summary pages. */
  summaryRow(label: string, value: string) {
    const size = 9.5;
    const labelW = 168;
    const lines = this.wrap(value || '-', size, 'F1', this.contentWidth - labelW);
    const lh = size * 1.35;
    this.ensureSpace(lh * lines.length);
    this.text(label, MARGIN_X, this.y - size, size, 'F2', 0.25);
    lines.forEach((line, i) => {
      if (i > 0) this.ensureSpace(lh);
      this.text(line, MARGIN_X + labelW, this.y - size, size, 'F1', 0.05);
      this.y -= lh;
    });
    this.line(MARGIN_X, this.y + 3, PAGE_WIDTH - MARGIN_X, this.y + 3, 0.4, 0.86);
    this.y -= 4;
  }

  /**
   * Label on the left, an empty SignNow text field on the right. Used for
   * transaction-summary facts that are prefilled per document.
   */
  summaryField(label: string): FieldBox {
    const size = 9.5;
    const labelW = 168;
    const height = 16;
    this.ensureSpace(height + 24);
    this.text(label, MARGIN_X, this.y - size, size, 'F2', 0.25);
    // A long label would run into the fill line, so drop the box onto its own row.
    const stacked = widthOf(label, size, 'F2') > labelW - 12;
    if (stacked) this.y -= size + 6;
    const x = stacked ? MARGIN_X : MARGIN_X + labelW;
    const w = stacked ? this.contentWidth : this.contentWidth - labelW;
    const boxBottom = this.y - height + 2;
    this.line(x, boxBottom - 1, PAGE_WIDTH - MARGIN_X, boxBottom - 1, 0.4, 0.86);
    this.y -= height + 6;
    return { page: this.pageIndex, x, y: boxBottom, w, h: height };
  }


  /**
   * A block-sized SignNow text field for generated clause text that varies by
   * transaction (host rules, cancellation policy, disclosed defects...).
   */
  blockField(label: string, height = 70): FieldBox {
    this.ensureSpace(height + 26);
    this.text(label, MARGIN_X, this.y - 9, 8, 'F2', 0.35);
    const boxTop = this.y - 13;
    const boxBottom = boxTop - height;
    this.line(MARGIN_X, boxBottom, PAGE_WIDTH - MARGIN_X, boxBottom, 0.5, 0.7);
    this.y = boxBottom - 14;
    return { page: this.pageIndex, x: MARGIN_X, y: boxBottom, w: this.contentWidth, h: height };
  }

  spacer(height = 10) {
    this.ensureSpace(height);
    this.y -= height;
  }

  /**
   * Reserve a labelled box for a SignNow field (text, signature, date).
   * Returns the field geometry so the caller can register it with SignNow.
   */
  fieldBox(label: string, opts: { width?: number; height?: number; column?: 0 | 1; note?: string } = {}): FieldBox {
    const height = opts.height ?? 26;
    const colWidth = (this.contentWidth - 24) / 2;
    const width = opts.width ?? (opts.column === undefined ? this.contentWidth : colWidth);
    const x = opts.column === 1 ? MARGIN_X + colWidth + 24 : MARGIN_X;
    this.ensureSpace(height + 26);
    this.text(label, x, this.y - 9, 8, 'F2', 0.35);
    const boxTop = this.y - 13;
    const boxBottom = boxTop - height;
    this.line(x, boxBottom, x + width, boxBottom, 0.6, 0.55);
    if (opts.note) this.text(opts.note, x, boxBottom - 10, 7.5, 'F1', 0.45);
    // Only advance the cursor when the second column of a pair is placed.
    if (opts.column !== 0) this.y = boxBottom - (opts.note ? 22 : 14);
    return { page: this.pageIndex, x, y: boxBottom, w: width, h: height };
  }

  /** Finish layout and serialise. Footers with page numbers are added here. */
  build(): Uint8Array {
    this.endPage();
    const total = this.pages.length;
    const footerNote = `Vendibook ${this.opts.title} - version ${this.opts.version}`;
    this.pages = this.pages.map((content, i) => {
      const label = `${footerNote}${this.opts.reference ? ` - ${this.opts.reference}` : ''}`;
      const pageLabel = `Page ${i + 1} of ${total}`;
      const w = widthOf(pageLabel, 8, 'F1');
      let out = content;
      out += `0.75 0.75 0.75 RG\n0.5 w\n${MARGIN_X} ${MARGIN_BOTTOM - 14} m\n${PAGE_WIDTH - MARGIN_X} ${MARGIN_BOTTOM - 14} l\nS\n0 0 0 RG\n`;
      out += `BT\n0.45 0.45 0.45 rg\n/F1 8 Tf\n${MARGIN_X} ${MARGIN_BOTTOM - 26} Td\n(${escapePdf(label)}) Tj\nET\n0 0 0 rg\n`;
      out += `BT\n0.45 0.45 0.45 rg\n/F1 8 Tf\n${PAGE_WIDTH - MARGIN_X - w} ${MARGIN_BOTTOM - 26} Td\n(${escapePdf(pageLabel)}) Tj\nET\n0 0 0 rg\n`;
      return out;
    });
    return serialise(this.pages);
  }
}

function serialise(pages: string[]): Uint8Array {
  const enc = new TextEncoder();
  const objects: string[] = [];
  const pageCount = pages.length;

  // 1 catalog, 2 pages, 3..(2+n) page objects, then content streams, then fonts.
  const firstPageObj = 3;
  const firstContentObj = firstPageObj + pageCount;
  const fontRegularObj = firstContentObj + pageCount;
  const fontBoldObj = fontRegularObj + 1;

  objects.push('<<\n/Type /Catalog\n/Pages 2 0 R\n>>');
  const kids = pages.map((_, i) => `${firstPageObj + i} 0 R`).join(' ');
  objects.push(`<<\n/Type /Pages\n/Kids [${kids}]\n/Count ${pageCount}\n>>`);
  pages.forEach((_, i) => {
    objects.push(
      `<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]\n` +
        `/Contents ${firstContentObj + i} 0 R\n/Resources <<\n/Font <<\n/F1 ${fontRegularObj} 0 R\n/F2 ${fontBoldObj} 0 R\n>>\n>>\n>>`,
    );
  });
  pages.forEach((content) => {
    const bytes = enc.encode(content).length;
    objects.push(`<<\n/Length ${bytes}\n>>\nstream\n${content}endstream`);
  });
  objects.push('<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n/Encoding /WinAnsiEncoding\n>>');
  objects.push('<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica-Bold\n/Encoding /WinAnsiEncoding\n>>');

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(enc.encode(body).length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = enc.encode(body).length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  const trailer = `trailer\n<<\n/Size ${objects.length + 1}\n/Root 1 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return enc.encode(body + xref + trailer);
}
