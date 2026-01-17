import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, AlertTriangle, User, FileText, Clock, 
  CheckCircle, XCircle, Eye, MessageSquare
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRiskFlags } from '@/hooks/useAnalyticsEvents';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RiskFlag {
  id: string;
  user_id: string | null;
  listing_id: string | null;
  flag_type: string;
  severity: string;
  description: string | null;
  metadata: Record<string, unknown>;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

const FlagTypeLabels: Record<string, string> = {
  spam_messages: 'Spam Messages',
  duplicate_listing: 'Duplicate Listing',
  suspicious_payout: 'Suspicious Payout',
  identity_mismatch: 'Identity Mismatch',
  rapid_booking: 'Rapid Booking Pattern',
  price_manipulation: 'Price Manipulation',
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const variants: Record<string, { className: string; label: string }> = {
    low: { className: 'bg-blue-100 text-blue-700', label: 'Low' },
    medium: { className: 'bg-amber-100 text-amber-700', label: 'Medium' },
    high: { className: 'bg-orange-100 text-orange-700', label: 'High' },
    critical: { className: 'bg-red-100 text-red-700', label: 'Critical' },
  };
  
  const variant = variants[severity] || variants.medium;
  return <Badge className={variant.className}>{variant.label}</Badge>;
};

const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { className: string; label: string }> = {
    open: { className: 'bg-amber-100 text-amber-700', label: 'Open' },
    investigating: { className: 'bg-blue-100 text-blue-700', label: 'Investigating' },
    resolved: { className: 'bg-emerald-100 text-emerald-700', label: 'Resolved' },
    dismissed: { className: 'bg-gray-100 text-gray-700', label: 'Dismissed' },
  };
  
  const variant = variants[status] || variants.open;
  return <Badge className={variant.className}>{variant.label}</Badge>;
};

const RiskFlagCard = ({ 
  flag, 
  onUpdate,
  isUpdating 
}: { 
  flag: RiskFlag;
  onUpdate: (params: { id: string; status: string; resolution_notes?: string }) => void;
  isUpdating: boolean;
}) => {
  const [showResolve, setShowResolve] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newStatus, setNewStatus] = useState('resolved');

  const handleResolve = () => {
    onUpdate({
      id: flag.id,
      status: newStatus,
      resolution_notes: resolutionNotes,
    });
    setShowResolve(false);
    setResolutionNotes('');
  };

  return (
    <Card className={flag.severity === 'critical' ? 'border-red-200' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-4 w-4 ${
                flag.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
              }`} />
              <span className="font-semibold">
                {FlagTypeLabels[flag.flag_type] || flag.flag_type}
              </span>
              <SeverityBadge severity={flag.severity} />
              <StatusBadge status={flag.status} />
            </div>

            {flag.description && (
              <p className="text-sm text-muted-foreground mb-2">{flag.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(flag.created_at), 'MMM d, h:mm a')}</span>
              </div>
              {flag.user_id && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>User: {flag.user_id.slice(0, 8)}...</span>
                </div>
              )}
              {flag.listing_id && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>Listing: {flag.listing_id.slice(0, 8)}...</span>
                </div>
              )}
            </div>

            {flag.resolution_notes && (
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                <span className="font-medium">Resolution: </span>
                {flag.resolution_notes}
              </div>
            )}
          </div>

          {flag.status === 'open' || flag.status === 'investigating' ? (
            <div className="flex items-center gap-2">
              {flag.status === 'open' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdate({ id: flag.id, status: 'investigating' })}
                  disabled={isUpdating}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Investigate
                </Button>
              )}
              
              <Dialog open={showResolve} onOpenChange={setShowResolve}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Resolve Risk Flag</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resolved">Resolved - Action Taken</SelectItem>
                          <SelectItem value="dismissed">Dismissed - False Positive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Resolution Notes</label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Describe the action taken or reason for dismissal..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowResolve(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleResolve} disabled={isUpdating}>
                      Submit
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

const AdminRisk = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'critical'>('open');

  const { flags, isLoading, updateFlag, isUpdating, stats } = useAdminRiskFlags();

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsCheckingAdmin(false);
        return;
      }
      
      const { data } = await supabase.rpc('is_admin', { user_id: user.id });
      setIsAdmin(!!data);
      setIsCheckingAdmin(false);
    };
    
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin && user) {
      navigate('/');
    }
  }, [isAdmin, isCheckingAdmin, user, navigate]);

  const handleUpdate = (params: { id: string; status: string; resolution_notes?: string }) => {
    updateFlag(params, {
      onSuccess: () => {
        toast.success('Flag updated');
      },
      onError: () => {
        toast.error('Failed to update flag');
      },
    });
  };

  const filteredFlags = flags.filter(f => {
    if (filter === 'open') return f.status === 'open' || f.status === 'investigating';
    if (filter === 'critical') return f.severity === 'critical' && f.status !== 'resolved' && f.status !== 'dismissed';
    return true;
  });

  if (authLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Shield className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Risk & Fraud Monitoring</h1>
              <p className="text-muted-foreground">Review suspicious activity and fraud flags</p>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => navigate('/admin/metrics')}>
            Back to Metrics
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('all')}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Flags</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('open')}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Open</p>
              <p className="text-2xl font-bold text-amber-600">{stats.open}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Investigating</p>
              <p className="text-2xl font-bold text-blue-600">{stats.investigating}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('critical')}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Critical Open</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          <Button 
            size="sm" 
            variant={filter === 'open' ? 'default' : 'outline'}
            onClick={() => setFilter('open')}
          >
            Open
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'critical' ? 'default' : 'outline'}
            onClick={() => setFilter('critical')}
          >
            Critical
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>

        {/* Flags */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : filteredFlags.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No risk flags</h3>
              <p className="text-muted-foreground">
                {filter === 'open' 
                  ? 'No open flags to review.' 
                  : filter === 'critical'
                  ? 'No critical flags.'
                  : 'No flags have been recorded.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFlags.map((flag: any) => (
              <RiskFlagCard
                key={flag.id}
                flag={flag as RiskFlag}
                onUpdate={handleUpdate}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminRisk;
