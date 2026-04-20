import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Send, Eye, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';

export default function AdminDigest() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [preview, setPreview] = useState<{ subject: string; html: string; listingCount: number; cityCounts: { city: string; count: number }[] } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);

  if (authLoading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!user) { navigate('/auth'); return null; }
  if (!isAdmin) { navigate('/'); return null; }

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-marketplace-digest', { body: { dryRun: true } });
      if (error) throw error;
      setPreview(data);
    } catch (e: any) {
      toast.error(e.message || 'Preview failed');
    } finally {
      setLoadingPreview(false);
    }
  };

  const sendNow = async () => {
    if (!confirm('Send digest broadcast to your Resend audience now?')) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-marketplace-digest', { body: {} });
      if (error) throw error;
      toast.success(`Broadcast sent! ID: ${data.broadcastId}`);
    } catch (e: any) {
      toast.error(e.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Marketplace Digest</h1>
          </div>
          <p className="text-muted-foreground">Auto-generated email of new listings & trending cities. Sent via Resend Broadcasts every 2 days.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Clock className="h-4 w-4" />Schedule</div>
              <div className="font-semibold text-foreground">Every 2 days · 10am ET</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Status</div>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">Active</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Mail className="h-4 w-4" />Audience</div>
              <div className="font-semibold text-foreground">Resend General</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Manual controls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={loadPreview} disabled={loadingPreview}>
              {loadingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Preview next digest
            </Button>
            <Button onClick={sendNow} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send now
            </Button>
          </CardContent>
        </Card>

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Preview</span>
                <Badge variant="secondary">{preview.listingCount} listings</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Subject: <span className="font-medium text-foreground">{preview.subject}</span></p>
            </CardHeader>
            <CardContent>
              <iframe srcDoc={preview.html} title="Digest preview" className="w-full h-[700px] border border-border rounded-lg bg-white" />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
