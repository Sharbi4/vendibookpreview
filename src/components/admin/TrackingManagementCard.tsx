import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Package, Truck, Save, X, Edit2, 
  ExternalLink, Calendar, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SaleTransaction } from '@/hooks/useSaleTransactions';

interface TrackingManagementCardProps {
  transaction: SaleTransaction;
  onUpdateTracking: (params: {
    transactionId: string;
    trackingData: {
      shipping_status?: string;
      tracking_number?: string;
      carrier?: string;
      tracking_url?: string;
      shipped_at?: string;
      estimated_delivery_date?: string;
      delivered_at?: string;
      shipping_notes?: string;
    };
  }) => void;
  isUpdating: boolean;
}

const SHIPPING_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending Shipment' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'exception', label: 'Delivery Exception' },
];

const CARRIER_OPTIONS = [
  { value: 'ups', label: 'UPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'usps', label: 'USPS' },
  { value: 'dhl', label: 'DHL' },
  { value: 'other', label: 'Other' },
  { value: 'vendibook_freight', label: 'VendiBook Freight' },
];

const TrackingManagementCard = ({ 
  transaction, 
  onUpdateTracking, 
  isUpdating 
}: TrackingManagementCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [trackingData, setTrackingData] = useState({
    shipping_status: transaction.shipping_status || 'pending',
    tracking_number: transaction.tracking_number || '',
    carrier: transaction.carrier || '',
    tracking_url: transaction.tracking_url || '',
    shipped_at: transaction.shipped_at ? transaction.shipped_at.slice(0, 16) : '',
    estimated_delivery_date: transaction.estimated_delivery_date || '',
    delivered_at: transaction.delivered_at ? transaction.delivered_at.slice(0, 16) : '',
    shipping_notes: transaction.shipping_notes || '',
  });

  const handleSave = () => {
    onUpdateTracking({
      transactionId: transaction.id,
      trackingData: {
        ...trackingData,
        shipped_at: trackingData.shipped_at || null,
        delivered_at: trackingData.delivered_at || null,
        estimated_delivery_date: trackingData.estimated_delivery_date || null,
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTrackingData({
      shipping_status: transaction.shipping_status || 'pending',
      tracking_number: transaction.tracking_number || '',
      carrier: transaction.carrier || '',
      tracking_url: transaction.tracking_url || '',
      shipped_at: transaction.shipped_at ? transaction.shipped_at.slice(0, 16) : '',
      estimated_delivery_date: transaction.estimated_delivery_date || '',
      delivered_at: transaction.delivered_at ? transaction.delivered_at.slice(0, 16) : '',
      shipping_notes: transaction.shipping_notes || '',
    });
    setIsEditing(false);
  };

  const statusColor = {
    pending: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-primary/10 text-primary',
    in_transit: 'bg-primary/10 text-primary',
    out_for_delivery: 'bg-emerald-100 text-emerald-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    exception: 'bg-destructive/10 text-destructive',
  };

  const needsTracking = transaction.fulfillment_type === 'delivery' || 
    transaction.fulfillment_type === 'vendibook_freight';

  if (!needsTracking) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{transaction.listing?.title || 'Unknown Listing'}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Order #{transaction.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <Badge className={statusColor[transaction.shipping_status as keyof typeof statusColor] || statusColor.pending}>
            {SHIPPING_STATUS_OPTIONS.find(s => s.value === transaction.shipping_status)?.label || 'Pending'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Buyer & Fulfillment Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={transaction.buyer?.avatar_url || undefined} />
              <AvatarFallback>
                {transaction.buyer?.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{transaction.buyer?.full_name || 'Unknown Buyer'}</p>
              <p className="text-xs text-muted-foreground">{transaction.buyer?.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Delivery Address</p>
              <p className="text-sm">{transaction.delivery_address || 'Not provided'}</p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Current Tracking Info */}
        {!isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Carrier</p>
                <p className="font-medium">
                  {CARRIER_OPTIONS.find(c => c.value === transaction.carrier)?.label || transaction.carrier || '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tracking #</p>
                <p className="font-mono">{transaction.tracking_number || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Shipped</p>
                <p className="font-medium">
                  {transaction.shipped_at 
                    ? format(new Date(transaction.shipped_at), 'MMM d, yyyy') 
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Delivery</p>
                <p className="font-medium">
                  {transaction.estimated_delivery_date 
                    ? format(new Date(transaction.estimated_delivery_date), 'MMM d, yyyy') 
                    : '-'}
                </p>
              </div>
            </div>

            {transaction.tracking_url && (
              <a 
                href={transaction.tracking_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View Tracking
              </a>
            )}

            {transaction.shipping_notes && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{transaction.shipping_notes}</p>
              </div>
            )}

            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit2 className="h-4 w-4 mr-2" />
              Update Tracking
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shipping Status</Label>
                <Select
                  value={trackingData.shipping_status}
                  onValueChange={(value) => setTrackingData(prev => ({ ...prev, shipping_status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select
                  value={trackingData.carrier}
                  onValueChange={(value) => setTrackingData(prev => ({ ...prev, carrier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIER_OPTIONS.map((carrier) => (
                      <SelectItem key={carrier.value} value={carrier.value}>
                        {carrier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  value={trackingData.tracking_number}
                  onChange={(e) => setTrackingData(prev => ({ ...prev, tracking_number: e.target.value }))}
                  placeholder="Enter tracking number"
                />
              </div>

              <div className="space-y-2">
                <Label>Tracking URL</Label>
                <Input
                  value={trackingData.tracking_url}
                  onChange={(e) => setTrackingData(prev => ({ ...prev, tracking_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Shipped At</Label>
                <Input
                  type="datetime-local"
                  value={trackingData.shipped_at}
                  onChange={(e) => setTrackingData(prev => ({ ...prev, shipped_at: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Estimated Delivery Date</Label>
                <Input
                  type="date"
                  value={trackingData.estimated_delivery_date}
                  onChange={(e) => setTrackingData(prev => ({ ...prev, estimated_delivery_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Delivered At</Label>
                <Input
                  type="datetime-local"
                  value={trackingData.delivered_at}
                  onChange={(e) => setTrackingData(prev => ({ ...prev, delivered_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Shipping Notes</Label>
              <Textarea
                value={trackingData.shipping_notes}
                onChange={(e) => setTrackingData(prev => ({ ...prev, shipping_notes: e.target.value }))}
                placeholder="Add notes about this shipment..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isUpdating} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackingManagementCard;