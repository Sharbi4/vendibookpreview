import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Truck, 
  Calendar,
  Package,
  Clock,
  CheckCircle2,
  Loader2,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PhotoGallery from '@/components/listing-detail/PhotoGallery';
import BookingForm from '@/components/listing-detail/BookingForm';
import InquiryForm from '@/components/listing-detail/InquiryForm';
import HostCard from '@/components/listing-detail/HostCard';
import { AmenitiesSection } from '@/components/listing-detail/AmenitiesSection';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import { RequiredDocumentsSection } from '@/components/documents';
import { useListing } from '@/hooks/useListing';
import { useListingAverageRating } from '@/hooks/useReviews';
import { CATEGORY_LABELS, FULFILLMENT_LABELS } from '@/types/listing';
import MessageHostButton from '@/components/messaging/MessageHostButton';

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { listing, host, isLoading, error } = useListing(id);
  const { data: ratingData } = useListingAverageRating(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {error || 'Listing not found'}
          </h1>
          <p className="text-muted-foreground mb-8">
            This listing may have been removed or is no longer available.
          </p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to listings
            </Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const images = listing.image_urls || (listing.cover_image_url ? [listing.cover_image_url] : []);
  const location = listing.address || listing.pickup_location_text;
  const isRental = listing.mode === 'rent';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Back Button */}
        <div className="container pt-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to listings
            </Link>
          </Button>
        </div>

        {/* Photo Gallery */}
        <div className="container py-6">
          <PhotoGallery images={images} title={listing.title} />
        </div>

        {/* Main Content */}
        <div className="container pb-16">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title & Location */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {CATEGORY_LABELS[listing.category]}
                  </span>
                  <span className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">
                    For {isRental ? 'Rent' : 'Sale'}
                  </span>
                </div>
                
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {listing.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4">
                  {location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{location}</span>
                    </div>
                  )}
                  
                  {ratingData && (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{ratingData.average}</span>
                      <span className="text-muted-foreground">
                        ({ratingData.count} review{ratingData.count !== 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium text-foreground">
                      {CATEGORY_LABELS[listing.category]}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fulfillment</p>
                    <p className="font-medium text-foreground">
                      {FULFILLMENT_LABELS[listing.fulfillment_type]}
                    </p>
                  </div>
                </div>

                {isRental && listing.available_from && (
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="font-medium text-foreground">
                        {new Date(listing.available_from).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  About this listing
                </h2>
                <p className="text-muted-foreground whitespace-pre-line">
                  {listing.description}
                </p>
              </div>

              {/* Highlights */}
              {listing.highlights && listing.highlights.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-3">
                    Highlights
                  </h2>
                  <ul className="grid md:grid-cols-2 gap-3">
                    {listing.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <span className="text-foreground">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Amenities / What's Included */}
              {listing.amenities && listing.amenities.length > 0 && (
                <AmenitiesSection
                  category={listing.category}
                  amenities={listing.amenities}
                />
              )}

              {/* Fulfillment Details */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  {listing.category === 'ghost_kitchen' || listing.category === 'vendor_lot' 
                    ? 'Access Information' 
                    : 'Pickup & Delivery'}
                </h2>
                
                <div className="space-y-4">
                  {/* For mobile assets */}
                  {(listing.category === 'food_truck' || listing.category === 'food_trailer') && (
                    <>
                      {(listing.fulfillment_type === 'pickup' || listing.fulfillment_type === 'both') && (
                        <div className="p-4 bg-muted/50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">Pickup</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {listing.pickup_location_text || 'Location provided upon booking'}
                          </p>
                          {listing.pickup_instructions && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {listing.pickup_instructions}
                            </p>
                          )}
                        </div>
                      )}

                      {(listing.fulfillment_type === 'delivery' || listing.fulfillment_type === 'both') && (
                        <div className="p-4 bg-muted/50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Truck className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">Delivery Available</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {listing.delivery_radius_miles 
                              ? `Within ${listing.delivery_radius_miles} miles`
                              : 'Delivery radius varies'}
                            {listing.delivery_fee && ` • $${listing.delivery_fee} fee`}
                          </p>
                          {listing.delivery_instructions && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {listing.delivery_instructions}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* For static locations */}
                  {(listing.category === 'ghost_kitchen' || listing.category === 'vendor_lot') && (
                    <div className="p-4 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">On-site Access</span>
                      </div>
                      {listing.address && (
                        <p className="text-sm text-foreground mb-2">{listing.address}</p>
                      )}
                      {listing.hours_of_access && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Clock className="h-4 w-4" />
                          {listing.hours_of_access}
                        </div>
                      )}
                      {listing.access_instructions && (
                        <p className="text-sm text-muted-foreground">
                          {listing.access_instructions}
                        </p>
                      )}
                      {listing.location_notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {listing.location_notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Required Documents Section (for rentals) */}
              {isRental && (
                <RequiredDocumentsSection listingId={listing.id} />
              )}

              {/* Host Card - Mobile */}
              <div className="lg:hidden">
                <HostCard
                  hostId={listing.host_id}
                  listingId={listing.id}
                  hostName={host?.full_name || null}
                  hostAvatar={host?.avatar_url}
                  isVerified={host?.identity_verified || false}
                  memberSince={host?.created_at}
                />
              </div>

              {/* Reviews Section */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Reviews
                </h2>
                <ReviewsSection listingId={listing.id} />
              </div>
            </div>

            {/* Right Column - Booking/Inquiry Form */}
            <div className="space-y-6">
              {isRental ? (
                <BookingForm
                  listingId={listing.id}
                  hostId={listing.host_id}
                  category={listing.category}
                  fulfillmentType={listing.fulfillment_type}
                  priceDaily={listing.price_daily}
                  priceWeekly={listing.price_weekly}
                  availableFrom={listing.available_from}
                  availableTo={listing.available_to}
                  pickupLocation={listing.pickup_location_text}
                  pickupInstructions={listing.pickup_instructions}
                  deliveryFee={listing.delivery_fee}
                  deliveryRadiusMiles={listing.delivery_radius_miles}
                  deliveryInstructions={listing.delivery_instructions}
                  address={listing.address}
                  accessInstructions={listing.access_instructions}
                  hoursOfAccess={listing.hours_of_access}
                  status={listing.status}
                />
              ) : (
              <InquiryForm
                  listingId={listing.id}
                  priceSale={listing.price_sale}
                  fulfillmentType={listing.fulfillment_type}
                  deliveryFee={listing.delivery_fee}
                  deliveryRadiusMiles={listing.delivery_radius_miles}
                  pickupLocation={listing.pickup_location_text || listing.address}
                />
              )}

              {/* Host Card - Desktop */}
              <div className="hidden lg:block">
                <HostCard
                  hostId={listing.host_id}
                  listingId={listing.id}
                  hostName={host?.full_name || null}
                  hostAvatar={host?.avatar_url}
                  isVerified={host?.identity_verified || false}
                  memberSince={host?.created_at}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ListingDetail;
