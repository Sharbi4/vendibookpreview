import { jsPDF } from 'jspdf';
import { formatCurrency } from './commissions';

interface ReceiptData {
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

export function generateReceiptPdf(data: ReceiptData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [255, 81, 36]; // #FF5124
  const darkColor: [number, number, number] = [31, 41, 55];
  const grayColor: [number, number, number] = [107, 114, 128];
  const lightGray: [number, number, number] = [249, 250, 251];
  const greenColor: [number, number, number] = [16, 185, 129];
  
  let yPos = 20;
  
  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Logo text (since we can't easily embed images)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('VendiBook', pageWidth / 2, 22, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Your Mobile Food Business Marketplace', pageWidth / 2, 32, { align: 'center' });
  
  yPos = 60;
  
  // Success badge
  doc.setFillColor(...greenColor);
  doc.roundedRect(pageWidth / 2 - 35, yPos - 5, 70, 12, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ Payment Successful', pageWidth / 2, yPos + 3, { align: 'center' });
  
  yPos += 20;
  
  // Title
  doc.setTextColor(...darkColor);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Receipt', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  
  // Transaction ID
  doc.setTextColor(...grayColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Transaction ID: ${data.transactionId}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  
  // Dashed line
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(20, yPos, pageWidth - 20, yPos);
  doc.setLineDashPattern([], 0);
  
  yPos += 15;
  
  // Greeting
  doc.setTextColor(...grayColor);
  doc.setFontSize(11);
  const greeting = `Hi ${data.recipientName || 'there'}, thank you for your payment! Here's your receipt.`;
  doc.text(greeting, 20, yPos);
  
  yPos += 15;
  
  // Order Details Box
  doc.setFillColor(...lightGray);
  doc.roundedRect(20, yPos, pageWidth - 40, 85, 3, 3, 'F');
  
  yPos += 12;
  
  // Section title
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const sectionTitle = data.isRental ? '📅 RENTAL DETAILS' : '🛒 PURCHASE DETAILS';
  doc.text(sectionTitle, 28, yPos);
  
  yPos += 12;
  
  // Item name
  doc.setFontSize(12);
  doc.text(data.itemName, 28, yPos);
  
  yPos += 8;
  
  // Date range for rentals
  if (data.isRental && data.startDate && data.endDate) {
    doc.setTextColor(...grayColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`📅 ${formatDate(data.startDate)} — ${formatDate(data.endDate)}`, 28, yPos);
    yPos += 7;
  }
  
  // Address
  if (data.address) {
    doc.setTextColor(...grayColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`📍 ${data.address}`, 28, yPos);
    yPos += 7;
  }
  
  // Fulfillment type for purchases
  if (!data.isRental && data.fulfillmentType) {
    doc.setTextColor(...grayColor);
    doc.setFontSize(10);
    const fulfillmentText = data.fulfillmentType === 'delivery' ? '🚚 Delivery' : '📦 Pickup';
    doc.text(fulfillmentText, 28, yPos);
    yPos += 7;
  }
  
  // Escrow notice
  if (data.isEscrow) {
    doc.setTextColor(245, 158, 11); // amber
    doc.setFontSize(9);
    doc.text('🔒 Escrow Protected - Funds released after confirmation', 28, yPos);
    yPos += 7;
  }
  
  yPos += 5;
  
  // Line separator
  doc.setDrawColor(220, 220, 220);
  doc.line(28, yPos, pageWidth - 28, yPos);
  
  yPos += 10;
  
  // Calculate base price
  const basePrice = data.amount - (data.platformFee || 0) - (data.deliveryFee || 0);
  
  // Line items
  doc.setTextColor(...grayColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const itemLabel = data.isRental ? 'Rental Fee' : 'Item Price';
  doc.text(itemLabel, 28, yPos);
  doc.setTextColor(...darkColor);
  doc.text(formatCurrency(basePrice), pageWidth - 28, yPos, { align: 'right' });
  
  yPos += 8;
  
  if (data.deliveryFee && data.deliveryFee > 0) {
    doc.setTextColor(...grayColor);
    doc.text('Delivery Fee', 28, yPos);
    doc.setTextColor(...darkColor);
    doc.text(formatCurrency(data.deliveryFee), pageWidth - 28, yPos, { align: 'right' });
    yPos += 8;
  }
  
  if (data.platformFee && data.platformFee > 0) {
    doc.setTextColor(...grayColor);
    doc.text('Service Fee', 28, yPos);
    doc.setTextColor(...darkColor);
    doc.text(formatCurrency(data.platformFee), pageWidth - 28, yPos, { align: 'right' });
    yPos += 8;
  }
  
  yPos += 5;
  
  // Total line
  doc.setDrawColor(...darkColor);
  doc.setLineWidth(0.5);
  doc.line(28, yPos, pageWidth - 28, yPos);
  
  yPos += 12;
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Paid', 28, yPos);
  doc.setTextColor(...primaryColor);
  doc.setFontSize(16);
  doc.text(formatCurrency(data.amount), pageWidth - 28, yPos, { align: 'right' });
  
  yPos += 20;
  
  // Payment Info Box
  doc.setFillColor(255, 245, 242); // light primary
  doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, 'F');
  
  yPos += 12;
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Date:', 28, yPos);
  doc.setTextColor(...darkColor);
  const paymentDateStr = data.paymentDate ? formatDateTime(data.paymentDate) : formatDateTime(new Date().toISOString());
  doc.text(paymentDateStr, pageWidth - 28, yPos, { align: 'right' });
  
  yPos += 10;
  
  if (data.paymentMethod) {
    doc.setTextColor(...grayColor);
    doc.text('Payment Method:', 28, yPos);
    doc.setTextColor(...darkColor);
    doc.text(data.paymentMethod, pageWidth - 28, yPos, { align: 'right' });
  }
  
  yPos += 20;
  
  // Info banner
  doc.setFillColor(239, 246, 255); // light blue
  doc.setDrawColor(59, 130, 246); // blue
  doc.setLineWidth(2);
  doc.roundedRect(20, yPos, pageWidth - 40, 20, 0, 0, 'FD');
  
  yPos += 13;
  
  doc.setTextColor(30, 64, 175); // dark blue
  doc.setFontSize(9);
  doc.text('📧 Keep this receipt as proof of payment. Access your payment history from your dashboard.', 28, yPos);
  
  yPos += 25;
  
  // Footer
  doc.setDrawColor(220, 220, 220);
  doc.line(20, yPos, pageWidth - 20, yPos);
  
  yPos += 12;
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.text('Need help? Call us at 1-877-8-VENDI-2 or email support@vendibook.com', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  
  doc.text(`© ${new Date().getFullYear()} VendiBook. All rights reserved.`, pageWidth / 2, yPos, { align: 'center' });
  
  // Download the PDF
  const fileName = `vendibook-receipt-${data.transactionId.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
