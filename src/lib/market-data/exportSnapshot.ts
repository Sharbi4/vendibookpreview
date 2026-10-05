import type { GroupStats, MarketStats } from './foodTruckPrices';

/** Aggregate advertised prices only; never expose listing or seller records. */
export function buildMarketSnapshotCsv(stats: MarketStats): string {
  const groups: [string, GroupStats][] = [
    ['All food trucks and trailers', stats.overall],
    ['Food trucks', stats.trucks], ['Food trailers', stats.trailers],
    ['Seller-declared used', stats.usedUnits], ['Seller-declared new', stats.newUnits],
    ['Coffee', stats.coffee], ['Ice cream', stats.iceCream],
    ...stats.states.map((s): [string, GroupStats] => [`State: ${s.stateName}`, s]),
  ];
  const rows: (string | number)[][] = [[
    'snapshot_utc', 'source_url', 'scope', 'price_basis', 'currency',
    'group', 'listing_count', 'median', 'p25', 'p75', 'statistics_status',
  ]];
  for (const [label, group] of groups) {
    rows.push([
      stats.fetchedAt.toISOString(), 'https://vendibook.com/food-truck-prices',
      'Qualifying active Vendibook listings only; not representative of the entire market',
      'Advertised asking prices; completed sale prices excluded', 'USD', label, group.n,
      group.sufficient ? group.median : '', group.sufficient ? group.p25 : '',
      group.sufficient ? group.p75 : '', group.sufficient ? 'published' : 'insufficient_sample',
    ]);
  }
  return rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n') + '\r\n';
}

export function downloadMarketSnapshot(stats: MarketStats): void {
  const url = URL.createObjectURL(new Blob([buildMarketSnapshotCsv(stats)], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `vendibook-asking-price-summary-${stats.fetchedAt.toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
