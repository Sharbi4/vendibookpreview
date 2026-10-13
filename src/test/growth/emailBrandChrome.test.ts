import { describe, it, expect } from "vitest";
import {
  brandHeadHtml,
  ctaButtonHtml,
  injectBrandHead,
} from "../../../supabase/functions/_shared/email-brand/bulletproof";
import { CTA_BG, FONT_STACK } from "../../../supabase/functions/_shared/email-brand/tokens";
import { mkButton } from "../../../supabase/functions/_shared/marketing-templates/brand";

// Owner request 2026-10-13: Poppins everywhere (never a Times/serif fallback)
// and the site's orange glow pill CTA in every email.
describe("email brand chrome", () => {
  it("uses Poppins with a sans-serif fallback and no serif stack", () => {
    expect(FONT_STACK.startsWith("Poppins")).toBe(true);
    expect(FONT_STACK).toMatch(/sans-serif$/);
    expect(FONT_STACK).not.toMatch(/Times|Georgia|Aptos/i);
  });

  it("head loads Poppins and forces Arial in Outlook desktop", () => {
    const head = brandHeadHtml();
    expect(head).toContain("fonts.googleapis.com/css2?family=Poppins");
    expect(head).toContain("@import url(");
    expect(head).toMatch(/<!--\[if mso\]><style[^>]*>\* \{ font-family: Arial/);
    expect(head).toContain(`td, th, p, a, li, h1, h2, h3, h4 { font-family: ${FONT_STACK}; }`);
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
