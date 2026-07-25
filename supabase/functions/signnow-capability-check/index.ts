// One-off capability probe: does this SignNow account have the Notary/Proof
// add-on enabled? Safe to call — only performs read-only GETs against the
// SignNow API using the configured service credentials.
//
// Returns { configured, user, notary: { available, evidence, missing } }.

import { corsHeaders, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { getAccessToken, isSignNowConfigured, signnowBase } from '../_shared/signnow.ts';

async function signnowGet(path: string, token: string) {
  const res = await fetch(`${signnowBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep raw */ }
  return { status: res.status, ok: res.ok, body };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!isSignNowConfigured()) {
      return jsonResponse({
        configured: false,
        notary: { available: false, missing: ['SignNow env vars'] },
      });
    }

    const token = await getAccessToken();

    // 1. Fetch user + subscription/plan info.
    const user = await signnowGet('/user', token);

    // 2. Probe notary-invite endpoint shape (should return 400/404 not 403
    //    when the account has the feature; 403/402 => feature not enabled).
    //    We hit it with a bogus document id and inspect the error type.
    const probe = await signnowGet('/proof/notary-invites', token);

    const userJson = (typeof user.body === 'object' && user.body) as Record<string, unknown> | null;
    const subs = (userJson?.subscriptions ?? userJson?.plans ?? []) as unknown[];
    const subStr = JSON.stringify(subs).toLowerCase();
    const mentionsNotary = subStr.includes('notar') || subStr.includes('proof');

    const notaryAvailable =
      mentionsNotary || (probe.status !== 403 && probe.status !== 402 && probe.status !== 404);

    return jsonResponse({
      configured: true,
      user: {
        status: user.status,
        email: userJson?.primary_email ?? userJson?.email ?? null,
        subscriptions: subs,
      },
      notary: {
        available: notaryAvailable,
        probeStatus: probe.status,
        probeBody: probe.body,
        evidence: mentionsNotary ? 'subscription mentions notary/proof' : 'probe endpoint reachable',
        missing: notaryAvailable ? [] : ['Notary/Proof add-on on SignNow plan'],
      },
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
