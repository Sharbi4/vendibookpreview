/**
 * Neutralizes spreadsheet formula injection: text cells that start with a
 * formula trigger (=, +, -, @, tab or carriage return) are prefixed with an
 * apostrophe so Excel/Sheets show them as plain text instead of running them.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function safeSpreadsheetCell<T>(value: T): T | string {
  if (typeof value !== 'string') return value;
  if (value.length > 1 && FORMULA_START.test(value)) return `'${value}`;
  if (value.length === 1 && value !== '-' && FORMULA_START.test(value)) return `'${value}`;
  return value;
}

export function safeSpreadsheetRows<R extends Record<string, unknown>>(rows: R[]): R[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) out[key] = safeSpreadsheetCell(value);
    return out as R;
  });
}
