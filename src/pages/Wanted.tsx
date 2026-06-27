import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, DollarSign, Calendar, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface WantedRequest {
  id: string;
  asset_type: string;
  city: string;
  state: string | null;
  budget_min: number | null;
  budget_max: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  title: string | null;
  created_at: string;
}

const ASSET_TYPES = [
  { value: 'food-truck', label: 'Food Truck' },
  { value: 'food-trailer', label: 'Food Trailer' },
  { value: 'commercial-kitchen', label: 'Commercial Kitchen' },
  { value: 'vendor-space', label: 'Vendor Space' },
  { value: 'ghost-kitchen', label: 'Ghost Kitchen' },
];

const Wanted = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<WantedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const [form, setForm] = useState({
    title: '',
    asset_type: '',
    city: '',
    state: '',
    budget_min: '',
    budget_max: '',
    start_date: '',
    end_date: '',
    notes: '',
    email: '',
    phone: '',
  });

  const load = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from('asset_requests_public')
      .select('id, asset_type, city, state, budget_min, budget_max, start_date, end_date, notes, title, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filterType !== 'all') q = q.eq('asset_type', filterType);
    const { data } = await q;
    setRequests((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterType]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_type || !form.city) {
      toast({ title: 'Missing info', description: 'Asset type and city are required.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('asset_requests').insert({
      ...form,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      user_id: user?.id || null,
      email: form.email || user?.email || null,
      is_public: true,
      status: 'new',
    } as any);
    if (error) {
      toast({ title: 'Could not post', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Posted! 🎯', description: 'Hosts in your area will be notified.' });
    setShowForm(false);
    setForm({ title: '', asset_type: '', city: '', state: '', budget_min: '', budget_max: '', start_date: '', end_date: '', notes: '', email: '', phone: '' });
    load();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Wanted Board — Find Hosts for Your Food Business | Vendibook"
        description="Post what you need — food truck, kitchen, vendor space — and get matched with verified hosts. Free demand board for food entrepreneurs."
        canonical="/wanted"
      />
      <Header />
      <main className="flex-1 container py-8 md:py-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Wanted Board</h1>
            <p className="text-muted-foreground max-w-2xl">
              Can't find what you need? Post your requirements and let verified hosts come to you.
              Free, public, and matched in real-time.
            </p>
          </div>
          <Button variant="dark-shine" onClick={() => setShowForm((v) => !v)} size="lg">
            <Plus className="h-4 w-4 mr-1.5" />
            {showForm ? 'Close' : 'Post a Wanted'}
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader><CardTitle>What are you looking for?</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Headline *</Label>
                  <Input placeholder="e.g. Need a food truck in Houston for July weekends" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Asset type *</Label>
                  <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>City *</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="TX" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Budget min ($)</Label><Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} /></div>
                  <div><Label>Budget max ($)</Label><Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>End date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
                <div className="md:col-span-2">
                  <Label>Details</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Tell hosts more about your event, business type, requirements…" />
                </div>
                {!user && (
                  <>
                    <div><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                    <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  </>
                )}
                <div className="md:col-span-2">
                  <Button type="submit" variant="dark-shine" className="w-full">Post to Wanted Board</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <Label className="shrink-0">Filter:</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No active requests in this category. Be the first to post!
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((r) => (
              <Card key={r.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base line-clamp-2">{r.title || `${ASSET_TYPES.find(t => t.value === r.asset_type)?.label || r.asset_type} wanted`}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />{r.city}{r.state ? `, ${r.state}` : ''}
                  </div>
                  {(r.budget_min || r.budget_max) && (
                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                      <DollarSign className="h-3.5 w-3.5" />
                      {r.budget_min ? `$${r.budget_min.toLocaleString()}` : '$0'} – {r.budget_max ? `$${r.budget_max.toLocaleString()}` : '∞'}
                    </div>
                  )}
                  {r.start_date && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(r.start_date).toLocaleDateString()}{r.end_date ? ` – ${new Date(r.end_date).toLocaleDateString()}` : ''}
                    </div>
                  )}
                  {r.notes && <p className="text-muted-foreground line-clamp-3 pt-1">{r.notes}</p>}
                  <div className="pt-2">
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link to={`/list?match=${r.id}`}>I can help</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Wanted;
