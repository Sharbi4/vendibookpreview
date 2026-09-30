// Public Meta (Facebook) catalog product feed. Plain GET, no auth, returns CSV.
import { createClient } from 'npm:@supabase/supabase-js@2';

const TEST_PREFIXES = ['demo', 'qa ', 'qa_', 'qa-', 'test ', 'e2e ', 'smoke ', 'sandbox '];
const COLUMNS = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'additional_image_link', 'brand'];

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
};

function rentalPrice(l: any): { amount: number; period: string } | null {
  for (const [key, period] of [['price_daily', 'day'], ['price_weekly', 'week'], ['price_monthly', 'month'], ['price_hourly', 'hour']] as const) {
    const n = num(l[key]);
    if (n) return { amount: n, period };
  }
  return null;
}

const csv = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const clean = (s: unknown) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('listings')
      .select('id,title,description,mode,condition,price_sale,price_daily,price_weekly,price_monthly,price_hourly,cover_image_url,image_urls,make,city,state')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .is('deleted_at', null)
      .eq('moderation_status', 'clear')
      .order('published_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('meta-catalog-feed query failed:', error.message);
      return new Response('Feed temporarily unavailable', { status: 503, headers: { 'Retry-After': '300' } });
    }
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  const lines = [COLUMNS.join(',')];
  for (const l of rows) {
    const rawTitle = clean(l.title);
    if (!rawTitle || TEST_PREFIXES.some((p) => rawTitle.toLowerCase().startsWith(p))) continue;

    const images = (Array.isArray(l.image_urls) ? l.image_urls : []).filter((u: unknown) => typeof u === 'string' && u.trim());
    const cover = (typeof l.cover_image_url === 'string' && l.cover_image_url.trim()) || images[0];
    if (!cover) continue;

    const isRent = l.mode === 'rent';
    let amount: number | null;
    let rental: ReturnType<typeof rentalPrice> = null;
    if (isRent) {
      rental = rentalPrice(l);
      amount = rental?.amount ?? null;
    } else {
      amount = num(l.price_sale);
    }
    if (!amount) continue;

    let title = rawTitle;
    if (isRent && !title.startsWith('[For Rent]')) title = `[For Rent] ${title}`;
    title = title.slice(0, 200);

    const place = [clean(l.city), clean(l.state)].filter(Boolean).join(', ');
    const parts: string[] = [];
    if (isRent && rental) parts.push(`Rental $${rental.amount.toFixed(2)}/${rental.period}.`);
    const body = clean(l.description);
    if (body) parts.push(body);
    const suffix = place ? ` Located in ${place}.` : '';
    let description = parts.join(' ');
    description = (description.slice(0, 5000 - suffix.length) + suffix).trim() || title;

    const additional = images.filter((u: string) => u !== cover).slice(0, 4).join(',');
    const brand = clean(l.make) || 'Vendibook';

    lines.push([
      l.id,
      title,
      description,
      'in stock',
      l.condition === 'new' ? 'new' : 'used',
      `${amount.toFixed(2)} USD`,
      `https://vendibook.com/listing/${l.id}`,
      cover,
      additional,
      brand,
    ].map((v) => csv(String(v))).join(','));
  }

  return new Response(req.method === 'HEAD' ? null : lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="vendibook-meta-catalog.csv"',
      'Cache-Control': 'public, max-age=900',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
