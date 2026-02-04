import { Link } from 'react-router-dom';
import { MoreHorizontal, Eye, Edit2, Pause, Play, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CATEGORY_LABELS } from '@/types/listing';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

interface OperationsTableProps {
  listings: Listing[];
  onPublish: (id: string) => void;
  onPause: (id: string) => void;
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'published':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'paused':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'draft':
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const OperationsTable = ({ listings, onPublish, onPause }: OperationsTableProps) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Asset Name</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Performance</TableHead>
            <TableHead className="font-semibold text-right">Price</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing) => (
            <TableRow key={listing.id} className="group">
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={listing.cover_image_url || '/placeholder.svg'}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Link 
                    to={`/listing/${listing.id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                  >
                    {listing.title}
                  </Link>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="secondary" 
                  className={`capitalize text-xs ${getStatusBadgeClass(listing.status)}`}
                >
                  {listing.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground capitalize">
                {CATEGORY_LABELS[listing.category] || listing.category.replace('_', ' ')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  <span className="text-sm">{listing.view_count?.toLocaleString() || 0}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-medium text-foreground">
                  ${listing.mode === 'rent' 
                    ? listing.price_daily?.toLocaleString() 
                    : listing.price_sale?.toLocaleString()}
                </span>
                {listing.mode === 'rent' && (
                  <span className="text-xs text-muted-foreground">/day</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to={`/listing/${listing.id}`} className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        View Listing
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/create-listing/${listing.id}`} className="flex items-center gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {listing.status === 'published' ? (
                      <DropdownMenuItem onClick={() => onPause(listing.id)} className="flex items-center gap-2">
                        <Pause className="h-4 w-4" />
                        Pause Listing
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onPublish(listing.id)} className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Publish
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
