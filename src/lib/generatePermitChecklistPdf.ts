import { jsPDF } from 'jspdf';

export interface PermitChecklistItem {
  title: string;
  issuer: string;
  level: string;
  cost_estimate: string;
  timeline_estimate: string;
  official_url: string;
  why_it_matters: string;
  commonly_missed?: boolean;
}

export interface PermitChecklistCategory {
  name: string;
  items: PermitChecklistItem[];
}

export interface PermitChecklistData {
  location: { city?: string; state: string; business_type?: string };
  businessType?: string;
  recent_law_alert?: string | null;
  estimated_total_cost?: { display?: string };
  estimated_setup_weeks?: { display?: string };
  categories: PermitChecklistCategory[];
  verify_note?: string;
  completed?: Record<string, boolean>;
}

const MARGIN = 48;
const PAGE_W = 612; // letter
const PAGE_H = 792;

export function generatePermitChecklistPdf(data: PermitChecklistData): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  let y = MARGIN;

  const ensureSpace = (need: number) => {
    if (y + need > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(8, 8, 10);
  doc.text('PermitPath Checklist', MARGIN, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 96);
  const loc = `${data.location.city ? data.location.city + ', ' : ''}${data.location.state}`;
  const biz = (data.businessType || data.location.business_type || '').replace(/_/g, ' ');
  doc.text(`${loc}${biz ? '  ·  ' + biz : ''}`, MARGIN, y);
  y += 24;

  // Summary
  if (data.estimated_total_cost?.display || data.estimated_setup_weeks?.display) {
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 44);
    if (data.estimated_total_cost?.display) {
      doc.text(`Estimated total cost: ${data.estimated_total_cost.display}`, MARGIN, y); y += 14;
    }
    if (data.estimated_setup_weeks?.display) {
      doc.text(`Typical setup time: ${data.estimated_setup_weeks.display}`, MARGIN, y); y += 14;
    }
    y += 8;
  }

  if (data.recent_law_alert) {
    ensureSpace(60);
    doc.setFillColor(255, 240, 232);
    doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 4, 'F');
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 60, 20);
    doc.text('Recent law change', MARGIN, y); y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 66);
    const lines = doc.splitTextToSize(data.recent_law_alert, PAGE_W - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    y += lines.length * 12 + 12;
  }

  // Categories
  for (const cat of data.categories || []) {
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(8, 8, 10);
    doc.text(cat.name, MARGIN, y);
    y += 16;
    doc.setDrawColor(220, 220, 224);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 12;

    for (const item of cat.items || []) {
      ensureSpace(80);
      const done = data.completed?.[`${cat.name}::${item.title}`];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(8, 8, 10);
      doc.text(`${done ? '[x]' : '[ ]'}  ${item.title}`, MARGIN, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 106);
      const meta = `${item.issuer || ''}${item.level ? ' · ' + item.level : ''}${item.cost_estimate ? ' · ' + item.cost_estimate : ''}${item.timeline_estimate ? ' · ' + item.timeline_estimate : ''}`;
      doc.text(meta, MARGIN + 18, y);
      y += 12;

      if (item.why_it_matters) {
        doc.setTextColor(60, 60, 66);
        const lines = doc.splitTextToSize(item.why_it_matters, PAGE_W - MARGIN * 2 - 18);
        doc.text(lines, MARGIN + 18, y);
        y += lines.length * 11;
      }
      if (item.official_url) {
        doc.setTextColor(60, 100, 180);
        doc.textWithLink(item.official_url, MARGIN + 18, y + 2, { url: item.official_url });
        y += 12;
      }
      y += 8;
    }
    y += 8;
  }

  if (data.verify_note) {
    ensureSpace(40);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 126);
    const lines = doc.splitTextToSize(data.verify_note, PAGE_W - MARGIN * 2);
    doc.text(lines, MARGIN, y);
  }

  return doc;
}

export function downloadPermitChecklistPdf(data: PermitChecklistData, filename = 'permitpath-checklist.pdf') {
  const doc = generatePermitChecklistPdf(data);
  doc.save(filename);
}
