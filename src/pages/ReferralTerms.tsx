import SEO from "@/components/SEO";

const SECTIONS = [
  {
    id: "supply",
    title: "Supply Referral ($150)",
    items: [
      "Referred person must be a first-time Vendibook user (no existing account under same email, phone, or device).",
      "Listing must be approved and verified by Vendibook before qualifying.",
      "Listing must remain active and in good standing for 30 days post-publication.",
      "First transaction must occur within 90 days of listing going live or the referral expires.",
      "Referrer must have valid payout details saved to receive a payout.",
      "Payout releases 7 days after the first transaction clears.",
      "If listing is removed for policy violations, referral is voided regardless of current status.",
      "Vendibook reserves the right to audit any referral before releasing payment.",
    ],
  },
  {
    id: "purchase",
    title: "Purchase Referral ($500)",
    items: [
      "Referred buyer must be new to Vendibook with no prior account.",
      "Purchase must be a food truck, trailer, or commercial equipment listed on Vendibook — not a rental.",
      "Transaction must fully clear with no disputes, chargebacks, or reversals.",
      "14-day hold from transaction completion before payout releases.",
      "If buyer opens a dispute within 14 days, referral is placed on hold until resolved.",
      "If dispute is found in buyer's favor, referral reward is forfeited.",
      "Maximum 10 qualifying referrals per calendar month per referrer.",
      "Minimum purchase value of $3,000 to qualify.",
      "Referrer cannot be the seller of the purchased listing.",
    ],
  },
  {
    id: "rental",
    title: "Rental Referral ($50)",
    items: [
      "Referred renter must be new to Vendibook.",
      "First booking must be a minimum of 2 hours to qualify.",
      "Booking must be fully paid and completed — not cancelled or disputed.",
      "Minimum booking value of $150 to qualify.",
      "Payout releases 48 hours after booking completion.",
      "Limited to one reward per referred renter.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing Policy",
    items: [
      "Referral links may be shared directly with a referrer's personal or business network.",
      "Prohibited: spam, paid traffic, bots, link farms, scraping, fake accounts, self-referrals, or mass distribution outside normal personal or business sharing.",
      "Posting your link on coupon, deal, or cashback sites is not permitted.",
      "Violation of the sharing policy may result in voided rewards and account suspension.",
    ],
  },
  {
    id: "universal",
    title: "Universal Terms",
    items: [
      "Referral rewards are not guaranteed income. You may earn an eligible reward when a qualifying referral completes a transaction and our team has reviewed it.",
      "All rewards begin as pending review and require admin approval before payout.",
      "Referral links are personal and non-transferable.",
      "Vendibook may suspend or terminate referral access for suspected fraud or abuse, with or without notice.",
      "Rewards may be taxable income. We may require a W-9 before payout and will issue a 1099 to U.S. referrers earning $600+ in a calendar year. Vendibook does not provide tax advice — consult a qualified tax professional.",
      "Vendibook reserves the right to modify or discontinue any program with 30 days notice.",
      "Payout disputes must be submitted within 60 days of the transaction date.",
      "Employees, contractors, and affiliates of Vendibook are ineligible.",
      "Referral cookies last 30 days from first click — sign-ups after 30 days are not attributed.",
      "Manual code entry at checkout always overrides cookie attribution.",
      "Payouts are batched weekly on Mondays with a $50 accumulated minimum, and only after admin approval.",
      "Program is void where prohibited by law.",
    ],
  },
];

const TERMS_VERSION = "2026-05-30";

const ReferralTerms = () => (
  <>
    <SEO title="Referral Program Terms — Vendibook" description="Full terms and fine print for the Vendibook referral program." />
    <div className="bg-[#FAFAF7] min-h-screen text-[#08080a]">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-[#08080a]">Referral Program Terms</h1>
          <p className="mt-2 text-[#08080a]/60">Version {TERMS_VERSION} · Last updated May 30, 2026</p>
        </header>

        <div className="grid md:grid-cols-[220px_1fr] gap-12">
          <nav className="md:sticky md:top-24 self-start space-y-2 text-sm">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block py-1.5 text-[#08080a]/70 hover:text-[#FF5124] border-l-2 border-transparent hover:border-[#FF5124] pl-3 transition-colors"
              >
                {s.title}
              </a>
            ))}
          </nav>

          <main className="max-w-none space-y-12">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#FF5124]">{s.title}</h2>
                <ul className="mt-4 space-y-2.5 text-[#08080a]/85 leading-relaxed">
                  {s.items.map((it) => (
                    <li key={it} className="pl-6 relative">
                      <span className="absolute left-0 top-2.5 h-1.5 w-1.5 rounded-full bg-[#FF5124]" />
                      {it}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="border-t border-[#08080a]/10 pt-8 text-sm text-[#08080a]/60">
              <p>
                Questions? Email{" "}
                <a className="text-[#FF5124] underline" href="mailto:support@vendibook.com">support@vendibook.com</a>{" "}
                or call (725) 755-9598 (Mon–Fri 9am–5pm AZ time).
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  </>
);

export default ReferralTerms;
