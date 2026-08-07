import jsPDF from 'jspdf';

export interface PurchaseSheetListing {
  id: string;
  title?: string | null;
  category?: string | null;
  price?: number | null;
  sale_price?: number | null;
  year?: number | string | null;
  make?: string | null;
  model?: string | null;
  condition?: string | null;
  mileage?: number | string | null;
  title_status?: string | null;
  city?: string | null;
  state?: string | null;
  description?: string | null;
}

const DISCLAIMER =
  'Generated from seller-provided Vendibook listing information. This document is a pro forma purchase summary—not proof of purchase, ownership, condition, value, financing approval, or a binding invoice. Equinox Funding or another financing provider may request a final seller-issued invoice, purchase agreement, or additional documentation.';

const money = (v?: number | null) =>
  typeof v === 'number' && !Number.isNaN(v)
    ? v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : 'Not listed';

const titleCase = (s?: string | null) =>
  (s || '').toString().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

export function generateFinancingPurchaseSheet(
  listing: PurchaseSheetListing,
  sellerName: string,
) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  // Header band
  doc.setFillColor(8, 8, 10);
  doc.rect(0, 0, pageW, 92, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Vendibook', margin, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 205);
  doc.text('vendibook.com', margin, 62);
  y = 128;

  doc.setTextColor(15, 15, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PRO FORMA INVOICE / EQUIPMENT PURCHASE SUMMARY', margin, y, {
    maxWidth: pageW - margin * 2,
  });
  y += 26;

  const canonicalUrl = `https://vendibook.com/listing/${listing.id}`;
  const rows: Array<[string, string]> = [
    ['Generated', new Date().toLocaleString('en-US')],
    ['Vendibook listing ID', listing.id],
    ['Listing URL', canonicalUrl],
    ['Item', listing.title || 'Untitled listing'],
    ['Asking price', money(listing.sale_price ?? listing.price ?? null)],
    ['Category', titleCase(listing.category) || 'Not listed'],
    ['Year', listing.year ? String(listing.year) : 'Not listed'],
    ['Make', listing.make || 'Not listed'],
    ['Model', listing.model || 'Not listed'],
    ['Condition', titleCase(listing.condition) || 'Not listed'],
  ];
  if (listing.mileage !== null && listing.mileage !== undefined && String(listing.mileage) !== '') {
    rows.push(['Mileage', `${Number(listing.mileage).toLocaleString('en-US')} mi`]);
  }
  rows.push(['Title status', titleCase(listing.title_status) || 'Not listed']);
  rows.push([
    'Location',
    [listing.city, listing.state].filter(Boolean).join(', ') || 'Not listed',
  ]);
  rows.push(['Seller', sellerName || 'Vendibook member']);

  doc.setFontSize(10);
  const labelW = 150;
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 78);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 15, 18);
    const lines = doc.splitTextToSize(value, pageW - margin * 2 - labelW);
    doc.text(lines, margin + labelW, y);
    y += Math.max(16, lines.length * 13);
    doc.setDrawColor(228, 228, 232);
    doc.line(margin, y - 6, pageW - margin, y - 6);
  });

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 18);
  doc.text('Description', margin, y);
  y += 15;
  doc.setFont('helvetica', 'normal');
  const desc = (listing.description || 'No description provided.').replace(/\s+/g, ' ').slice(0, 900);
  const descLines = doc.splitTextToSize(desc, pageW - margin * 2);
  doc.text(descLines, margin, y);
  y += descLines.length * 13 + 22;

  doc.setDrawColor(200, 200, 206);
  doc.line(margin, y - 10, pageW - margin, y - 10);
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 98);
  const disc = doc.splitTextToSize(DISCLAIMER, pageW - margin * 2);
  doc.text(disc, margin, y);

  doc.save(`vendibook-financing-purchase-sheet-${listing.id}.pdf`);
}
