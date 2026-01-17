import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, FileText, Eye, EyeOff, CheckCircle, XCircle, 
  ExternalLink, User, Image, MapPin, DollarSign, MessageSquare
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminListingsModeration, useAdminNotes } from '@/hooks/useAnalyticsEvents';
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
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ListingWithHost {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  mode: string;
  address: string | null;
  cover_image_url: string | null;
  image_urls: string[] | null;
  price_daily: number | null;
  price_sale: number | null;
  published_at: string | null;
  created_at: string;
  host_id: string;
  host: {
    full_name: string | null;
    email: string | null;
    identity_verified: boolean | null;
  } | null;
}

const AdminNotesSection = ({ entityType, entityId }: { entityType: string; entityId: string }) => {
  const { notes, isLoading, addNote, isAddingNote } = useAdminNotes(entityType, entityId);
  const [newNote, setNewNote] = useState('');

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote(newNote, {
      onSuccess: () => {
        setNewNote('');
        toast.success('Note added');
      },
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">Admin Notes</h4>
      
      <div className="flex gap-2">
        <Textarea 
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add internal note..."
          className="text-sm"
          rows={2}
        />
        <Button 
          size="sm" 
          onClick={handleAddNote}
          disabled={isAddingNote || !newNote.trim()}
        >
          Add
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-16" />
      ) : notes.length > 0 ? (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="text-xs p-2 bg-muted rounded">
              <p>{note.note}</p>
              <p className="text-muted-foreground mt-1">
                {new Date(note.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No notes yet</p>
      )}
    </div>
  );
};

const ListingModerationCard = ({ 
  listing, 
  onStatusChange,
  isUpdating 
}: { 
  listing: ListingWithHost;
  onStatusChange: (id: string, status: 'published' | 'paused' | 'draft') => void;
  isUpdating: boolean;
}) => {
  const [showNotes, setShowNotes] = useState(false);

  const formatPrice = () => {
    if (listing.mode === 'sale' && listing.price_sale) {
      return `$${listing.price_sale.toLocaleString()}`;
    }
    if (listing.price_daily) {
      return `$${listing.price_daily}/day`;
    }
    return 'No price';
  };

  const photoCount = (listing.image_urls?.length || 0) + (listing.cover_image_url ? 1 : 0);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
            {listing.cover_image_url ? (
              <img 
                src={listing.cover_image_url} 
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <Link 
                  to={`/listing/${listing.id}`}
                  className="font-semibold text-foreground hover:underline flex items-center gap-1"
                  target="_blank"
                >
                  {listing.title}
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Badge variant="outline" className="text-xs">
                    {listing.category.replace('_', ' ')}
                  </Badge>
                  <Badge variant={listing.mode === 'rent' ? 'secondary' : 'default'} className="text-xs">
                    {listing.mode}
                  </Badge>
                  <span>{formatPrice()}</span>
                </div>
              </div>
              
              <Badge 
                variant={listing.status === 'published' ? 'default' : 'secondary'}
                className={listing.status === 'published' ? 'bg-emerald-500' : ''}
              >
                {listing.status}
              </Badge>
            </div>

            {/* Host info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{listing.host?.full_name || 'Unknown'}</span>
                {listing.host?.identity_verified ? (
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-amber-500" />
                )}
              </div>
              {listing.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{listing.address}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Image className="h-3 w-3" />
                <span>{photoCount} photos</span>
              </div>
            </div>

            {/* Quality flags */}
            <div className="flex items-center gap-2 mb-3">
              {!listing.host?.identity_verified && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                  Unverified host
                </Badge>
              )}
              {photoCount < 3 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                  Low photos
                </Badge>
              )}
              {!listing.address && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                  No location
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {listing.status === 'published' ? (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onStatusChange(listing.id, 'paused')}
                  disabled={isUpdating}
                >
                  <EyeOff className="h-3 w-3 mr-1" />
                  Unlist
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => onStatusChange(listing.id, 'published')}
                  disabled={isUpdating}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              )}
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Notes
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Notes for {listing.title}</DialogTitle>
                  </DialogHeader>
                  <AdminNotesSection entityType="listing" entityId={listing.id} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminListings = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'flagged'>('all');

  const { listings, isLoading, updateListing, isUpdating, stats } = useAdminListingsModeration();

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

  const handleStatusChange = (id: string, status: 'published' | 'paused' | 'draft') => {
    updateListing({ id, status }, {
      onSuccess: () => {
        toast.success(`Listing ${status === 'published' ? 'approved' : 'unlisted'}`);
      },
      onError: () => {
        toast.error('Failed to update listing');
      },
    });
  };

  const filteredListings = listings.filter((l: any) => {
    if (filter === 'new') {
      if (!l.published_at) return false;
      const pubDate = new Date(l.published_at);
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return pubDate > dayAgo;
    }
    if (filter === 'flagged') {
      const photoCount = (l.image_urls?.length || 0) + (l.cover_image_url ? 1 : 0);
      return !l.host?.identity_verified || photoCount < 3 || !l.address;
    }
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
              <Skeleton key={i} className="h-32" />
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
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Listings Moderation</h1>
              <p className="text-muted-foreground">Review and approve listings</p>
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
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('new')}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">New (24h)</p>
              <p className="text-2xl font-bold text-blue-600">{stats.recentlyPublished}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('flagged')}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Unverified Hosts</p>
              <p className="text-2xl font-bold text-amber-600">{stats.unverifiedHosts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Missing Photos</p>
              <p className="text-2xl font-bold text-amber-600">{stats.missingPhotos}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          <Button 
            size="sm" 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'new' ? 'default' : 'outline'}
            onClick={() => setFilter('new')}
          >
            New (24h)
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'flagged' ? 'default' : 'outline'}
            onClick={() => setFilter('flagged')}
          >
            Flagged
          </Button>
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No listings to review</h3>
              <p className="text-muted-foreground">All listings have been reviewed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredListings.map((listing: any) => (
              <ListingModerationCard
                key={listing.id}
                listing={listing}
                onStatusChange={handleStatusChange}
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

export default AdminListings;
