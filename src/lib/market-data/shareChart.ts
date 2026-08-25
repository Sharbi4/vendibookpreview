/**
 * Generates a shareable SVG chart (press/LinkedIn/blog-ready) from pricing
 * statistics, with mandatory "Source: Vendibook Marketplace Data" attribution.
 * Downloaded charts always carry attribution + canonical URL.
 */

export interface ChartBand {
  label: string;
  count: number;
  pct: number;
}

const W = 1080;
const ROW_H = 64;
const PAD_X = 48;
const HEADER_H = 150;
const FOOTER_H = 84;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildPriceDistributionSvg(opts: {
  title: string;
  subtitle: string;
  bands: ChartBand[];
  snapshot: string;
}): string {
  const { title, subtitle, bands, snapshot } = opts;
  const H = HEADER_H + bands.length * ROW_H + FOOTER_H;
  const barMaxW = W - PAD_X * 2 - 320;
  const maxPct = Math.max(...bands.map((b) => b.pct), 1);

  const rows = bands
    .map((b, i) => {
      const y = HEADER_H + i * ROW_H;
      const bw = Math.max((b.pct / maxPct) * barMaxW, 4);
      return `
  <text x="${PAD_X}" y="${y + 26}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="600" fill="#1c1917">${esc(b.label)}</text>
  <rect x="${PAD_X + 200}" y="${y + 8}" width="${bw.toFixed(0)}" height="28" rx="14" fill="#ea580c"/>
  <text x="${PAD_X + 210 + bw}" y="${y + 29}" font-family="Inter, Arial, sans-serif" font-size="20" fill="#78716c">${b.count} listings · ${b.pct}%</text>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fafaf9"/>
  <rect x="0" y="0" width="${W}" height="10" fill="#ea580c"/>
  <text x="${PAD_X}" y="64" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="#1c1917">${esc(title)}</text>
  <text x="${PAD_X}" y="102" font-family="Inter, Arial, sans-serif" font-size="22" fill="#78716c">${esc(subtitle)}</text>
  <text x="${PAD_X}" y="132" font-family="Inter, Arial, sans-serif" font-size="18" fill="#a8a29e">Data snapshot: ${esc(snapshot)} · Advertised asking prices</text>
${rows}
  <line x1="${PAD_X}" y1="${H - FOOTER_H + 18}" x2="${W - PAD_X}" y2="${H - FOOTER_H + 18}" stroke="#e7e5e4" stroke-width="1"/>
  <text x="${PAD_X}" y="${H - 34}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600" fill="#57534e">Source: Vendibook Marketplace Data</text>
  <text x="${W - PAD_X}" y="${H - 34}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="18" fill="#a8a29e">vendibook.com/food-truck-prices</text>
</svg>`;
}

export function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
