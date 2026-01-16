import { useState } from 'react';
import { format } from 'date-fns';
import { Zap, FileCheck, Clock, CheckCircle2, XCircle, ExternalLink, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { InstantBooking } from '@/hooks/useAdminInstantBookings';

interface InstantBookMonitorCardProps {
  booking: InstantBooking;
}

const getDocumentStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-amber-100 text-amber-700 border-amber-200';
  }
};

const getBookingStatusBadge = (booking: InstantBooking) => {
  const hasRejectedDocs = booking.documents?.some(d => d.status === 'rejected');
  const hasPendingDocs = booking.documents?.some(d => d.status === 'pending');
  const allDocsApproved = booking.documents?.length > 0 && booking.documents.every(d => d.status === 'approved');

  if (hasRejectedDocs) {
    return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Docs Rejected</Badge>;
  }
  if (hasPendingDocs) {
    return <Badge className="bg-amber-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Docs Pending</Badge>;
  }
  if (allDocsApproved) {
    return <Badge className="bg-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Docs Approved</Badge>;
  }
  if (booking.documents?.length === 0) {
    return <Badge variant="outline" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> No Docs</Badge>;
  }
  return <Badge variant="outline">{booking.status}</Badge>;
};

const InstantBookMonitorCard = ({ booking }: InstantBookMonitorCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const pendingCount = booking.documents?.filter(d => d.status === 'pending').length || 0;
  const approvedCount = booking.documents?.filter(d => d.status === 'approved').length || 0;
  const rejectedCount = booking.documents?.filter(d => d.status === 'rejected').length || 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Listing Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={booking.listing?.cover_image_url || '/placeholder.svg'}
                      alt={booking.listing?.title || 'Listing'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <h3 className="font-semibold text-foreground truncate">
                        {booking.listing?.title || 'Unknown Listing'}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Renter: {booking.shopper?.full_name || 'Unknown'} • Host: {booking.host?.full_name || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <span className="text-muted-foreground">
                        {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                      </span>
                      <span className="text-foreground font-medium">
                        ${booking.total_price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {getBookingStatusBadge(booking)}
                  <Badge variant="outline" className={booking.payment_status === 'paid' ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'}>
                    {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                  </Badge>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 border-t pt-4 bg-muted/30">
              {/* Document Summary */}
              <div className="flex items-center gap-4 mb-4">
                <FileCheck className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Documents</span>
                <div className="flex items-center gap-2 text-sm">
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="h-3 w-3" /> {pendingCount} pending
                    </span>
                  )}
                  {approvedCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> {approvedCount} approved
                    </span>
                  )}
                  {rejectedCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-3 w-3" /> {rejectedCount} rejected
                    </span>
                  )}
                  {booking.documents?.length === 0 && (
                    <span className="text-muted-foreground">No documents uploaded yet</span>
                  )}
                </div>
              </div>

              {/* Document List */}
              {booking.documents && booking.documents.length > 0 && (
                <div className="space-y-2">
                  {booking.documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getDocumentStatusColor(doc.status)}>
                          {doc.status}
                        </Badge>
                        <span className="text-sm font-medium capitalize">
                          {doc.document_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Booking Details */}
              <div className="mt-4 p-3 bg-background rounded-lg border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Booking ID</span>
                    <p className="font-mono text-xs">{booking.id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Renter Email</span>
                    <p className="truncate">{booking.shopper?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Booking Status</span>
                    <p className="capitalize">{booking.status}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p>{format(new Date(booking.created_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default InstantBookMonitorCard;
