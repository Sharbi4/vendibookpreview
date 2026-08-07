import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlag } from "@/hooks/useReferral";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Link as LinkIcon, Share2, DollarSign, Shield, FileText, Clock } from "lucide-react";

const CountUp = ({ to, prefix = "$" }: { to: number; prefix?: string }) => {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${prefix}${Math.round(v).toLocaleString()}`);
  useEffect(() => {
    const controls = animate(mv, to, { duration: 1.4, ease: "easeOut" });
    return controls.stop;
  }, [to, mv]);
  return <motion.span>{rounded}</motion.span>;
};

const PROGRAMS = [
  {
    type: "purchase",
    amount: 500,
    title: "Refer a buyer",
    who: "Anyone who buys a food truck, trailer, or commercial equipment",
    trigger: "Eligible after the transaction clears, no disputes, and admin review",
    fine: "Minimum $3,000 purchase. Max 10 per month per referrer.",
  },
  {
    type: "supply",
    amount: 150,
    title: "Refer a lister",
    who: "Anyone who lists their food truck, trailer, or kitchen on Vendibook",
    trigger: "Eligible after their first transaction (within 90 days) and admin review",
    fine: "Listing must remain active 30+ days and pass verification.",
  },
  {
    type: "rental",
    amount: 50,
    title: "Refer a renter",
    who: "Anyone who books a kitchen, lot, or vendor space on Vendibook",
    trigger: "Eligible after the booking completes and admin review",
    fine: "Minimum $150 booking value. One reward per referred renter.",
  },
];

const FAQ = [
  ["Who counts as a new user?", "Anyone without a prior Vendibook account using their email, phone, or device. We check at signup."],
  ["When do I get paid?", "After your referral qualifies, our team reviews it. Once approved and any hold window has passed, payouts run weekly on Mondays once you've accumulated at least $50."],
  ["How is the money sent?", "Sent to your saved payout destination, batched weekly on Mondays. Minimum $50 accumulated before a transfer is initiated."],
  ["Can I refer myself with a second account?", "No. Self-referrals are auto-detected and voided. Fraud also triggers account suspension."],
  ["Are referral rewards taxable?", "Yes. If you earn $600+ in a calendar year, we collect W-9 info and issue a 1099 form."],
  ["What if the buyer files a chargeback?", "Purchase referrals are held 14 days. If a dispute resolves in the buyer's favor within that window, the reward is forfeited."],
  ["Do referral cookies expire?", "Yes — 30 days from first click. After that, you'll need the person to enter your code manually at checkout."],
  ["Can I share my link at events or markets?", "Yes — your dashboard generates a downloadable QR code for in-person sharing."],
];

const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    try {
      await supabase.from("newsletter_signups" as any).insert({ email, source: "referral_waitlist" });
    } catch {}
    setSubmitted(true);
    toast.success("You're on the waitlist — we'll email when we open.");
  };
  if (submitted) {
    return <p className="text-sm text-white/70">Thanks — we'll email <span className="text-white">{email}</span> when the program opens.</p>;
  }
  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-md">
      <Input
        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com" required
        className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
        style={{ fontSize: "16px" }}
      />
      <Button type="submit" className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white">Join waitlist</Button>
    </form>
  );
};

const ReferralLanding = () => {
  const { user } = useAuth();
  const { data: programEnabled = true } = useFeatureFlag("referral_program_enabled", true);
  const ctaHref = user ? "/referral/dashboard" : "/auth?redirect=/referral/dashboard";

  return (
    <>
      <SEO
        title="Vendibook Referral Program — Earn up to $500"
        description="Refer buyers, sellers, and renters to Vendibook. You may earn up to $500 per qualified referral, paid after admin review."
      />

      <div className="min-h-screen bg-[#0F0F0F] text-white">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
            }}
          />
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-[#FF5124] opacity-20 blur-[120px] rounded-full pointer-events-none" />
          <div className="container mx-auto px-4 py-20 md:py-32 relative">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div
                  className="text-[18vw] md:text-[14vw] leading-[0.85] font-black tracking-tight text-[#FF5124]"
                  style={{ fontFamily: '"Bebas Neue","Barlow Condensed",sans-serif', letterSpacing: "-0.02em" }}
                >
                  <CountUp to={500} />
                </div>
                <p className="mt-4 text-white/60 text-lg">you may earn per qualifying purchase referral</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
                  Turn your network into eligible rewards.
                </h1>
                <p className="text-lg md:text-xl text-white/70 mb-8 leading-relaxed">
                  Refer buyers, sellers, and renters to Vendibook. Eligible rewards are paid out after the referred transaction completes and our team reviews it.
                </p>
                {programEnabled ? (
                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="lg" className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white text-base shadow-[0_0_40px_rgba(255,81,36,0.4)] hover:shadow-[0_0_60px_rgba(255,81,36,0.6)] transition-shadow">
                      <Link to={ctaHref}>Start referring <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <a href="#how-it-works">See how it works</a>
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-white/80 mb-3 px-3 py-1.5 rounded-full bg-white/10 inline-block">Program opens soon — join the waitlist</p>
                    <WaitlistForm />
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* PROGRAM CARDS */}
        <section className="container mx-auto px-4 py-20" id="programs">
          <div className="grid md:grid-cols-3 gap-6">
            {PROGRAMS.map((p, i) => (
              <motion.div
                key={p.type}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-7 hover:border-[#FF5124]/40 transition-colors"
              >
                <div
                  className="text-7xl font-black text-[#FF5124] mb-3"
                  style={{ fontFamily: '"Bebas Neue","Barlow Condensed",sans-serif', letterSpacing: "-0.02em" }}
                >
                  <CountUp to={p.amount} />
                </div>
                <h3 className="text-xl font-bold mb-3">{p.title}</h3>
                <p className="text-white/70 text-sm mb-3">{p.who}</p>
                <p className="text-white/60 text-sm mb-4 border-l-2 border-[#FF5124]/40 pl-3">{p.trigger}</p>
                <p className="text-white/40 text-xs">{p.fine}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="container mx-auto px-4 py-20 border-t border-white/5">
          <h2 className="text-3xl md:text-5xl font-black mb-12 text-center">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: LinkIcon, t: "1. Get your link", d: "Sign up and we generate a unique referral code and link for you." },
              { icon: Share2, t: "2. Share it", d: "Text, email, post, or hand out the QR code at events. We track every click." },
              { icon: DollarSign, t: "3. Get paid", d: "Vendibook sends your reward to your saved payout destination when the referral qualifies." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="text-center">
                <div className="inline-flex p-4 rounded-full bg-[#FF5124]/15 mb-4">
                  <Icon className="h-7 w-7 text-[#FF5124]" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t}</h3>
                <p className="text-white/60">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="border-y border-white/5 bg-white/[0.02]">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-white/60">
              <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-[#FF5124]" /> Payouts to your saved destination</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#FF5124]" /> 30-day cookie tracking</span>
              <span className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-[#FF5124]" /> Real-time dashboard</span>
              <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#FF5124]" /> 1099 issued at $600+</span>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-4 py-20 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-black mb-12 text-center">Frequently asked</h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map(([q, a]) => (
              <AccordionItem key={q} value={q} className="border-white/10">
                <AccordionTrigger className="text-left text-white hover:text-[#FF5124]">{q}</AccordionTrigger>
                <AccordionContent className="text-white/70">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* FINAL CTA */}
        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6">Ready to earn?</h2>
          <p className="text-white/60 mb-8 text-lg">It takes 60 seconds to generate your code.</p>
          <Button
            asChild
            size="lg"
            className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white text-base shadow-[0_0_40px_rgba(255,81,36,0.4)]"
          >
            <Link to={ctaHref}>
              Start referring <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-8 text-xs text-white/40">
            <Link to="/referral/terms" className="hover:text-white/70 underline">
              Full program terms and fine print
            </Link>
          </p>
        </section>
      </div>
    </>
  );
};

export default ReferralLanding;
