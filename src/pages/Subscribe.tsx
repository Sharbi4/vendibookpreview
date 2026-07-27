import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ArrowRight, BookOpen, Map, Search} from 'lucide-react';
import { toast } from "sonner";

export default function Subscribe() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  const source = params.get("utm_campaign") || "subscribe_page";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("blog-subscribe", {
        body: { email: email.trim(), name: name.trim() || null, source }});
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAlreadySubscribed(!!data?.alreadySubscribed);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Subscribe to Vendibook — Stories, listings, and insights";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        {!success ? (
          <div className="text-center">
            <p className="text-xs sm:text-sm uppercase tracking-[0.18em] text-[#ff5124] font-bold mb-4">
              Vendibook Newsletter
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5 leading-tight">
              Stay close to the mobile food economy
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Real stories, new listings, financing breakdowns, and tools for food truck owners,
              hosts, and vendors. Sent occasionally. Never spammy.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mx-auto max-w-md text-left rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
            >
              <div className="mb-4">
                <Label htmlFor="name">Your name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="mt-1 text-base"
                  autoComplete="name"
                />
              </div>
              <div className="mb-5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 text-base"
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ff5124] hover:bg-[#e8451c] text-white font-bold rounded-full h-12 text-base"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subscribing…</>
                ) : (
                  <>Subscribe <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                We'll send a confirmation to your inbox. You can unsubscribe anytime.
              </p>
            </form>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#ff5124]/10">
              <Check className="h-7 w-7 text-[#ff5124]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              {alreadySubscribed ? "You're already on the list" : "You're in"}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              {alreadySubscribed
                ? "Thanks for checking — this email is already subscribed. Here's what to explore next."
                : "Thanks for subscribing. We've sent a confirmation to your inbox. Here's what to explore next."}
            </p>

            <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
              <NextCard
                icon={<BookOpen className="h-4 w-4" />}
                title="Read the blog"
                desc="Stories, financing, and how-tos."
                to="/blog"
              />
              <NextCard
                icon={<Map className="h-4 w-4" />}
                title="Permit Path"
                desc="Know exactly what permits you need."
                to="/tools/permitpath"
              />
              <NextCard
                icon={<Search className="h-4 w-4" />}
                title="Browse the marketplace"
                desc="Trucks, trailers, kitchens, lots."
                to="/search"
              />
              <NextCard
                icon={<Search className="h-4 w-4" />}
                title="List your asset"
                desc="Start earning on Vendibook."
                to="/listing-wizard"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NextCard({
  icon, title, desc, to}: { icon: React.ReactNode; title: string; desc: string; to: string }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-card p-4 hover:border-[#ff5124]/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[#ff5124]">{icon}</span>
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <span className="mt-2 inline-flex items-center text-xs font-semibold text-[#ff5124] group-hover:translate-x-0.5 transition-transform">
        Open <ArrowRight className="ml-1 h-3 w-3" />
      </span>
    </Link>
  );
}
