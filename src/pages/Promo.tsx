import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePromoStatus } from '@/hooks/usePromoStatus';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { usePageTracking } from '@/hooks/usePageTracking';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import {
  Gift, DollarSign, Share2, CheckCircle2, AlertCircle, Clock,
  Truck, Shield, Calendar, Trophy, ExternalLink, Loader2, Sparkles, ArrowRight, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
  })
};

const Promo = () => {
  usePageTracking();
  const { user } = useAuth();
  const { data: promo, isLoading } = usePromoStatus();
  const { connectStripe, isConnecting } = useStripeConnect();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fbUrl, setFbUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleContestSubmit = async () => {
    if (!user?.id || !promo?.promotion?.id || !promo?.listingReward?.listing_id) return;
    if (!fbUrl.includes('facebook.com')) {
      toast({ title: 'Invalid URL', description: 'Please paste a valid Facebook post URL.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('contest_entries').insert({
        user_id: user.id,
        listing_id: promo.listingReward.listing_id,
        promotion_id: promo.promotion.id,
        facebook_post_url: fbUrl,
      });
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already entered', description: 'You have already submitted an entry for this contest.' });
        } else throw error;
      } else {
        toast({ title: 'Entry submitted! 🎉', description: 'We\'ll verify your Facebook post soon.' });
        queryClient.invalidateQueries({ queryKey: ['promo-status'] });
        setFbUrl('');
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to submit entry.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const reward = promo?.listingReward;
  const entry = promo?.contestEntry;
  const daysActive = reward?.active_days_count || 0;
  const progress = Math.min((daysActive / 14) * 100, 100);

  const now = new Date();
  const entryDeadline = promo?.promotion?.entry_deadline_et ? new Date(promo.promotion.entry_deadline_et) : null;
  const drawDate = promo?.promotion?.draw_at_et ? new Date(promo.promotion.draw_at_et) : null;
  const isEntryOpen = entryDeadline ? now <= entryDeadline : false;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* ───────── HERO ───────── */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/5 to-amber-200/4" />

          {/* Decorative orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 right-16 w-96 h-96 bg-primary/6 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 left-16 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/4 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-32 left-1/4 w-64 h-64 bg-amber-300/5 rounded-full blur-2xl" />
          </div>

          <div className="container relative z-10 text-center max-w-4xl mx-auto px-4">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Limited Time Promotion
              </div>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 tracking-tight"
              variants={fadeUp} custom={1} initial="hidden" animate="visible"
            >
              Get Verified. <span className="text-gradient">Get Paid.</span> Get Seen.
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed"
              variants={fadeUp} custom={2} initial="hidden" animate="visible"
            >
              List for <strong className="text-foreground">FREE</strong>, earn{' '}
              <strong className="text-foreground">$10 instantly</strong>, and enter to win{' '}
              <strong className="text-foreground">$500 cash</strong>!
            </motion.p>

            <motion.p
              className="text-base text-muted-foreground font-semibold tracking-wide mb-8"
              variants={fadeUp} custom={3} initial="hidden" animate="visible"
            >
              LIST &bull; TAG &bull; WIN
            </motion.p>

            {/* Quick Stats */}
            <motion.div
              className="grid grid-cols-3 gap-4 max-w-xl mx-auto mb-10"
              variants={fadeUp} custom={4} initial="hidden" animate="visible"
            >
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">$10</div>
                <div className="text-xs text-muted-foreground">List & Earn</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">$500</div>
                <div className="text-xs text-muted-foreground">Share & Win</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">FREE</div>
                <div className="text-xs text-muted-foreground">No Promo Code</div>
              </div>
            </motion.div>

            <motion.div className="flex flex-wrap justify-center gap-4" variants={fadeUp} custom={5} initial="hidden" animate="visible">
              {user ? (
                <Button asChild size="lg" variant="dark-shine" className="gap-2 h-14 px-8 text-base rounded-xl">
                  <Link to="/list">List Now — It's Free <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              ) : (
                <Button asChild size="lg" variant="dark-shine" className="gap-2 h-14 px-8 text-base rounded-xl">
                  <Link to="/auth">Sign Up to Participate <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              )}
            </motion.div>
          </div>
        </section>

        {/* ───────── HOW IT WORKS ───────── */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">How It Works</h2>
              <p className="text-muted-foreground">Three simple steps to earn cash</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Shield, title: '1. Connect & Verify', desc: 'Set up Stripe Connect and verify your identity.', color: 'text-primary' },
                { icon: Truck, title: '2. Publish a Listing', desc: 'Publish during the promo window (Feb 9–10, 2025).', color: 'text-emerald-500' },
                { icon: DollarSign, title: '3. Keep It Live', desc: 'Keep your listing active for 14 days. Get $10!', color: 'text-amber-500' },
              ].map((step, i) => (
                <motion.div
                  key={step.title}
                  className="glass-premium rounded-2xl p-6 text-center card-hover"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-card flex items-center justify-center mx-auto mb-4 border border-border/50 shadow-sm`}>
                    <step.icon className={`h-7 w-7 ${step.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── REWARDS SECTIONS ───────── */}
        <div className="relative py-16 md:py-20 overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/30" />

          <div className="container relative z-10 max-w-4xl mx-auto px-4 space-y-12">
            {/* $10 Listing Reward */}
            <motion.div
              className="glass-premium rounded-3xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <DollarSign className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">$10 Listing Reward</h2>
                    <p className="text-sm text-muted-foreground">List & Earn — Instant Payout via Stripe</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    'Publish a FREE listing on Vendibook between Feb 9–10, 2025 (ET).',
                    'Listing must stay active/live for 14 consecutive days.',
                    '$10 is sent directly to your connected Stripe account.',
                    'One reward per person. Instant payout available via Stripe.',
                  ].map((rule, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{rule}</span>
                    </div>
                  ))}
                </div>

                {user && reward && (
                  <div className="p-4 rounded-2xl border border-border bg-card/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">Your Progress</span>
                      {reward.payout_status === 'paid' && <Badge className="bg-emerald-500 text-white border-0">Paid ✓</Badge>}
                      {reward.payout_status === 'eligible' && <Badge variant="secondary">Reward Scheduled</Badge>}
                      {reward.payout_status === 'pending' && <Badge variant="outline">Tracking</Badge>}
                      {reward.payout_status === 'disqualified' && <Badge variant="destructive">Disqualified</Badge>}
                    </div>
                    {reward.payout_status === 'pending' && (
                      <>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span>Days Active: {daysActive}/14</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* $500 Facebook Drawing */}
            <motion.div
              id="contest"
              className="glass-premium rounded-3xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Trophy className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">$500 Facebook Share Drawing</h2>
                    <p className="text-sm text-muted-foreground">Share & Win — Tag Us on Facebook</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { icon: Share2, text: 'Share YOUR specific Vendibook listing link on Facebook.' },
                    { icon: Share2, text: <>Tag <strong className="text-foreground">@Vendibook</strong> in your Facebook post.</> },
                    { icon: Clock, text: 'Entry deadline: March 13, 11:59 PM ET.' },
                    { icon: Calendar, text: 'Drawing: March 15, 1:00 PM ET. One winner selected randomly.' },
                    { icon: DollarSign, text: 'Winner receives $500 within 7–10 days.' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <item.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>

                {user && reward && !entry && isEntryOpen && (
                  <div className="p-4 rounded-2xl border border-border bg-card/50 backdrop-blur-sm space-y-3">
                    <p className="text-sm font-semibold text-foreground">Submit Your Facebook Post</p>
                    <Input
                      placeholder="https://facebook.com/..."
                      value={fbUrl}
                      onChange={(e) => setFbUrl(e.target.value)}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must include your Vendibook listing link and tag @Vendibook.
                    </p>
                    <Button onClick={handleContestSubmit} disabled={submitting || !fbUrl} size="sm" variant="dark-shine" className="rounded-xl">
                      {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting...</> : 'Submit Entry'}
                    </Button>
                  </div>
                )}

                {entry && (
                  <div className="p-4 rounded-2xl border border-border bg-card/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Your Entry</span>
                      {entry.status === 'verified' && <Badge className="bg-emerald-500 text-white border-0">Verified ✓</Badge>}
                      {entry.status === 'pending' && <Badge variant="outline">Pending Review</Badge>}
                      {entry.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                    </div>
                    <a href={entry.facebook_post_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                      View post <ExternalLink className="h-3 w-3" />
                    </a>
                    {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
                  </div>
                )}

                {promo?.contestWinner && (
                  <div className="p-5 rounded-2xl border-2 border-amber-500/50 bg-amber-50/80 dark:bg-amber-950/20 backdrop-blur-sm mt-4">
                    <p className="text-sm font-bold text-amber-600 flex items-center gap-2">
                      <Trophy className="h-5 w-5" /> Congratulations — You Won $500! 🎉
                    </p>
                  </div>
                )}

                {!user && (
                  <Button asChild variant="dark-shine" className="rounded-xl mt-2">
                    <Link to="/auth">Sign Up to Enter</Link>
                  </Button>
                )}
              </div>
            </motion.div>

            {/* ───────── OFFICIAL RULES ───────── */}
            <motion.div
              className="glass-premium rounded-3xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <div className="p-6 md:p-8">
                <h2 className="text-lg font-bold text-foreground mb-4">Official Rules & Disclaimers</h2>
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <p><strong className="text-foreground">No promo code needed.</strong> Promotion is automatic for eligible users.</p>
                  <p><strong className="text-foreground">No purchase necessary</strong> for the $500 Facebook Share Drawing.</p>
                  <Separator className="my-3" />
                  <p><strong className="text-foreground">Eligibility:</strong> Open to legal residents of the United States who are 18 years or older. Users must have a valid Stripe Connect account with completed identity verification (KYC). One $10 reward per person per Stripe account. One drawing entry per person.</p>
                  <p><strong className="text-foreground">Promo Window:</strong> Listings must be first published between February 9, 2025, 12:00:00 AM ET and February 10, 2025, 11:59:59 PM ET.</p>
                  <p><strong className="text-foreground">14-Day Requirement:</strong> Listing must remain continuously active (published, not paused, deleted, or flagged) for 14 full consecutive days following publication. If the listing is removed, paused, or flagged during the 14-day period, reward eligibility is forfeited.</p>
                  <p><strong className="text-foreground">Drawing Entry Deadline:</strong> Facebook share submissions must be completed by March 13, 2025, 11:59:59 PM ET.</p>
                  <p><strong className="text-foreground">Drawing Date:</strong> One (1) winner will be selected randomly from verified entries on March 15, 2025 at 1:00 PM ET.</p>
                  <p><strong className="text-foreground">Payment:</strong> The $10 listing reward and $500 drawing prize are paid via Stripe Transfer to the winner's connected Stripe account. Payments are typically initiated within 7–10 business days of eligibility or selection.</p>
                  <p><strong className="text-foreground">Fraud Prevention:</strong> Vendibook reserves the right to disqualify any user suspected of fraud, including but not limited to: duplicate accounts, fake listings, or misrepresentation. One payout per Stripe account.</p>
                  <p><strong className="text-foreground">Tax Responsibility:</strong> Winners are solely responsible for any applicable taxes. Vendibook may issue a 1099 form for prizes exceeding $600.</p>
                  <p><strong className="text-foreground">Void Where Prohibited.</strong> This promotion is void where prohibited by law.</p>
                  <p><strong className="text-foreground">Right to Modify:</strong> Vendibook reserves the right to modify, suspend, or cancel this promotion at any time without prior notice.</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-4">
                    This promotion is not sponsored, endorsed, or administered by, or associated with Facebook/Meta.
                    All dates and times are in Eastern Time (ET). © 2025 Vendibook, Inc.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Promo;
