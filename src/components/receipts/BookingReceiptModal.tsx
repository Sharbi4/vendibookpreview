import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Download, FileText, Printer, Loader2, RefreshCcw, ArrowDownCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import vendibookLogo from '@/assets/vendibook-logo.png';

// Platform fee percentage
const PLATFORM_FEE_PERCENT = 12.9;

interface RefundInfo {
  refund_amount: number;
  refund_date: string;
  refund_reason?: string;
  refund_id?: string;
  refund_type: 'full' | 'partial' | 'deposit';
}

interface BookingReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    start_date: string;
    end_date: string;
    start_time?: string | null;
    end_time?: string | null;
    total_price: number;
    created_at: string;
    paid_at?: string | null;
    status: string;
    is_hourly_booking?: boolean | null;
    duration_hours?: number | null;
    deposit_amount?: number | null;
    deposit_status?: string | null;
    deposit_refunded_at?: string | null;
    deposit_refund_notes?: string | null;
    deposit_charge_id?: string | null;
    delivery_fee_snapshot?: number | null;
    fulfillment_selected?: string | null;
    delivery_address?: string | null;
    address_snapshot?: string | null;
    payment_intent_id?: string | null;
    payment_status?: string | null;
    listing?: {
      id: string;
      title: string;
      address?: string | null;
      pickup_location_text?: string | null;
      category?: string;
    } | null;
  };
  hostName?: string;
  renterName?: string;
  renterEmail?: string;
}

export function BookingReceiptModal({
  open,
  onOpenChange,
  booking,
  hostName,
  renterName,
  renterEmail,
}: BookingReceiptModalProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingRefundPdf, setIsGeneratingRefundPdf] = useState(false);
  const [hostProfile, setHostProfile] = useState<{ display_name?: string; business_name?: string; full_name?: string } | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'receipt' | 'refund'>('receipt');

  // Determine if there's a refund
  const hasRefund = booking.payment_status === 'refunded' || 
    booking.deposit_status === 'refunded' || 
    booking.deposit_refunded_at !== null;
  
  const isFullRefund = booking.payment_status === 'refunded';
  const isDepositRefund = booking.deposit_status === 'refunded' || booking.deposit_refunded_at !== null;

  // Load logo as base64 for PDF
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setLogoDataUrl(canvas.toDataURL('image/png'));
      }
    };
    img.src = vendibookLogo;
  }, []);

  // Fetch host profile if not provided
  useEffect(() => {
    const fetchHost = async () => {
      if (hostName || !booking.id) return;
      
      const { data: bookingData } = await supabase
        .from('booking_requests')
        .select('host_id')
        .eq('id', booking.id)
        .single();
      
      if (bookingData?.host_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, business_name, full_name')
          .eq('id', bookingData.host_id)
          .single();
        
        if (profile) setHostProfile(profile);
      }
    };
    
    if (open) fetchHost();
  }, [open, booking.id, hostName]);

  const displayHostName = hostName || hostProfile?.business_name || hostProfile?.display_name || hostProfile?.full_name || 'Host';
  
  // Calculate pricing breakdown
  const basePrice = booking.total_price;
  const deliveryFee = booking.delivery_fee_snapshot || 0;
  const depositAmount = booking.deposit_amount || 0;
  
  // Work backwards from total to find subtotal
  // Total = subtotal + platformFee + deposit
  // Total - deposit = subtotal + platformFee
  // Total - deposit = subtotal * (1 + 0.129)
  // subtotal = (Total - deposit) / 1.129
  const amountWithoutDeposit = basePrice - depositAmount;
  const subtotal = amountWithoutDeposit / (1 + PLATFORM_FEE_PERCENT / 100);
  const platformFee = amountWithoutDeposit - subtotal;
  const rentalAmount = subtotal - deliveryFee;

  const receiptNumber = `VB-${booking.id.slice(0, 8).toUpperCase()}`;
  const refundReceiptNumber = `VB-REF-${booking.id.slice(0, 6).toUpperCase()}`;
  const paidDate = booking.paid_at ? format(parseISO(booking.paid_at), 'MMM d, yyyy h:mm a') : 'Pending';
  const bookingDate = format(parseISO(booking.created_at), 'MMM d, yyyy');
  const refundDate = booking.deposit_refunded_at 
    ? format(parseISO(booking.deposit_refunded_at), 'MMM d, yyyy h:mm a') 
    : null;
  
  // Calculate refund amount
  const refundAmount = isFullRefund ? basePrice : (isDepositRefund ? depositAmount : 0);
  
  const formatDate = (dateStr: string) => format(parseISO(dateStr), 'EEE, MMM d, yyyy');
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const pickupLocation = booking.address_snapshot || booking.listing?.address || booking.listing?.pickup_location_text || 'See listing for details';

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Add logo
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', margin, yPos, 40, 12);
      }
      
      // Receipt title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Rental Receipt', pageWidth - margin, yPos + 8, { align: 'right' });
      
      yPos += 25;
      
      // Receipt number and date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Receipt #: ${receiptNumber}`, margin, yPos);
      doc.text(`Date: ${paidDate}`, pageWidth - margin, yPos, { align: 'right' });
      
      yPos += 15;
      
      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 15;
      
      // Booking Details Header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Booking Details', margin, yPos);
      
      yPos += 10;
      
      // Listing title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(booking.listing?.title || 'Rental', margin, yPos);
      
      yPos += 8;
      
      // Category badge
      if (booking.listing?.category) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Category: ${booking.listing.category}`, margin, yPos);
        yPos += 6;
      }
      
      yPos += 6;
      
      // Details grid
      const details = [
        ['Booking ID', booking.id],
        ['Status', booking.status.charAt(0).toUpperCase() + booking.status.slice(1)],
        ['Booked On', bookingDate],
        ['Payment Date', paidDate],
        ['', ''],
        ['Rental Period', `${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`],
      ];
      
      if (booking.is_hourly_booking && booking.start_time && booking.end_time) {
        details.push(['Time', `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`]);
        if (booking.duration_hours) {
          details.push(['Duration', `${booking.duration_hours} hours`]);
        }
      }
      
      details.push(['', '']);
      details.push(['Host/Vendor', displayHostName]);
      
      if (booking.fulfillment_selected) {
        details.push(['Fulfillment', booking.fulfillment_selected === 'delivery' ? 'Delivery' : 'Pickup']);
      }
      
      details.push(['Location', pickupLocation]);
      
      if (booking.delivery_address) {
        details.push(['Delivery To', booking.delivery_address]);
      }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      for (const [label, value] of details) {
        if (label === '' && value === '') {
          yPos += 4;
          continue;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(label + ':', margin, yPos);
        doc.setFont('helvetica', 'normal');
        
        // Handle long text wrapping
        const maxWidth = pageWidth - margin * 2 - 45;
        const lines = doc.splitTextToSize(value, maxWidth);
        doc.text(lines, margin + 45, yPos);
        yPos += 6 * lines.length;
      }
      
      yPos += 10;
      
      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 15;
      
      // Payment Breakdown Header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Payment Breakdown', margin, yPos);
      
      yPos += 12;
      
      // Price items
      const priceItems = [
        ['Rental Fee', `$${rentalAmount.toFixed(2)}`],
      ];
      
      if (deliveryFee > 0) {
        priceItems.push(['Delivery Fee', `$${deliveryFee.toFixed(2)}`]);
      }
      
      priceItems.push(['Platform Service Fee (12.9%)', `$${platformFee.toFixed(2)}`]);
      
      if (depositAmount > 0) {
        priceItems.push(['Security Deposit (Refundable)', `$${depositAmount.toFixed(2)}`]);
      }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      for (const [label, amount] of priceItems) {
        doc.setTextColor(60, 60, 60);
        doc.text(label, margin, yPos);
        doc.text(amount, pageWidth - margin, yPos, { align: 'right' });
        yPos += 7;
      }
      
      yPos += 5;
      
      // Divider before total
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 10;
      
      // Total
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Total Paid', margin, yPos);
      doc.text(`$${basePrice.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      
      yPos += 20;
      
      // Payment method
      if (booking.payment_intent_id) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Payment Reference: ${booking.payment_intent_id}`, margin, yPos);
        yPos += 6;
      }
      
      // Footer
      yPos = doc.internal.pageSize.getHeight() - 30;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(130, 130, 130);
      doc.text('This receipt was generated by Vendibook.', pageWidth / 2, yPos, { align: 'center' });
      doc.text('For questions or support, contact support@vendibook.com', pageWidth / 2, yPos + 5, { align: 'center' });
      doc.text('www.vendibook.com', pageWidth / 2, yPos + 10, { align: 'center' });
      
      // Save
      doc.save(`vendibook-receipt-${receiptNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Generate Refund Receipt PDF
  const generateRefundPDF = async () => {
    setIsGeneratingRefundPdf(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Add logo
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', margin, yPos, 40, 12);
      }
      
      // Refund Receipt title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(139, 92, 246); // Purple color for refund
      doc.text('Refund Receipt', pageWidth - margin, yPos + 8, { align: 'right' });
      
      yPos += 25;
      
      // Receipt number and date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Refund Receipt #: ${refundReceiptNumber}`, margin, yPos);
      doc.text(`Refund Date: ${refundDate || 'Processing'}`, pageWidth - margin, yPos, { align: 'right' });
      
      yPos += 8;
      doc.text(`Original Receipt #: ${receiptNumber}`, margin, yPos);
      
      yPos += 15;
      
      // Divider
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      doc.setLineWidth(0.2);
      
      yPos += 15;
      
      // Refund Status Banner
      doc.setFillColor(243, 232, 255); // Light purple
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(139, 92, 246);
      const refundTypeText = isFullRefund ? 'FULL REFUND PROCESSED' : 'DEPOSIT REFUND PROCESSED';
      doc.text(refundTypeText, pageWidth / 2, yPos + 12, { align: 'center' });
      
      yPos += 30;
      
      // Refund Details Header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Refund Details', margin, yPos);
      
      yPos += 12;
      
      // Refund details grid
      const refundDetails = [
        ['Refund Type', isFullRefund ? 'Full Refund' : 'Security Deposit Refund'],
        ['Refund Status', 'Completed'],
        ['Refund Date', refundDate || 'Processing'],
        ['Original Payment Date', paidDate],
        ['', ''],
        ['Refund Method', 'Original Payment Method'],
        ['Processing Time', '5-10 business days'],
      ];

      if (booking.deposit_refund_notes) {
        refundDetails.push(['', '']);
        refundDetails.push(['Notes', booking.deposit_refund_notes]);
      }

      if (booking.deposit_charge_id) {
        refundDetails.push(['', '']);
        refundDetails.push(['Refund Reference', booking.deposit_charge_id]);
      }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      for (const [label, value] of refundDetails) {
        if (label === '' && value === '') {
          yPos += 4;
          continue;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(label + ':', margin, yPos);
        doc.setFont('helvetica', 'normal');
        
        const maxWidth = pageWidth - margin * 2 - 55;
        const lines = doc.splitTextToSize(value, maxWidth);
        doc.text(lines, margin + 55, yPos);
        yPos += 6 * lines.length;
      }
      
      yPos += 15;
      
      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 15;
      
      // Amount Breakdown Header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Amount Breakdown', margin, yPos);
      
      yPos += 12;
      
      // Amount items
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (isFullRefund) {
        const amounts = [
          ['Original Rental Fee', `$${rentalAmount.toFixed(2)}`],
          ['Platform Service Fee', `$${platformFee.toFixed(2)}`],
        ];
        if (deliveryFee > 0) {
          amounts.push(['Delivery Fee', `$${deliveryFee.toFixed(2)}`]);
        }
        if (depositAmount > 0) {
          amounts.push(['Security Deposit', `$${depositAmount.toFixed(2)}`]);
        }
        
        for (const [label, amount] of amounts) {
          doc.setTextColor(60, 60, 60);
          doc.text(label, margin, yPos);
          doc.text(amount, pageWidth - margin, yPos, { align: 'right' });
          yPos += 7;
        }
        
        yPos += 3;
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text('Original Total Paid', margin, yPos);
        doc.text(`$${basePrice.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
        
      } else {
        // Deposit refund only
        doc.setTextColor(60, 60, 60);
        doc.text('Security Deposit (Refundable)', margin, yPos);
        doc.text(`$${depositAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 7;
      }
      
      yPos += 15;
      
      // Refund total box
      doc.setFillColor(243, 232, 255);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(139, 92, 246);
      doc.text('Total Refunded', margin + 10, yPos + 16);
      doc.text(`$${refundAmount.toFixed(2)}`, pageWidth - margin - 10, yPos + 16, { align: 'right' });
      
      yPos += 40;
      
      // Original Booking Reference
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Original Booking Reference', margin, yPos);
      
      yPos += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Listing: ${booking.listing?.title || 'Rental'}`, margin, yPos);
      yPos += 5;
      doc.text(`Rental Period: ${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`, margin, yPos);
      yPos += 5;
      doc.text(`Booking ID: ${booking.id}`, margin, yPos);
      
      // Footer
      yPos = doc.internal.pageSize.getHeight() - 35;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(130, 130, 130);
      doc.text('This refund receipt was generated by Vendibook.', pageWidth / 2, yPos, { align: 'center' });
      doc.text('Refunds typically take 5-10 business days to appear in your account.', pageWidth / 2, yPos + 5, { align: 'center' });
      doc.text('For questions or support, contact support@vendibook.com', pageWidth / 2, yPos + 10, { align: 'center' });
      doc.text('www.vendibook.com', pageWidth / 2, yPos + 15, { align: 'center' });
      
      // Save
      doc.save(`vendibook-refund-receipt-${refundReceiptNumber}.pdf`);
    } catch (error) {
      console.error('Error generating refund PDF:', error);
    } finally {
      setIsGeneratingRefundPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              {hasRefund ? 'Receipts' : 'Rental Receipt'}
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {activeTab === 'refund' ? refundReceiptNumber : receiptNumber}
            </Badge>
          </div>
          
          {/* Tab switcher if refund exists */}
          {hasRefund && (
            <div className="flex gap-2 mt-3">
              <Button
                variant={activeTab === 'receipt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('receipt')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                Payment Receipt
              </Button>
              <Button
                variant={activeTab === 'refund' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('refund')}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
              >
                <RefreshCcw className="h-4 w-4 mr-1.5" />
                Refund Receipt
              </Button>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {/* Payment Receipt Tab */}
          {activeTab === 'receipt' && (
          <div className="px-6 py-4 space-y-6">
            {/* Logo and Header */}
            <div className="flex items-center justify-between">
              <img src={vendibookLogo} alt="Vendibook" className="h-8" />
              <div className="text-right text-sm text-muted-foreground">
                <p>Paid: {paidDate}</p>
              </div>
            </div>

            <Separator />

            {/* Booking Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Booking Details</h3>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="font-medium text-lg">{booking.listing?.title || 'Rental'}</p>
                  {booking.listing?.category && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {booking.listing.category}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Booking ID</p>
                    <p className="font-mono text-xs">{booking.id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant="outline" className="capitalize">{booking.status}</Badge>
                  </div>
                </div>
              </div>

              {/* Dates & Times */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Rental Period</h4>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="font-medium">
                    {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
                  </p>
                  {booking.is_hourly_booking && booking.start_time && booking.end_time && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      {booking.duration_hours && ` (${booking.duration_hours} hours)`}
                    </p>
                  )}
                </div>
              </div>

              {/* Host & Location */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Host/Vendor</p>
                  <p className="font-medium">{displayHostName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {booking.fulfillment_selected === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
                  </p>
                  <p className="text-sm">{booking.delivery_address || pickupLocation}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Breakdown */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Payment Breakdown</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rental Fee</span>
                  <span>${rentalAmount.toFixed(2)}</span>
                </div>
                
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Service Fee (12.9%)</span>
                  <span>${platformFee.toFixed(2)}</span>
                </div>
                
                {depositAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Security Deposit (Refundable)</span>
                    <span>${depositAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <Separator className="my-2" />
                
                <div className="flex justify-between font-semibold text-base">
                  <span>Total Paid</span>
                  <span className="text-primary">${basePrice.toFixed(2)}</span>
                </div>
              </div>

              {booking.payment_intent_id && (
                <p className="text-xs text-muted-foreground mt-2">
                  Payment Reference: {booking.payment_intent_id}
                </p>
              )}
            </div>

            {/* Footer note */}
            <div className="bg-muted/30 rounded-lg p-3 text-center text-xs text-muted-foreground">
              <p>This receipt was generated by Vendibook.</p>
              <p>For questions, contact support@vendibook.com</p>
            </div>
          </div>
          )}

          {/* Refund Receipt Tab */}
          {activeTab === 'refund' && hasRefund && (
          <div className="px-6 py-4 space-y-6">
            {/* Logo and Header */}
            <div className="flex items-center justify-between">
              <img src={vendibookLogo} alt="Vendibook" className="h-8" />
              <div className="text-right text-sm text-muted-foreground">
                <p className="text-purple-600 font-medium">Refunded</p>
                <p className="text-xs">{refundDate || 'Processing'}</p>
              </div>
            </div>

            {/* Refund Status Banner */}
            <div className="bg-purple-100 border border-purple-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <RefreshCcw className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-purple-800">
                  {isFullRefund ? 'Full Refund Processed' : 'Deposit Refund Processed'}
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-700">${refundAmount.toFixed(2)}</p>
            </div>

            <Separator />

            {/* Refund Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Refund Details</h3>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Refund Type</p>
                    <p className="font-medium">{isFullRefund ? 'Full Refund' : 'Security Deposit'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">Completed</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Refund Date</p>
                    <p className="font-medium">{refundDate || 'Processing'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Processing Time</p>
                    <p className="font-medium">5-10 business days</p>
                  </div>
                </div>

                {booking.deposit_refund_notes && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-sm">Notes</p>
                    <p className="text-sm">{booking.deposit_refund_notes}</p>
                  </div>
                )}
              </div>

              {/* Amount Breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Amount Breakdown</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                  {isFullRefund ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original Rental Fee</span>
                        <span>${rentalAmount.toFixed(2)}</span>
                      </div>
                      {deliveryFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivery Fee</span>
                          <span>${deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform Service Fee</span>
                        <span>${platformFee.toFixed(2)}</span>
                      </div>
                      {depositAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Security Deposit</span>
                          <span>${depositAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Security Deposit</span>
                      <span>${depositAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total Refunded</span>
                    <span className="text-purple-600">${refundAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Original Booking Reference */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Original Booking</h4>
                <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Listing:</span> {booking.listing?.title || 'Rental'}</p>
                  <p><span className="text-muted-foreground">Dates:</span> {formatDate(booking.start_date)} — {formatDate(booking.end_date)}</p>
                  <p><span className="text-muted-foreground">Original Payment:</span> ${basePrice.toFixed(2)}</p>
                  <p className="font-mono text-xs text-muted-foreground">Booking ID: {booking.id}</p>
                </div>
              </div>

              {booking.deposit_charge_id && (
                <p className="text-xs text-muted-foreground">
                  Refund Reference: {booking.deposit_charge_id}
                </p>
              )}
            </div>

            {/* Footer note */}
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center text-xs text-purple-700">
              <p className="font-medium">Refunds typically take 5-10 business days to appear in your account.</p>
              <p className="text-purple-600 mt-1">For questions, contact support@vendibook.com</p>
            </div>
          </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="px-6 py-4 border-t bg-muted/20 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            variant={activeTab === 'refund' ? 'secondary' : 'default'}
            className={`flex-1 ${activeTab === 'refund' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
            onClick={activeTab === 'refund' ? generateRefundPDF : generatePDF}
            disabled={activeTab === 'refund' ? isGeneratingRefundPdf : isGeneratingPdf}
          >
            {(activeTab === 'refund' ? isGeneratingRefundPdf : isGeneratingPdf) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download {activeTab === 'refund' ? 'Refund' : ''} PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
