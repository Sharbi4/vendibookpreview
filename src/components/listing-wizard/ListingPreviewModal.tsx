import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, MapPin, Zap, Check, DollarSign, Truck, Calendar, 
  ShieldCheck, Star, Clock, Package, Building2, LayoutGrid, FileText,
  Scale, Ruler, CreditCard, Banknote
} from 'lucide-react';
import { CATEGORY_LABELS, MODE_LABELS, ListingCategory, FulfillmentType } from '@/types/listing';
import { cn } from '@/lib/utils';
import { ListingCardPreview } from './ListingCardPreview';

interface ListingPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    title: string;
    description: string;
    category: ListingCategory;
    mode: 'rent' | 'sale';
    images: string[];
    priceDaily: string;
    priceWeekly: string;
    priceSale: string;
    address: string;
    pickupLocationText: string;
    highlights: string[];
    amenities: string[];
    instantBook: boolean;
    fulfillmentType: FulfillmentType | null;
    deliveryFee: string;
    deliveryRadiusMiles: string;
    depositAmount?: string;
    weightLbs?: string;
    lengthInches?: string;
    widthInches?: string;
    heightInches?: string;
    hoursOfAccess?: string;
    availableFrom?: string;
    availableTo?: string;
    acceptCardPayment?: boolean;
    acceptCashPayment?: boolean;
  };
  host?: {
    name: string;
    avatar: string | null;
    memberSince: string;
    isVerified: boolean;
  };
}

export const ListingPreviewModal: React.FC<ListingPreviewModalProps> = ({
  open,
  onOpenChange,
  listing,
  host,
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'detail'>('card');
  
  const location = listing.address || listing.pickupLocationText || 'Location not specified';
  const locationShort = location?.split(',').slice(-2).join(',').trim() || location;
  const priceDisplay = listing.mode === 'sale' 
    ? `$${parseFloat(listing.priceSale || '0').toLocaleString()}`
    : `$${parseFloat(listing.priceDaily || '0').toLocaleString()}/day`;

  const hostInitials = host?.name
    ? host.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'HO';

  const isRental = listing.mode === 'rent';
  const showDimensions = (listing.category === 'food_truck' || listing.category === 'food_trailer') && 
    (listing.weightLbs || listing.lengthInches);

  // Format dimensions as feet
  const formatDimension = (inches: string | undefined) => {
    if (!inches) return null;
    const ft = Math.round(parseFloat(inches) / 12);
    return `${ft}'`;
  };

  const dimensionsDisplay = showDimensions && listing.lengthInches && listing.widthInches && listing.heightInches
    ? `${formatDimension(listing.lengthInches)} × ${formatDimension(listing.widthInches)} × ${formatDimension(listing.heightInches)}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Listing Preview</DialogTitle>
        </DialogHeader>
        
        {/* Tabs for switching between card and detail preview */}
        <div className="sticky top-0 z-20 bg-background border-b px-6 pt-4 pb-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'card' | 'detail')}>
            <TabsList className="grid w-full max-w-xs mx-auto grid-cols-2">
              <TabsTrigger value="card" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Card View
              </TabsTrigger>
              <TabsTrigger value="detail" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Full Detail
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="max-h-[calc(90vh-60px)]">
          {activeTab === 'card' ? (
            /* Card Preview */
            <div className="p-8 flex items-center justify-center min-h-[400px]">
              <ListingCardPreview
                listing={{
                  title: listing.title,
                  mode: listing.mode,
                  category: listing.category,
                  images: listing.images,
                  priceDaily: listing.priceDaily,
                  priceWeekly: listing.priceWeekly,
                  priceSale: listing.priceSale,
                  address: listing.address,
                  pickupLocationText: listing.pickupLocationText,
                  amenities: listing.amenities,
                  instantBook: listing.instantBook,
                  fulfillmentType: listing.fulfillmentType,
                  deliveryFee: listing.deliveryFee,
                  deliveryRadiusMiles: listing.deliveryRadiusMiles,
                }}
                hostVerified={host?.isVerified}
              />
            </div>
          ) : (
            /* Full Detail Preview */
            <>
              {/* Photo Gallery Preview */}
              <div className="grid grid-cols-4 gap-1">
                {/* Main Image */}
                <div className="col-span-4 md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto relative">
                  {listing.images[0] ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">No image</span>
                    </div>
                  )}
                  {/* Mode Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-sm",
                      listing.mode === 'rent'
                        ? "bg-blue-500/90 text-white"
                        : "bg-green-500/90 text-white"
                    )}>
                      {MODE_LABELS[listing.mode]}
                    </span>
                  </div>
                  {/* Preview Label */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-black/70 text-white">
                      Preview
                    </span>
                  </div>
                </div>

                {/* Secondary Images */}
                {listing.images.slice(1, 5).map((img, idx) => (
                  <div key={idx} className="hidden md:block aspect-square relative">
                    <img
                      src={img}
                      alt={`${listing.title} ${idx + 2}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 3 && listing.images.length > 5 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          +{listing.images.length - 5} more
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Header - Matching ListingDetail layout */}
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORY_LABELS[listing.category]}
                    </Badge>
                    <Badge variant={isRental ? 'default' : 'outline'} className="text-xs">
                      For {isRental ? 'Rent' : 'Sale'}
                    </Badge>
                    {listing.instantBook && isRental && (
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                        Instant Book
                      </Badge>
                    )}
                  </div>
                  
                  {/* Title */}
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
                    {listing.title || 'Untitled Listing'}
                  </h1>
                  
                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{locationShort}</span>
                  </div>
                </div>

                {/* Quick Highlights - Matching ListingDetail */}
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex flex-wrap gap-2">
                    {listing.fulfillmentType && (
                      <Badge variant="secondary" className="gap-1.5">
                        {listing.fulfillmentType === 'delivery' ? <Truck className="w-3 h-3" /> : 
                         listing.fulfillmentType === 'on_site' ? <Building2 className="w-3 h-3" /> : 
                         <MapPin className="w-3 h-3" />}
                        {listing.fulfillmentType === 'pickup' ? 'Pickup' : 
                         listing.fulfillmentType === 'delivery' ? 'Delivery' : 
                         listing.fulfillmentType === 'both' ? 'Pickup & Delivery' : 'On-site Access'}
                      </Badge>
                    )}
                    {listing.instantBook && isRental && (
                      <Badge variant="secondary" className="gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                        <Zap className="w-3 h-3" />
                        Instant Book
                      </Badge>
                    )}
                    {listing.deliveryFee && parseFloat(listing.deliveryFee) > 0 && (
                      <Badge variant="secondary" className="gap-1.5">
                        <Truck className="w-3 h-3" />
                        ${listing.deliveryFee} delivery
                      </Badge>
                    )}
                    {listing.deliveryRadiusMiles && (
                      <Badge variant="secondary" className="gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {listing.deliveryRadiusMiles} mi radius
                      </Badge>
                    )}
                    {listing.hoursOfAccess && (
                      <Badge variant="secondary" className="gap-1.5">
                        <Clock className="w-3 h-3" />
                        {listing.hoursOfAccess}
                      </Badge>
                    )}
                    {showDimensions && listing.weightLbs && (
                      <Badge variant="secondary" className="gap-1.5">
                        <Scale className="w-3 h-3" />
                        {parseFloat(listing.weightLbs).toLocaleString()} lbs
                      </Badge>
                    )}
                    {dimensionsDisplay && (
                      <Badge variant="secondary" className="gap-1.5">
                        <Ruler className="w-3 h-3" />
                        {dimensionsDisplay}
                      </Badge>
                    )}
                    {/* Host Highlights */}
                    {listing.highlights.slice(0, 3).map((highlight, i) => (
                      <Badge key={i} variant="secondary" className="gap-1.5">
                        <Check className="w-3 h-3 text-primary" />
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                    {listing.description || 'No description provided.'}
                  </p>
                </div>

                {/* Amenities */}
                {listing.amenities.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Features & Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {listing.amenities.map((amenity, i) => (
                        <Badge key={i} variant="outline" className="capitalize text-xs">
                          {amenity.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing Section - Matching ListingDetail */}
                <div className="p-4 bg-muted/30 rounded-xl">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Pricing
                  </h3>
                  <div className="space-y-2">
                    {listing.mode === 'rent' ? (
                      <>
                        {listing.priceDaily && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">Daily rate</span>
                            <span className="font-medium">${parseFloat(listing.priceDaily).toLocaleString()}/day</span>
                          </div>
                        )}
                        {listing.priceWeekly && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">Weekly rate</span>
                            <span className="font-medium">${parseFloat(listing.priceWeekly).toLocaleString()}/week</span>
                          </div>
                        )}
                        {listing.depositAmount && parseFloat(listing.depositAmount) > 0 && (
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Security deposit
                            </span>
                            <span className="font-medium">${parseFloat(listing.depositAmount).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Sale price</span>
                        <span className="font-semibold text-lg">${parseFloat(listing.priceSale || '0').toLocaleString()}</span>
                      </div>
                    )}
                    {listing.deliveryFee && parseFloat(listing.deliveryFee) > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" />
                          Delivery fee
                        </span>
                        <span className="font-medium">${listing.deliveryFee}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Methods */}
                  {(listing.acceptCardPayment || listing.acceptCashPayment) && (
                    <div className="mt-4 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Accepted payment methods</p>
                      <div className="flex gap-2">
                        {listing.acceptCardPayment && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <CreditCard className="w-3 h-3" />
                            Card
                          </Badge>
                        )}
                        {listing.acceptCashPayment && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Banknote className="w-3 h-3" />
                            Cash
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Availability - Rentals Only */}
                {isRental && (listing.availableFrom || listing.availableTo) && (
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Availability
                    </h3>
                    <div className="space-y-2 text-sm">
                      {listing.availableFrom && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Available from</span>
                          <span className="font-medium">{new Date(listing.availableFrom).toLocaleDateString()}</span>
                        </div>
                      )}
                      {listing.availableTo && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Available until</span>
                          <span className="font-medium">{new Date(listing.availableTo).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Host Card Preview */}
                {host && (
                  <div className="border-t pt-6">
                    <div className="bg-card border border-border rounded-xl p-4">
                      <h3 className="font-semibold text-foreground mb-3">About the Host</h3>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={host.avatar || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {hostInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{host.name || 'Host'}</span>
                            {host.isVerified && (
                              <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Member since {new Date(host.memberSince).getFullYear()}
                          </p>
                        </div>
                      </div>
                      {/* Trust badges */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {host.isVerified && (
                          <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-600 bg-emerald-50/50">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Verified ID
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs border-primary/50 text-primary bg-primary/5">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Secure Payments
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </ScrollArea>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
};
