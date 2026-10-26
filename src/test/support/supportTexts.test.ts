/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory fake of the Supabase query builder */
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

type Row = Record<string, any>;

function fakeDb(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = (tables[table] ??= []);
      const filters: Array<(r: Row) => boolean> = [];
      let mode: 'select' | 'update' | 'insert' = 'select';
      let patch: Row = {};
      let inserted: Row[] = [];
      const q: any = {
        select: () => q,
        eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return q; },
        gte: (k: string, v: string) => { filters.push((r) => String(r[k]) >= v); return q; },
        not: (k: string, op: string, v: string) => {
          const list = op === 'in' ? v.replace(/[()]/g, '').split(',') : [v];
          filters.push((r) => !list.includes(r[k])); return q;
        },
        order: () => q,
        limit: () => q,
        update: (p: Row) => { mode = 'update'; patch = p; return q; },
        insert: (r: Row | Row[]) => {
          mode = 'insert';
          inserted = (Array.isArray(r) ? r : [r]).map((one) => ({ id: crypto.randomUUID(), reference_code: `VB-${rows.length + 1}`, status: 'new', created_at: new Date().toISOString(), ...one }));
          rows.push(...inserted);
          return q;
        },
        run() {
          if (mode === 'insert') return inserted;
          const hit = rows.filter((r) => filters.every((f) => f(r)));
          if (mode === 'update') hit.forEach((r) => Object.assign(r, patch));
          return hit;
        },
        maybeSingle: () => Promise.resolve({ data: q.run()[0] ?? null, error: null }),
        single: () => { const d = q.run()[0]; return Promise.resolve({ data: d ?? null, error: d ? null : { message: 'no row' } }); },
        then: (resolve: (v: Row) => void) => resolve({ data: q.run(), error: null }),
      };
      return q;
    },
  };
}

function compile(path: string) {
  return ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [(context) => (root) => ts.visitNode(root, function visit(node): any {
      return ts.isImportDeclaration(node) ? undefined : ts.visitEachChild(node, visit, context);
    }) as ts.SourceFile] },
  }).outputText.replace(/export (async )?function/g, '$1function').replace(/export const/g, 'const').replace(/export \{\};?/, '');
}

function load(env: Record<string, string> = {}, emailDue = true) {
  const tables: Record<string, Row[]> = { support_tickets: [], user_roles: [{ user_id: 'admin-1', role: 'admin' }], notifications: [] };
  const emails = vi.fn(async (_i: Row) => ({ data: {}, error: null }));
  const sms = vi.fn(async (_i: Row) => ({ ok: true }));
  const ctx: Row = {
    Deno: { env: { get: (k: string) => env[k] } },
    followUpDueAt: (d: Date) => new Date(d.getTime() + 2 * 3600_000),
    formatEt: () => 'Tue 3:00 PM ET',
    inFollowUpHours: () => true,
    adminAlertEmails: () => ['support@vendibook.com', 'owner@vendibook.test'],
    adminNoticeKey: (b: string, r: string) => `${b}:${r}`,
    invokeTransactionalEmail: emails,
    checkRateLimit: async () => emailDue,
    sendGuardedSms: sms,
    Intl, Date, Number, String, Math, JSON, Promise, encodeURIComponent, crypto: globalThis.crypto,
    console: { error: vi.fn(), warn: vi.fn() },
  };
  vm.runInNewContext(`${compile('supabase/functions/_shared/supportTexts.ts')}\nthis.routeSupportText = routeSupportText;`, ctx);
  const db = fakeDb(tables);
  const route = (body: string, from = '+16025551234') => ctx.routeSupportText(db, { from, body, media: 0, inboundId: crypto.randomUUID() });
  return { route, tables, emails, sms };
}

describe('texts to the support line', () => {
  it('opens a ticket, alerts every admin and acknowledges the first text', async () => {
    const t = load();
    const reply = await t.route('Hi, is the 2019 step van still available?');
    expect(reply).toContain('A real person on our team will text you back within 2 hours');
    expect(t.tables.support_tickets).toHaveLength(1);
    expect(t.tables.support_tickets[0]).toMatchObject({ category: 'text_message', callback_phone_e164: '+16025551234', title: 'Text from (602) 555-1234', priority: 'high' });
    expect(t.tables.support_tickets[0].description).toContain('2019 step van');
    expect(t.tables.notifications[0]).toMatchObject({ user_id: 'admin-1', link: '/admin/texts?phone=%2B16025551234' });
    expect(t.emails.mock.calls.map(([i]) => i.recipientEmail)).toEqual(['support@vendibook.com', 'owner@vendibook.test']);
  });

  it('adds follow-up texts to the same ticket without another auto-reply', async () => {
    const t = load({}, false);
    await t.route('First question');
    const reply = await t.route('Also, do you deliver?');
    expect(reply).toBeNull();
    expect(t.tables.support_tickets).toHaveLength(1);
    expect(t.tables.support_tickets[0].description).toContain('do you deliver?');
    expect(t.tables.notifications).toHaveLength(2);
    // Second text inside the 10-minute window: no second email burst.
    expect(t.emails).toHaveBeenCalledTimes(2);
  });

  it('forwards to the owner phones in ADMIN_SMS_FORWARD_TO through the SMS guard', async () => {
    const t = load({ ADMIN_SMS_FORWARD_TO: '+15205550000' });
    await t.route('Need help with my payout');
    expect(t.sms).toHaveBeenCalledTimes(1);
    expect(t.sms.mock.calls[0][0]).toMatchObject({ recipientPhone: '+15205550000', category: 'customer_care' });
    expect(t.sms.mock.calls[0][0].body).toContain('(602) 555-1234: Need help with my payout');
  });
});
