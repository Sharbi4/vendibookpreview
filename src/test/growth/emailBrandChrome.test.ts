import { describe, it, expect } from "vitest";
import {
  brandHeadHtml,
  ctaButtonHtml,
  injectBrandHead,
} from "../../../supabase/functions/_shared/email-brand/bulletproof";
import { CTA_BG, FONT_STACK, HEADING_FONT_STACK, t } from "../../../supabase/functions/_shared/email-brand/tokens";
import { mkButton } from "../../../supabase/functions/_shared/marketing-templates/brand";

// Owner request 2026-11-07: emails use the website's fonts — Archivo for
// headings, Plus Jakarta Sans for all other text (never a Times/serif
// fallback) — and the site's orange glow pill CTA in every email.
describe("email brand chrome", () => {
  it("body text uses Plus Jakarta Sans with a sans-serif fallback and no serif stack", () => {
    expect(FONT_STACK.startsWith("'Plus Jakarta Sans'")).toBe(true);
    expect(FONT_STACK).toMatch(/sans-serif$/);
    expect(FONT_STACK).not.toMatch(/Times|Georgia|Aptos|Poppins/i);
  });

  it("headings use Archivo with a sans-serif fallback", () => {
    expect(HEADING_FONT_STACK.startsWith("Archivo")).toBe(true);
    expect(HEADING_FONT_STACK).toMatch(/sans-serif$/);
    expect(t.h1.fontFamily).toBe(HEADING_FONT_STACK);
    expect(t.h2.fontFamily).toBe(HEADING_FONT_STACK);
  });

  it("head loads both site fonts and forces Arial in Outlook desktop", () => {
    const head = brandHeadHtml();
    expect(head).toContain("family=Archivo:");
    expect(head).toContain("family=Plus+Jakarta+Sans:");
    expect(head).not.toContain("Poppins");
    expect(head).toContain("@import url(");
    expect(head).toMatch(/<!--\[if mso\]><style[^>]*>\* \{ font-family: Arial/);
    expect(head).toContain(`td, th, p, a, li { font-family: ${FONT_STACK}; }`);
    expect(head).toContain(`h1, h2, h3, h4 { font-family: ${HEADING_FONT_STACK} !important; }`);
  });

  it("primary CTA is a bulletproof orange glow pill with an Outlook VML fallback", () => {
    const html = ctaButtonHtml({ href: "https://vendibook.com/x?a=1&b=2", label: "View booking" });
    expect(html).toContain(`bgcolor="${CTA_BG}"`);
    expect(html).toContain("border-radius:999px");
    expect(html).toContain("box-shadow:0 0 24px rgba(255, 81, 36, 0.45)");
    expect(html).toContain("font-weight:600");
    expect(html).toContain("<v:roundrect");
    expect(html).toContain(`fillcolor="${CTA_BG}"`);
    expect(html).toContain('href="https://vendibook.com/x?a=1&amp;b=2"');
    expect(html.match(/>View booking</g)?.length).toBe(2); // VML + real link text
  });

  it("marketing mkButton renders the same pill; ghost is the outline variant", () => {
    expect(mkButton("Go", "https://vendibook.com")).toContain("<v:roundrect");
    const ghost = mkButton("Go", "https://vendibook.com", { ghost: true });
    expect(ghost).toContain('bgcolor="#ffffff"');
    expect(ghost).not.toContain("box-shadow");
  });

  it("injectBrandHead is idempotent and wraps fragments", () => {
    const doc = injectBrandHead("<p>Alert</p>");
    expect(doc).toContain("<head>");
    expect(doc).toContain("<p>Alert</p>");
    expect(injectBrandHead(doc)).toBe(doc);
    const full = injectBrandHead("<html><head><title>t</title></head><body></body></html>");
    expect(full.indexOf("vb-brand-head")).toBeLessThan(full.indexOf("</head>"));
  });
});
