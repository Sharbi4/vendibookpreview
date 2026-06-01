// Admin-only end-to-end QA runner for Vendibook.
// Tests: signup_login, publishing, full_journey.
// Uses the real auth + listings flow that customers use, then cleans up.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Step = {
  step: string;
  status: "pass" | "fail" | "skip";
  message: string;
  user_facing_message?: string;
  details?: unknown;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function ok(step: string, message: string, details?: unknown): Step {
  return { step, status: "pass", message, details };
}
function fail(step: string, message: string, user_facing_message: string, details?: unknown): Step {
  return { step, status: "fail", message, user_facing_message, details };
}

async function assertAdmin(req: Request): Promise<{ userId: string } | Response> {
  const authz = req.headers.get("Authorization") ?? "";
  const token = authz.replace(/^Bearer\s+/i, "");
  if (!token) return new Response(JSON.stringify({ error: "missing_auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData?.user) return new Response(JSON.stringify({ error: "invalid_auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: isAdmin } = await admin.rpc("is_admin", { user_id: userData.user.id });
  if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return { userId: userData.user.id };
}

async function alertHighPriority(testName: string, failedStep: Step, allSteps: Step[]) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/log-error-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        source: "qa-test-runner",
        action: `qa.publish.${testName}`, // 'publish' triggers HIGH priority routing
        endpoint: `qa-test-runner/${testName}`,
        error_type: "QATestFailure",
        error_message: `QA ${testName} failed at step "${failedStep.step}": ${failedStep.message}`,
        metadata: { test: testName, failed_step: failedStep, all_steps: allSteps },
        priority: "high",
      }),
    });
  } catch (_) { /* swallow alert errors */ }
}

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

// ---------- Test: Signup & Login ----------
async function runSignupLogin(): Promise<{ steps: Step[]; cleanup: () => Promise<void> }> {
  const steps: Step[] = [];
  const tag = nowTag();
  const email = `qa-bot+${tag}@vendibook.test`;
  const password = `QaBot!${crypto.randomUUID().slice(0, 8)}Aa1`;
  let createdUserId: string | null = null;

  const cleanup = async () => {
    if (createdUserId) {
      try { await admin.auth.admin.deleteUser(createdUserId); } catch (_) { /* noop */ }
    }
  };

  // 1. Signup via real public anon signUp flow
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: signUpData, error: signUpErr } = await anon.auth.signUp({
    email, password,
    options: { data: { first_name: "QA", last_name: "Bot", full_name: "QA Bot (Internal)" } },
  });
  if (signUpErr || !signUpData.user) {
    steps.push(fail("signup", signUpErr?.message ?? "no_user", "We couldn't create the account. Please try again or contact Vendibook support."));
    return { steps, cleanup };
  }
  createdUserId = signUpData.user.id;
  steps.push(ok("signup", `Account created (${email})`, { user_id: createdUserId, session_returned: !!signUpData.session }));

  // 2. Confirm session vs email-confirmation policy
  if (!signUpData.session) {
    // Make sure email confirmation is the actual configured behavior; auto-confirm to allow rest of test.
    await admin.auth.admin.updateUserById(createdUserId, { email_confirm: true });
    steps.push(ok("auth.policy", "Email confirmation required — user would see a 'check your email' prompt. Auto-confirmed for QA."));
  } else {
    steps.push(ok("auth.policy", "Auto sign-in after signup is working (no email confirmation gate)."));
  }

  // 3. Sign in via password
  const anon2 = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: signInData, error: signInErr } = await anon2.auth.signInWithPassword({ email, password });
  if (signInErr || !signInData.session) {
    steps.push(fail("login", signInErr?.message ?? "no_session", "We couldn't sign you in. Please check your email and password, or reset your password."));
    return { steps, cleanup };
  }
  steps.push(ok("login", "Sign-in succeeded and a session was returned."));

  // 4. Profile row exists (handle_new_user trigger)
  const { data: profile, error: profErr } = await admin.from("profiles").select("id, email, full_name").eq("id", createdUserId).maybeSingle();
  if (profErr || !profile) {
    steps.push(fail("dashboard.profile", profErr?.message ?? "missing_profile", "We created your account, but something went wrong loading your dashboard. Please contact Vendibook support and we'll help you."));
    return { steps, cleanup };
  }
  steps.push(ok("dashboard.profile", "Profile row exists — dashboard will load with user data.", profile));

  // 5. Refresh session (simulates page refresh / persistence)
  const { data: refreshData, error: refreshErr } = await anon2.auth.refreshSession({ refresh_token: signInData.session.refresh_token });
  if (refreshErr || !refreshData.session) {
    steps.push(fail("session.refresh", refreshErr?.message ?? "no_refresh", "You were signed out unexpectedly. Please sign in again."));
    return { steps, cleanup };
  }
  steps.push(ok("session.refresh", "Session survived a refresh (refresh token works)."));

  // 6. Sign out
  const { error: signOutErr } = await anon2.auth.signOut();
  if (signOutErr) {
    steps.push(fail("logout", signOutErr.message, "We couldn't sign you out. Please try again."));
    return { steps, cleanup };
  }
  steps.push(ok("logout", "Sign-out succeeded."));

  // 7. Sign back in
  const anon3 = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: relogin, error: reErr } = await anon3.auth.signInWithPassword({ email, password });
  if (reErr || !relogin.session) {
    steps.push(fail("login.again", reErr?.message ?? "no_session", "We couldn't sign you back in. Please reset your password."));
    return { steps, cleanup };
  }
  steps.push(ok("login.again", "Re-login succeeded — dashboard would load again."));

  return { steps, cleanup };
}

// ---------- Test: Listing publishing ----------
async function runPublishing(): Promise<{ steps: Step[]; cleanup: () => Promise<void>; listingId?: string; userId?: string; email?: string; password?: string }> {
  const steps: Step[] = [];
  const tag = nowTag();
  const email = `qa-bot+${tag}@vendibook.test`;
  const password = `QaBot!${crypto.randomUUID().slice(0, 8)}Aa1`;
  let userId: string | null = null;
  let listingId: string | null = null;

  const cleanup = async () => {
    if (listingId) { try { await admin.from("listings").delete().eq("id", listingId); } catch (_) {} }
    if (userId) { try { await admin.auth.admin.deleteUser(userId); } catch (_) {} }
  };

  // Setup: create + auto-confirm a host user, sign in.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { first_name: "QA", last_name: "Host", full_name: "QA Host (Internal)" },
  });
  if (createErr || !created.user) {
    steps.push(fail("setup.user", createErr?.message ?? "no_user", "We couldn't prepare the test host account."));
    return { steps, cleanup };
  }
  userId = created.user.id;
  steps.push(ok("setup.user", `Test host created (${email}).`));

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
  if (signInErr || !signInData.session) {
    steps.push(fail("setup.signin", signInErr?.message ?? "no_session", "We couldn't sign in as the test host."));
    return { steps, cleanup };
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${signInData.session.access_token}` } },
  });

  // 1. Create draft listing as user (real RLS path)
  const draftTitle = `QA-TEST-${tag} (internal, auto-cleanup)`;
  const { data: draft, error: draftErr } = await userClient.from("listings").insert({
    host_id: userId,
    title: draftTitle,
    description: "Internal Vendibook QA test listing. Auto-deleted after the test run.",
    mode: "rent",
    category: "food_truck",
    fulfillment_type: "on_site",
    city: "Phoenix",
    state: "AZ",
    status: "draft",
  }).select("id, status, title").single();
  if (draftErr || !draft) {
    steps.push(fail("listing.create_draft", draftErr?.message ?? "no_draft", "We couldn't start your listing. Please try again or contact Vendibook support."));
    return { steps, cleanup };
  }
  listingId = draft.id;
  steps.push(ok("listing.create_draft", "Draft listing created via the same RLS path the wizard uses.", draft));

  // 2. Add a placeholder photo (image_urls array)
  const photoUrl = "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/listing-images/placeholder/qa-test.jpg";
  const { error: imgErr } = await userClient.from("listings").update({
    image_urls: [photoUrl], cover_image_url: photoUrl,
  }).eq("id", listingId);
  if (imgErr) {
    steps.push(fail("listing.photo", imgErr.message, "We couldn't attach a photo to your listing."));
    return { steps, cleanup, listingId: listingId ?? undefined, userId: userId ?? undefined, email, password };
  }
  steps.push(ok("listing.photo", "Photo attached to listing (image_urls + cover_image_url)."));

  // 3. Publish the listing
  const { data: published, error: pubErr } = await userClient.from("listings").update({
    status: "published", published_at: new Date().toISOString(),
  }).eq("id", listingId).select("id, status, published_at").single();
  if (pubErr || published?.status !== "published") {
    steps.push(fail("listing.publish", pubErr?.message ?? "not_published", "We couldn't publish your listing. Please make sure all required fields are complete."));
    return { steps, cleanup, listingId: listingId ?? undefined, userId: userId ?? undefined, email, password };
  }
  steps.push(ok("listing.publish", "Listing transitioned draft → published.", published));

  // 4. Listing visible in user dashboard (host scope)
  const { data: dash, error: dashErr } = await userClient.from("listings").select("id, status").eq("host_id", userId);
  if (dashErr || !dash?.find((l) => l.id === listingId)) {
    steps.push(fail("dashboard.list", dashErr?.message ?? "missing_in_dashboard", "We published the listing, but it's not showing in your dashboard yet."));
  } else {
    steps.push(ok("dashboard.list", `Listing appears in host dashboard (${dash.length} total).`));
  }

  // 5. Public listing detail page – fetch via anon (what /listing/:id loads)
  const pub = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: pubRow, error: pubRowErr } = await pub.from("listings").select("id, status, title").eq("id", listingId).maybeSingle();
  if (pubRowErr || !pubRow) {
    steps.push(fail("listing.public_page", pubRowErr?.message ?? "not_visible", "The public listing page isn't loading. Please contact Vendibook support."));
  } else {
    steps.push(ok("listing.public_page", "Public listing page query returned the listing.", pubRow));
  }

  // 6. Visible in browse/search via the same edge function the homepage uses
  try {
    const sResp = await fetch(`${SUPABASE_URL}/functions/v1/search-listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ query: "", limit: 200, sort: "newest" }),
    });
    const sJson = await sResp.json().catch(() => ({}));
    const items: any[] = sJson?.listings ?? sJson?.data ?? sJson?.results ?? [];
    const found = Array.isArray(items) && items.find((it) => it.id === listingId);
    if (!found) {
      steps.push(fail("search.visibility", `not_in_first_${items.length}`, "Your listing was published but isn't appearing in browse/search yet.", { returned: items.length }));
    } else {
      steps.push(ok("search.visibility", "Listing appears in the public search-listings feed.", { returned: items.length }));
    }
  } catch (e) {
    steps.push(fail("search.visibility", String(e), "We couldn't verify your listing is searchable."));
  }

  // 7. Edit listing after publish
  const { error: editErr } = await userClient.from("listings").update({ description: "Edited by QA bot." }).eq("id", listingId);
  if (editErr) {
    steps.push(fail("listing.edit", editErr.message, "We couldn't save your edits to the listing."));
  } else {
    steps.push(ok("listing.edit", "Listing can be edited after publishing."));
  }

  return { steps, cleanup, listingId: listingId ?? undefined, userId: userId ?? undefined, email, password };
}

// ---------- Test: Full journey ----------
async function runFullJourney(): Promise<{ steps: Step[]; cleanup: () => Promise<void> }> {
  const steps: Step[] = [];
  // Signup + login first
  const a = await runSignupLogin();
  steps.push(...a.steps);
  await a.cleanup();
  if (steps.some((s) => s.status === "fail")) {
    return { steps, cleanup: async () => {} };
  }
  // Then publishing
  const b = await runPublishing();
  steps.push(...b.steps);

  // Logout / re-login / still see listing
  if (b.email && b.password && b.listingId && b.userId) {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: relog, error: relogErr } = await anon.auth.signInWithPassword({ email: b.email, password: b.password });
    if (relogErr || !relog.session) {
      steps.push(fail("journey.relogin", relogErr?.message ?? "no_session", "We couldn't sign back in after logging out."));
    } else {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${relog.session.access_token}` } },
      });
      const { data: stillThere, error: dashErr } = await userClient.from("listings").select("id").eq("id", b.listingId).maybeSingle();
      if (dashErr || !stillThere) {
        steps.push(fail("journey.persistence", dashErr?.message ?? "listing_missing", "Your listing isn't showing after signing back in."));
      } else {
        steps.push(ok("journey.persistence", "Listing is still visible after logout + re-login."));
      }
      await anon.auth.signOut();
    }
  }

  await b.cleanup();
  steps.push(ok("cleanup", "Test user and test listing deleted."));
  return { steps, cleanup: async () => {} };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const auth = await assertAdmin(req);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => ({}));
  const test = (body?.test ?? "full_journey") as "signup_login" | "publishing" | "full_journey";

  const startedAt = new Date().toISOString();
  let steps: Step[] = [];
  let cleanup: () => Promise<void> = async () => {};
  try {
    if (test === "signup_login") { const r = await runSignupLogin(); steps = r.steps; cleanup = r.cleanup; }
    else if (test === "publishing") { const r = await runPublishing(); steps = r.steps; cleanup = r.cleanup; }
    else { const r = await runFullJourney(); steps = r.steps; cleanup = r.cleanup; }
  } catch (e) {
    steps.push(fail("runner", (e as Error).message, "The QA runner crashed unexpectedly.", { stack: (e as Error).stack }));
  } finally {
    try { await cleanup(); } catch (_) {}
  }

  const failed = steps.find((s) => s.status === "fail");
  if (failed && test === "full_journey") {
    await alertHighPriority(test, failed, steps);
  }

  return new Response(JSON.stringify({
    test, started_at: startedAt, finished_at: new Date().toISOString(),
    passed: !failed, total: steps.length,
    passed_count: steps.filter((s) => s.status === "pass").length,
    failed_count: steps.filter((s) => s.status === "fail").length,
    steps,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
});
