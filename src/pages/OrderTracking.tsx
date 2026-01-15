import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Package, Truck, CheckCircle2, Clock, MapPin, 
  ExternalLink, ArrowLeft, AlertCircle, PackageCheck,
  Loader2
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import SEO from '@/components/SEO';

const SHIPPING_STATUS_CONFIG = {
  pending: { 
    label: 'Pending Shipment', 
    description: 'Order confirmed, awaiting shipment',
    icon: Clock, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    step: 1
  },
  processing: { 
    label: 'Processing', 
    description: 'Preparing your order for shipment',
    icon: Package, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    step: 2
  },
  shipped: { 
    label: 'Shipped', 
    description: 'Your order is on its way',
    icon: Truck, 
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    step: 3
  },
  in_transit: { 
    label: 'In Transit', 
    description: 'Package is en route to destination',
    icon: Truck, 
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    step: 3
  },
  out_for_delivery: { 
    label: 'Out for Delivery', 
    description: 'Your package will arrive today',
    icon: Truck, 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    step: 4
  },
  delivered: { 
    label: 'Delivered', 
    description: 'Package has been delivered',
    icon: CheckCircle2, 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    step: 5
  },
  exception: { 
    label: 'Delivery Exception', 
    description: 'There was an issue with delivery',
    icon: AlertCircle, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    step: 3
  },
};

const TrackingTimeline = ({ currentStatus }: { currentStatus: string }) => {
  const steps = [
    { key: 'pending', label: 'Order Placed', icon: Package },
    { key: 'processing', label: 'Processing', icon: PackageCheck },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
  ];

  const currentStep = SHIPPING_STATUS_CONFIG[currentStatus as keyof typeof SHIPPING_STATUS_CONFIG]?.step || 1;

  return (
    <div className="relative">
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > (index + 1);
          const isCurrent = currentStep === (index + 1);
          
          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${isCompleted ? 'bg-emerald-500 text-white' : 
                  isCurrent ? 'bg-primary text-white' : 
                  'bg-muted text-muted-foreground'}
              `}>
                <StepIcon className="h-5 w-5" />
              </div>
              <span className={`
                text-xs mt-2 text-center max-w-[80px]
                ${isCompleted || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Progress line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0">
        <div 
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${Math.min((currentStep - 1) / (steps.length - 1) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
};

const OrderTracking = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { transaction, isLoading, error } = useOrderTracking(transactionId);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/order-tracking/' + transactionId);
    }
  }, [user, authLoading, transactionId, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find the order you're looking for.
            </p>
            <Button asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const shippingStatus = transaction.shipping_status || 'pending';
  const statusConfig = SHIPPING_STATUS_CONFIG[shippingStatus as keyof typeof SHIPPING_STATUS_CONFIG] 
    || SHIPPING_STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const isVendibookFreight = transaction.fulfillment_type === 'vendibook_freight';
  const hasTracking = !!transaction.tracking_number;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Order Tracking | VendiBook"
        description="Track your order status and delivery"
      />
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          {/* Order Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Order Tracking</h1>
            <p className="text-muted-foreground">
              Order placed on {format(new Date(transaction.created_at), 'MMMM d, yyyy')}
            </p>
          </div>

          {/* Status Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-full ${statusConfig.bgColor}`}>
                  <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
                </div>
                <div>
                  <Badge 
                    variant={shippingStatus === 'delivered' ? 'default' : 'secondary'}
                    className={shippingStatus === 'delivered' ? 'bg-emerald-500' : ''}
                  >
                    {statusConfig.label}
                  </Badge>
                  <p className="text-muted-foreground mt-1">
                    {statusConfig.description}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="mb-6 px-4">
                <TrackingTimeline currentStatus={shippingStatus} />
              </div>

              {/* Tracking Details */}
              {hasTracking && (
                <>
                  <Separator className="my-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tracking Number</p>
                      <p className="font-mono font-medium">{transaction.tracking_number}</p>
                    </div>
                    {transaction.carrier && (
                      <div>
                        <p className="text-sm text-muted-foreground">Carrier</p>
                        <p className="font-medium">{transaction.carrier}</p>
                      </div>
                    )}
                    {transaction.shipped_at && (
                      <div>
                        <p className="text-sm text-muted-foreground">Shipped Date</p>
                        <p className="font-medium">
                          {format(new Date(transaction.shipped_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                    {transaction.estimated_delivery_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                        <p className="font-medium">
                          {format(new Date(transaction.estimated_delivery_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                    {transaction.delivered_at && (
                      <div>
                        <p className="text-sm text-muted-foreground">Delivered</p>
                        <p className="font-medium text-emerald-600">
                          {format(new Date(transaction.delivered_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {transaction.tracking_url && (
                    <div className="mt-4">
                      <Button asChild variant="outline" className="gap-2">
                        <a href={transaction.tracking_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Track with Carrier
                        </a>
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Vendibook Freight Info */}
              {isVendibookFreight && !hasTracking && (
                <>
                  <Separator className="my-6" />
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Truck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">VendiBook Freight</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your order is being coordinated through VendiBook Freight. You'll receive 
                          an email with tracking information and instructions to schedule your 
                          delivery time once the item ships.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Estimated transit:</span> 72 hours to 10 days
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Shipping Notes */}
              {transaction.shipping_notes && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Shipping Notes</p>
                    <p className="text-sm bg-muted/50 rounded-lg p-3">{transaction.shipping_notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <img
                  src={transaction.listing?.cover_image_url || '/placeholder.svg'}
                  alt={transaction.listing?.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {transaction.listing?.title || 'Unknown Item'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${transaction.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Delivery Address */}
              {transaction.delivery_address && (
                <div className="flex gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Address</p>
                    <p className="text-sm font-medium">{transaction.delivery_address}</p>
                    {transaction.delivery_instructions && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        "{transaction.delivery_instructions}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pickup Info */}
              {transaction.fulfillment_type === 'pickup' && (
                <div className="flex gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup Location</p>
                    <p className="text-sm font-medium">
                      {transaction.listing?.pickup_location_text || 'Contact seller for pickup details'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Need help with your order?{' '}
              <Link to="/contact" className="text-primary hover:underline">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default OrderTracking;