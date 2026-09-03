import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAdminUsers, useAdminUserStats } from "@/hooks/useAdminUsers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import AdminSectionNav from "@/components/admin/AdminSectionNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Loader2, Mail, ShieldCheck, FileText } from "lucide-react";

type RoleFilter = "all" | "host" | "shopper" | "admin" | "verified";

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "host", label: "Hosts & sellers" },
  { key: "shopper", label: "Shoppers" },
  { key: "admin", label: "Admins" },
  { key: "verified", label: "ID verified" },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [visible, setVisible] = useState(50);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (cancelled) return;
      if (!data) {
        navigate("/");
        return;
      }
      setIsAdmin(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  const { data: users, isLoading } = useAdminUsers();
  const stats = useAdminUserStats(users);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users || []).filter((u) => {
      if (roleFilter === "verified" && !u.identity_verified) return false;
      if (roleFilter !== "all" && roleFilter !== "verified" && !u.roles.includes(roleFilter))
        return false;
      if (!q) return true;
      return [u.full_name, u.display_name, u.email, u.id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, search, roleFilter]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Admin · Users"
        description="Internal admin view of Vendibook accounts."
        noindex
      />
      <Header />
      <main className="container mx-auto px-4 py-8">
        <AdminSectionNav />

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground text-sm">
              Every account, their roles, and what they've listed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total accounts", value: stats.total },
            { label: "Hosts & sellers", value: stats.hosts },
            { label: "ID verified", value: stats.verified },
            { label: "Admins", value: stats.admins },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisible(50);
            }}
            placeholder="Search name, email, or user ID"
            className="h-11 md:max-w-sm text-base md:text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map((f) => (
              <Button
                key={f.key}
                type="button"
                size="sm"
                variant={roleFilter === f.key ? "default" : "outline"}
                onClick={() => {
                  setRoleFilter(f.key);
                  setVisible(50);
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No accounts match those filters.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {filtered.slice(0, visible).map((u) => (
                <Card key={u.id}>
                  <CardContent className="py-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">
                          {u.full_name || u.display_name || "Unnamed account"}
                        </span>
                        {u.identity_verified && (
                          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/30">
                            <ShieldCheck className="h-3 w-3" /> Verified
                          </Badge>
                        )}
                        {u.roles.map((r) => (
                          <Badge key={r} variant="secondary" className="capitalize">
                            {r}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {u.email ? (
                          <a href={`mailto:${u.email}`} className="hover:text-foreground">
                            {u.email}
                          </a>
                        ) : (
                          "No email on file"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined {formatDate(u.created_at)} · {u.listing_count} listings ·{" "}
                        {u.draft_count} drafts
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.email && (
                        <Button asChild size="sm" variant="outline">
                          <a href={`mailto:${u.email}`}>
                            <Mail className="h-4 w-4 mr-1.5" /> Email
                          </a>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/listings?host=${u.id}`}>
                          <FileText className="h-4 w-4 mr-1.5" /> Listings
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {filtered.length > visible && (
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={() => setVisible((v) => v + 50)}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
