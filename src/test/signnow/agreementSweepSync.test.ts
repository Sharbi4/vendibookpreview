/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory fake of the Supabase query builder */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";

const SECRET = "test-webhook-secret";

function load(docs: any[], remote: Record<string, any>) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response("{}"));
  let handler!: (req: Request) => Promise<Response>;
  const source = fs.readFileSync("supabase/functions/signnow-agreement-sweep/index.ts", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [(context) => (root) => ts.visitNode(root, function visit(node): any {
      return ts.isImportDeclaration(node) ? undefined : ts.visitEachChild(node, visit, context);
    }) as ts.SourceFile] },
  }).outputText.replace(/export \{\};?/, "");
  const query = (rows: any[]) => {
    const q: any = {};
    for (const m of ["select", "in", "neq", "is", "lt", "gte", "order", "limit", "eq"]) q[m] = () => q;
    q.then = (resolve: (v: any) => void) => resolve({ data: rows, error: null });
    return q;
  };
  vm.runInNewContext(compiled, {
    Deno: { env: { get: (k: string) => ({ SIGNNOW_WEBHOOK_SECRET: SECRET, SUPABASE_URL: "https://x.test" } as any)[k] }, serve: (h: any) => { handler = h; } },
    createClient: () => ({ from: (t: string) => query(t === "documents" ? docs : []) }),
    isAdminOrBackendCaller: async () => true,
    forbiddenResponse: () => new Response("no", { status: 403 }),
    ensurePurchaseSaleAgreement: vi.fn(), ensureRentalAgreement: vi.fn(),
    getDocument: async (id: string) => remote[id],
    corsHeaders: {}, jsonResponse: (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s }),
    unknownErrorResponse: (e: unknown) => new Response(String(e), { status: 500 }),
    fetch: fetchMock, crypto: globalThis.crypto, TextEncoder, Uint8Array, Array, JSON, Date, String, Number, Response, console: { log: vi.fn(), error: vi.fn() },
  });
  return { run: async () => (await handler(new Request("https://x.test", { method: "POST" }))).json(), fetchMock };
}

describe("signnow-agreement-sweep missed-signature sync", () => {
  it("replays signing progress through the signed webhook, once per signing step", async () => {
    const docs = [
      { id: "d1", signnow_document_id: "sn1", status: "sent" },
      { id: "d2", signnow_document_id: "sn2", status: "sent" },
      { id: "d3", signnow_document_id: "sn3", status: "partially_signed" },
    ];
    const remote = {
      sn1: { field_invites: [{ status: "fulfilled" }, { status: "fulfilled" }] },
      sn2: { field_invites: [{ status: "pending" }, { status: "pending" }] },
      sn3: { field_invites: [{ status: "fulfilled" }, { status: "pending" }] },
    };
    const t = load(docs, remote);
    const out = await t.run();
    expect(out.synced).toEqual([{ document_id: "d1", fulfilled: 2, of: 2, webhook_status: 200 }]);
    const [url, init] = t.fetchMock.mock.calls[0];
    expect(url).toBe("https://x.test/functions/v1/signnow-webhook");
    const body = String(init.body);
    expect(JSON.parse(body)).toMatchObject({ event_id: "sweep-sync:sn1:2", meta: { document_id: "sn1" } });
    const expected = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
    expect((init.headers as Record<string, string>)["x-neap-signature"]).toBe(expected);
  });
});
