import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Factory, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { AuthFormPanel } from '@/components/auth/AuthFormPanel';
import { useAuth } from '@/contexts/AuthContext';

const DEST = '/partner/build-studio';

/** Sign-in entry for Build Studio manufacturing partners. Uses the normal Vendibook account; access comes from admin-granted partner membership. */
export default function PartnerLogin() {
  const { user, isLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'verify'>('signin');
  useEffect(() => {
    if (params.get('redirect') !== DEST) setParams({ redirect: DEST }, { replace: true });
  }, [params, setParams]);

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (user) return <Navigate to={DEST} replace />;

  return <div className="min-h-screen flex flex-col bg-background">
    <SEO title="Manufacturer partner sign in | Vendibook Build Studio" description="Sign in to manage your Build Studio catalog, pricing, delivery and engineering reviews." canonical="/partner/login" noindex />
    <Header />
    <main className="flex-1 container grid max-w-5xl gap-10 py-12 lg:grid-cols-2">
      <section className="space-y-4">
        <Factory className="h-8 w-8 text-primary" aria-hidden />
        <p className="text-xs uppercase tracking-widest text-primary">Build Studio · Manufacturer partners</p>
        <h1 className="text-3xl font-semibold text-foreground">Partner sign in</h1>
        <p className="text-muted-foreground">Manage your trailer and truck models, equipment, prices and delivery fees, and review customer builds sent to you for engineering review.</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Use the email Vendibook added to your manufacturer account.</li>
          <li>You only ever see your own catalog and the builds assigned to you.</li>
          <li>New partner? Email support@vendibook.com and we'll set up your account.</li>
        </ul>
      </section>
      <section className="rounded-2xl border border-border p-6">
        <AuthFormPanel mode={mode} setMode={setMode} />
      </section>
    </main>
  </div>;
}
