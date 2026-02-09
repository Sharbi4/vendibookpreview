import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePromoStatus } from '@/hooks/usePromoStatus';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Gift, DollarSign, Share2, CheckCircle2, AlertCircle, Clock,
  Truck, Shield, Calendar, Trophy, ExternalLink, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Promo = () => {
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
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-amber-500/10 py-16 md:py-24">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20" variant="outline">
              <Gift className="h-3 w-3 mr-1" /> Limited Time
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Vendibook Launch Promo
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              List for <strong>FREE</strong>, earn <strong>$10</strong>, and enter to win <strong>$500</strong>!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {user ? (
                <Button asChild size="lg">
                  <Link to="/list">List Now — It's Free</Link>
                </Button>
              ) : (
                <Button asChild size="lg">
                  <Link to="/auth">Sign Up to Participate</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
          {/* How It Works */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">1. Connect & Verify</h3>
                  <p className="text-sm text-muted-foreground">Set up Stripe Connect and verify your identity.</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <Truck className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold mb-1">2. Publish a Listing</h3>
                  <p className="text-sm text-muted-foreground">Publish during the promo window (Feb 9–10, 2025).</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="font-semibold mb-1">3. Keep It Live</h3>
                  <p className="text-sm text-muted-foreground">Keep your listing active for 14 days. Get $10!</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* $10 Listing Reward */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  $10 Listing Reward
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Publish a FREE listing on Vendibook between Feb 9–10, 2025 (ET).</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Listing must stay active/live for 14 consecutive days.</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> $10 is sent directly to your connected Stripe account.</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> One reward per person. Instant payout available via Stripe.</li>
                </ul>

                {user && reward && (
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Your Progress</span>
                      {reward.payout_status === 'paid' && <Badge className="bg-emerald-500 text-white">Paid ✓</Badge>}
                      {reward.payout_status === 'eligible' && <Badge variant="secondary">Reward Scheduled</Badge>}
                      {reward.payout_status === 'pending' && <Badge variant="outline">Tracking</Badge>}
                      {reward.payout_status === 'disqualified' && <Badge variant="destructive">Disqualified</Badge>}
                    </div>
                    {reward.payout_status === 'pending' && (
                      <>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Days Active: {daysActive}/14</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* $500 Facebook Drawing */}
          <section id="contest">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  $500 Facebook Share Drawing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><Share2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Share YOUR specific Vendibook listing link on Facebook.</li>
                  <li className="flex items-start gap-2"><Share2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Tag <strong>@Vendibook</strong> in your Facebook post.</li>
                  <li className="flex items-start gap-2"><Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Entry deadline: March 13, 11:59 PM ET.</li>
                  <li className="flex items-start gap-2"><Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Drawing: March 15, 1:00 PM ET. One winner selected randomly.</li>
                  <li className="flex items-start gap-2"><DollarSign className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Winner receives $500 within 7–10 days.</li>
                </ul>

                {user && reward && !entry && isEntryOpen && (
                  <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                    <p className="text-sm font-medium">Submit Your Facebook Post</p>
                    <Input
                      placeholder="https://facebook.com/..."
                      value={fbUrl}
                      onChange={(e) => setFbUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must include your Vendibook listing link and tag @Vendibook.
                    </p>
                    <Button onClick={handleContestSubmit} disabled={submitting || !fbUrl} size="sm">
                      {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting...</> : 'Submit Entry'}
                    </Button>
                  </div>
                )}

                {entry && (
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Your Entry</span>
                      {entry.status === 'verified' && <Badge className="bg-emerald-500 text-white">Verified ✓</Badge>}
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
                  <div className="p-4 rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <p className="text-sm font-bold text-amber-600 flex items-center gap-2">
                      <Trophy className="h-5 w-5" /> Congratulations — You Won $500! 🎉
                    </p>
                  </div>
                )}

                {!user && (
                  <Button asChild variant="outline">
                    <Link to="/auth">Sign Up to Enter</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Legal / Disclaimers */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Official Rules & Disclaimers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <p><strong>No promo code needed.</strong> Promotion is automatic for eligible users.</p>
                <p><strong>No purchase necessary</strong> for the $500 Facebook Share Drawing.</p>
                <Separator />
                <p><strong>Eligibility:</strong> Open to legal residents of the United States who are 18 years or older. Users must have a valid Stripe Connect account with completed identity verification (KYC). One $10 reward per person per Stripe account. One drawing entry per person.</p>
                <p><strong>Promo Window:</strong> Listings must be first published between February 9, 2025, 12:00:00 AM ET and February 10, 2025, 11:59:59 PM ET.</p>
                <p><strong>14-Day Requirement:</strong> Listing must remain continuously active (published, not paused, deleted, or flagged) for 14 full consecutive days following publication. If the listing is removed, paused, or flagged during the 14-day period, reward eligibility is forfeited.</p>
                <p><strong>Drawing Entry Deadline:</strong> Facebook share submissions must be completed by March 13, 2025, 11:59:59 PM ET.</p>
                <p><strong>Drawing Date:</strong> One (1) winner will be selected randomly from verified entries on March 15, 2025 at 1:00 PM ET.</p>
                <p><strong>Payment:</strong> The $10 listing reward and $500 drawing prize are paid via Stripe Transfer to the winner's connected Stripe account. Payments are typically initiated within 7–10 business days of eligibility or selection.</p>
                <p><strong>Fraud Prevention:</strong> Vendibook reserves the right to disqualify any user suspected of fraud, including but not limited to: duplicate accounts, fake listings, or misrepresentation. One payout per Stripe account.</p>
                <p><strong>Tax Responsibility:</strong> Winners are solely responsible for any applicable taxes. Vendibook may issue a 1099 form for prizes exceeding $600.</p>
                <p><strong>Void Where Prohibited.</strong> This promotion is void where prohibited by law.</p>
                <p><strong>Right to Modify:</strong> Vendibook reserves the right to modify, suspend, or cancel this promotion at any time without prior notice.</p>
                <p className="text-[10px] text-muted-foreground/70 mt-4">
                  This promotion is not sponsored, endorsed, or administered by, or associated with Facebook/Meta.
                  All dates and times are in Eastern Time (ET). © 2025 Vendibook, Inc.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Promo;
