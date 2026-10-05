import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { supabase } from '@/integrations/supabase/client';
import { parseEdgeError } from '@/lib/edgeErrors';

/** Square sends the host back here after they approve the connection. */
export default function SquareConnectCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get('code');
    const oauthState = params.get('state');
    if (params.get('error') || !code || !oauthState) {
      setState('error');
      setMessage(params.get('error') === 'access_denied'
        ? 'You cancelled the Square connection. You can connect any time from payment setup.'
        : 'Square did not complete the connection. Please try again from payment setup.');
      return;
    }
    supabase.functions.invoke('square-seller-oauth', { body: { action: 'complete', code, state: oauthState } })
      .then(async ({ data, error }) => {
        if (error) {
          const parsed = await parseEdgeError(error);
          throw new Error(parsed?.message || 'Square could not complete the connection.');
        }
        setState('done');
        setMessage(data?.business_name ? `Connected ${data.business_name}.` : 'Your Square account is connected.');
        setTimeout(() => navigate(data?.return_path || '/dashboard/payments/setup', { replace: true }), 1500);
      })
      .catch((e) => { setState('error'); setMessage((e as Error).message); });
  }, [navigate, params]);

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <section className="v2-panel" aria-live="polite">
          <div className="flex items-start gap-3">
            {state === 'working' ? <Loader2 className="h-5 w-5 animate-spin" /> : state === 'done'
              ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {state === 'working' ? 'Connecting Square…' : state === 'done' ? 'Square connected' : "Square isn't connected"}
              </h1>
              {message ? <p className="mt-1 text-sm text-muted-foreground">{message}</p> : null}
              {state === 'error' ? (
                <Link to="/dashboard/payments/setup" className="v2-btn mt-3 inline-flex">Back to payment setup</Link>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
