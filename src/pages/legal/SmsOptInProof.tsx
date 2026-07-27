import React from 'react';
import { useEffect } from 'react';

const CAPTURE_DATE = 'July 27, 2026';

/**
 * /legal/sms-opt-in-proof
 *
 * Public evidence page for toll-free SMS verification review. Excluded from
 * navigation and search indexing. Shows how Vendibook collects SMS consent
 * on both desktop and mobile signup, plus links to the live opt-in surfaces.
 *
 * Screenshot placeholders should be replaced with actual captures. Precise
 * capture instructions are shown below so reviewers can reproduce them.
 */
const SmsOptInProof: React.FC = () => {
  useEffect(() => {
    document.title = 'SMS Opt-In Evidence · Vendibook';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    meta.content = 'noindex, nofollow';
  }, []);
  return (
    <>
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8 text-foreground">
        <header>
          <h1 className="text-2xl font-semibold">Vendibook SMS Opt-In Evidence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Captured: {CAPTURE_DATE}. This page is provided to toll-free verification
            reviewers and is not linked from navigation.
          </p>
        </header>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold">How opt-in works</h2>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>A visitor opens the public signup page at <a className="underline" href="/auth?mode=signup">vendibook.com/auth?mode=signup</a>.</li>
            <li>The signup form includes an <strong>optional</strong> "Mobile number" field.</li>
            <li>Directly adjacent to that field is an <strong>unchecked</strong> SMS consent checkbox with the full disclosure, message-frequency notice, message-and-data-rates warning, STOP and HELP instructions, and links to the SMS Terms and Privacy Policy.</li>
            <li>Consent is not required to create an account. The user may complete signup without providing a mobile number or checking the box.</li>
            <li>If the user checks the box <em>and</em> provides a valid US/CA mobile number, Vendibook records an affirmative opt-in with disclosure snapshot, timestamp, and policy version.</li>
            <li>Visitors may also enroll at any time via the dedicated public page <a className="underline" href="/sms">vendibook.com/sms</a>, which uses the same disclosure and checkbox pattern.</li>
          </ol>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Screenshot
            label="Desktop signup (1440×900) — SMS section, unchecked"
            imgSrc="/legal/sms-optin-desktop.png"
          />
          <Screenshot
            label="Mobile signup (390×844) — SMS section, unchecked"
            imgSrc="/legal/sms-optin-mobile.png"
          />
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">Live opt-in surfaces</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><a className="underline" href="/auth?mode=signup" target="_blank" rel="noreferrer">Signup form</a></li>
            <li><a className="underline" href="/sms" target="_blank" rel="noreferrer">Dedicated /sms enrollment page</a></li>
            <li><a className="underline" href="/legal/sms" target="_blank" rel="noreferrer">SMS Terms &amp; Consent Policy</a></li>
            <li><a className="underline" href="/legal/privacy" target="_blank" rel="noreferrer">Privacy Policy</a></li>
          </ul>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/40 p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Reviewer note:</strong> Screenshots must be captured
          from the live production site while signed out. Recommended viewports:
          desktop <code>1440×900</code>, mobile <code>390×844</code>. No real user
          information should be entered. Save PNG files as
          <code> public/legal/sms-optin-desktop.png</code> and
          <code> public/legal/sms-optin-mobile.png</code>. If those files are absent,
          this page shows a labeled placeholder frame so reviewers still see the
          documented flow.
        </section>
      </main>
    </>
  );
};

const Screenshot: React.FC<{ label: string; imgSrc: string }> = ({ label, imgSrc }) => (
  <figure className="space-y-2">
    <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30 flex items-center justify-center">
      <img
        src={imgSrc}
        alt={label}
        loading="lazy"
        className="max-h-full max-w-full object-contain"
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          el.style.display = 'none';
          const p = el.parentElement;
          if (p && !p.querySelector('[data-placeholder]')) {
            const div = document.createElement('div');
            div.setAttribute('data-placeholder', 'true');
            div.className = 'text-xs text-muted-foreground text-center p-4';
            div.textContent = 'Screenshot pending capture — see reviewer note below.';
            p.appendChild(div);
          }
        }}
      />
    </div>
    <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
  </figure>
);

export default SmsOptInProof;
