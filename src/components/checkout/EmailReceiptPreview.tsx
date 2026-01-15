import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, CheckCircle, Calendar, MapPin, Truck, Package, Shield, CreditCard, Clock, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/commissions";
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";

interface EmailReceiptPreviewProps {
  transactionId: string;
  itemName: string;
  amount: number;
  platformFee?: number;
  deliveryFee?: number;
  isRental?: boolean;
  startDate?: string;
  endDate?: string;
  address?: string;
  fulfillmentType?: string;
  isEscrow?: boolean;
  paymentMethod?: string;
  paymentDate?: string;
  recipientName?: string;
  recipientEmail?: string;
}

export function EmailReceiptPreview({
  transactionId,
  itemName,
  amount,
  platformFee = 0,
  deliveryFee = 0,
  isRental = false,
  startDate,
  endDate,
  address,
  fulfillmentType = "pickup",
  isEscrow = false,
  paymentMethod = "Card",
  paymentDate,
  recipientName = "Valued Customer",
  recipientEmail,
}: EmailReceiptPreviewProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const basePrice = amount - platformFee - deliveryFee;
  const formattedPaymentDate = paymentDate ? formatDateTime(paymentDate) : formatDateTime(new Date().toISOString());

  const handleDownloadPdf = () => {
    generateReceiptPdf({
      transactionId,
      itemName,
      amount,
      platformFee,
      deliveryFee,
      isRental,
      startDate,
      endDate,
      address,
      fulfillmentType,
      isEscrow,
      paymentMethod,
      paymentDate,
      recipientName,
      recipientEmail,
    });
  };

  return (
    <Card className="overflow-hidden border-2 border-dashed border-muted-foreground/20">
      {/* Email Preview Header */}
      <div className="bg-muted/50 px-4 py-3 flex items-center gap-2 border-b">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Email Preview</span>
        <div className="ml-auto flex items-center gap-2">
          {recipientEmail && (
            <span className="text-sm text-muted-foreground">
              To: {recipientEmail}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Email Content */}
      <CardContent className="p-6 bg-gradient-to-b from-background to-muted/20">
        {/* Logo Section */}
        <div className="text-center mb-6">
          <img 
            src="/images/vendibook-email-logo.png" 
            alt="VendiBook" 
            className="h-10 mx-auto mb-2"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <p className="text-sm text-muted-foreground">Your Mobile Food Business Marketplace</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-card rounded-xl shadow-sm border p-6">
          {/* Success Badge */}
          <div className="text-center mb-6 pb-6 border-b border-dashed">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-400 text-white mb-4 px-4 py-1.5">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Payment Successful
            </Badge>
            <h2 className="text-xl font-semibold text-foreground mb-2">Payment Receipt</h2>
            <p className="text-sm text-muted-foreground">
              Transaction ID: <code className="bg-muted px-2 py-0.5 rounded text-xs">{transactionId.slice(0, 20)}...</code>
            </p>
          </div>

          {/* Greeting */}
          <p className="text-muted-foreground mb-6">
            Hi {recipientName}, thank you for your payment! Here's your receipt.
          </p>

          {/* Order Details Box */}
          <div className="bg-muted/50 rounded-lg p-5 mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground mb-4 flex items-center gap-2">
              {isRental ? (
                <>
                  <Calendar className="h-4 w-4 text-primary" />
                  Rental Details
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 text-primary" />
                  Purchase Details
                </>
              )}
            </h3>

            <div className="mb-4 pb-4 border-b border-border/50">
              <p className="font-semibold text-foreground mb-1">{itemName}</p>
              
              {isRental && startDate && endDate && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(startDate)} — {formatDate(endDate)}
                </p>
              )}
              
              {address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {address}
                </p>
              )}
              
              {!isRental && fulfillmentType && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  {fulfillmentType === 'delivery' ? (
                    <>
                      <Truck className="h-3.5 w-3.5" />
                      Delivery
                    </>
                  ) : (
                    <>
                      <Package className="h-3.5 w-3.5" />
                      Pickup
                    </>
                  )}
                </p>
              )}
              
              {isEscrow && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-2 font-medium">
                  <Shield className="h-3.5 w-3.5" />
                  Escrow Protected - Funds released after confirmation
                </p>
              )}
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRental ? 'Rental Fee' : 'Item Price'}</span>
                <span className="text-foreground">{formatCurrency(basePrice)}</span>
              </div>
              
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="text-foreground">{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              
              {platformFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span className="text-foreground">{formatCurrency(platformFee)}</span>
                </div>
              )}
              
              <Separator className="my-3" />
              
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-foreground">Total Paid</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info Box */}
          <div className="bg-primary/5 rounded-lg p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Payment Date
              </span>
              <span className="text-foreground">{formattedPaymentDate}</span>
            </div>
            {paymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Payment Method
                </span>
                <span className="text-foreground">{paymentMethod}</span>
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-r-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>📧 Keep this email</strong> as proof of payment. You can also access your payment history from your dashboard.
            </p>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Button className="bg-gradient-to-r from-primary to-primary/80 gap-2">
              View in Dashboard
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1">
            Need help? Call us at{" "}
            <a href="tel:+18778836342" className="text-primary hover:underline">1877-8VENDI2</a>
            {" "}or email{" "}
            <a href="mailto:support@vendibook.com" className="text-primary hover:underline">support@vendibook.com</a>
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} VendiBook. All rights reserved.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
