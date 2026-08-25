// deno-lint-ignore-file no-explicit-any
/**
 * pricepilot-appraisal — dedicated PricePilot valuation function.
 *
 * Split from the shared `ai-tools` function so Listing Studio / Concept Lab
 * keep their existing path untouched. Flow:
 *   1. gateToolAccess('pricepilot') — Pro / Premium / lifetime unlock required
 *   2. Validate the subject profile
 *   3. Pull comparable evidence: pricepilot_market_comparables (observed
 *      marketplace evidence) + published Vendibook listings (asking prices)
 *   4. Deterministic valuation (_shared/pricepilot/valuation.ts)
 *   5. AI narrative interprets the computed stats (_shared/pricepilot/model.ts)
 *      and never recalculates them
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { gateToolAccess } from '../_shared/gateToolAccess.ts';
import { jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { generatePricePilotNarrative } from '../_shared/pricepilot/model.ts';
import {
  runRentalValuation,
  runSaleValuation,
  type CompRecord,
  type SubjectProfile,
} from '../_shared/pricepilot/valuation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_CATEGORIES = new Set(['food_truck', 'food_trailer', 'food_cart', 'mobile_bar']);
const VALID_CONDITIONS = new Set(['excellent', 'good', 'fair', 'project']);
const VALID_OPERATIONAL = new Set(['turnkey', 'running', 'needs_work', 'not_running']);
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 1_200_000; // per data URL, after client-side downscale

function parseSubject(body: any): SubjectProfile | Response {
  const mode = body?.mode === 'rental' ? 'rental' : body?.mode === 'sale' ? 'sale' : null;
  if (!mode) return jsonError(400, 'invalid_subject', 'Choose sale or rental appraisal.');
  const assetCategory = String(body?.assetCategory ?? '');
  if (!VALID_CATEGORIES.has(assetCategory)) {
    return jsonError(400, 'invalid_subject', 'Choose a valid equipment type.');
  }

  const features: Record<string, boolean> = {};
  if (body?.features && typeof body.features === 'object') {
    for (const [k, v] of Object.entries(body.features)) {
      if (typeof v === 'boolean') features[k] = v;
    }
  }

  const num = (v: any): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const str = (v: any, max = 120): string | null =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

  const condition = VALID_CONDITIONS.has(body?.condition) ? body.condition : null;
  const operationalStatus = VALID_OPERATIONAL.has(body?.operationalStatus) ? body.operationalStatus : null;

  // Required-field enforcement (mirrors the client wizard). Only what a
  // defensible appraisal genuinely needs: market location, age, condition
  // and operating readiness. Size/mileage/features/notes stay optional and
  // are passed through as unknown (null) rather than guessed.
  const stateRaw = str(body?.state, 2)?.toUpperCase() ?? null;
  const zipRaw = str(body?.zip, 10);
  const hasLocation = !!stateRaw || /^\d{5}$/.test(zipRaw ?? '');
  const yearNum = num(body?.year)
    ? Math.min(new Date().getFullYear() + 2, Math.max(1950, num(body?.year)!))
    : null;

  const missing: string[] = [];
  if (!hasLocation) missing.push('location (state or ZIP code)');
  if (!yearNum) missing.push('year');
  if (!condition) missing.push('condition');
  if (!operationalStatus) missing.push('operational status');
  if (missing.length) {
    return jsonError(
      400,
      'missing_required_fields',
      `Missing required fields: ${missing.join(', ')}. These are needed to produce a defensible appraisal.`,
      { missing },
    );
  }

  return {
    mode,
    assetCategory: assetCategory as SubjectProfile['assetCategory'],
    city: str(body?.city, 80),
    state: str(body?.state, 2)?.toUpperCase() ?? null,
    zip: str(body?.zip, 10),
    year: num(body?.year) ? Math.min(new Date().getFullYear() + 2, Math.max(1950, num(body?.year)!)) : null,
    make: str(body?.make, 60),
    model: str(body?.model, 60),
    lengthFt: num(body?.lengthFt),
    mileage: num(body?.mileage),
    condition,
    operationalStatus,
    features,
    knownIssues: str(body?.knownIssues, 600),
    recentUpgrades: str(body?.recentUpgrades, 600),
    notes: str(body?.notes, 800),
  };
}

function parsePhotos(body: any): string[] {
  if (!Array.isArray(body?.photos)) return [];
  return body.photos
    .filter((p: any) => typeof p === 'string' && p.startsWith('data:image/') && p.length < MAX_PHOTO_BYTES * 1.4)
    .slice(0, MAX_PHOTOS);
}

const CATEGORY_LABEL: Record<string, string> = {
  food_truck: 'Food truck',
  food_trailer: 'Food trailer',
  food_cart: 'Food cart',
  mobile_bar: 'Mobile bar',
};

// ---------------------------------------------------------------------------
// Staged market scope: local -> regional -> national -> modeled.
// The valuation always runs on the tightest tier with enough real evidence;
// the response names its scope so the UI never implies local evidence that
// does not exist.
// ---------------------------------------------------------------------------

type MarketScope = 'local' | 'regional' | 'national' | 'modeled';

const US_REGION: Record<string, string> = {
  CT: 'northeast', ME: 'northeast', MA: 'northeast', NH: 'northeast', RI: 'northeast', VT: 'northeast',
  NJ: 'northeast', NY: 'northeast', PA: 'northeast',
  IL: 'midwest', IN: 'midwest', MI: 'midwest', OH: 'midwest', WI: 'midwest', IA: 'midwest',
  KS: 'midwest', MN: 'midwest', MO: 'midwest', NE: 'midwest', ND: 'midwest', SD: 'midwest',
  DE: 'south', FL: 'south', GA: 'south', MD: 'south', NC: 'south', SC: 'south', VA: 'south',
  WV: 'south', DC: 'south', AL: 'south', KY: 'south', MS: 'south', TN: 'south', AR: 'south',
  LA: 'south', OK: 'south', TX: 'south',
  AZ: 'west', CO: 'west', ID: 'west', MT: 'west', NV: 'west', NM: 'west', UT: 'west',
  WY: 'west', AK: 'west', CA: 'west', HI: 'west', OR: 'west', WA: 'west',
};

const SCOPE_LABEL: Record<MarketScope, string> = {
  local: 'Local market average',
  regional: 'Regional benchmark',
  national: 'Broader market benchmark',
  modeled: 'Modeled midpoint',
};

const SCOPE_HEADLINE: Record<MarketScope, string> = {
  local: 'Local market',
  regional: 'Expanded regional market',
  national: 'Broader U.S. market',
  modeled: 'Modeled estimate',
};

/** Pick the tightest geography tier with enough priced evidence to trust. */
function stageScope(subject: SubjectProfile, comps: CompRecord[]): { scope: MarketScope; pool: CompRecord[] } {
  const priced = comps.filter((c) => typeof c.displayedPrice === 'number' && (c.displayedPrice ?? 0) > 0);
  const st = subject.state?.toUpperCase();
  if (st) {
    const localIds = new Set(priced.filter((c) => c.state?.toUpperCase() === st).map((c) => c.id));
    if (localIds.size >= 5) return { scope: 'local', pool: comps.filter((c) => localIds.has(c.id)) };
    const region = US_REGION[st];
    if (region) {
      const regionIds = new Set(
        priced.filter((c) => c.state && US_REGION[c.state.toUpperCase()] === region).map((c) => c.id),
      );
      if (regionIds.size >= 5) return { scope: 'regional', pool: comps.filter((c) => regionIds.has(c.id)) };
    }
  }
  if (priced.length >= 3) return { scope: 'national', pool: comps };
  return { scope: 'modeled', pool: comps };
}

const SOURCE_DESC: Record<string, string> = {
  facebook_observed: 'Observed marketplace listings, including sold- and pending-status records',
  vendibook_asking: 'Current Vendibook asking prices',
  vendibook_verified: 'Verified Vendibook transaction prices',
};

/** Genuine source labels for the evidence actually used; empty when modeled. */
function describeSources(comps: CompRecord[], scope: MarketScope): string[] {
  if (scope === 'modeled') return [];
  const kinds = new Set(comps.map((c) => c.evidenceType));
  return Object.keys(SOURCE_DESC).filter((k) => kinds.has(k as CompRecord['evidenceType'])).map((k) => SOURCE_DESC[k]);
}

function mapConfidence(label: 'high' | 'moderate' | 'limited', scope: MarketScope): 'high' | 'medium' | 'directional' {
  if (scope === 'modeled') return 'directional';
  return label === 'high' ? 'high' : label === 'moderate' ? 'medium' : 'directional';
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const gate = await gateToolAccess(req, 'pricepilot', corsHeaders);
    if (gate.response) return gate.response;

    const body = await req.json().catch(() => ({}));
    const subject = parseSubject(body);
    if (subject instanceof Response) return subject;
    const photos = parsePhotos(body);
    const subjectListingId = typeof body?.listingId === 'string' ? body.listingId : null;

    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const comps: CompRecord[] = [];

    if (subject.mode === 'sale') {
      // 1. Observed marketplace evidence (Facebook sold/pending status).
      const { data: observed, error: obsErr } = await service
        .from('pricepilot_market_comparables')
        .select(
          'id, source_title, city, state, year, make, model, length_ft, displayed_price, previous_displayed_price, observed_status, evidence_confidence, quality_flags, normalized_features',
        )
        .eq('valuation_mode', 'sale')
        .eq('asset_category', subject.assetCategory)
        .eq('usable_for_valuation', true)
        .not('displayed_price', 'is', null)
        .limit(200);
      if (obsErr) console.warn('comp query failed:', obsErr.message);
      for (const row of observed ?? []) {
        comps.push({
          id: row.id,
          title: row.source_title,
          city: row.city,
          state: row.state,
          year: row.year,
          make: row.make,
          model: row.model,
          lengthFt: row.length_ft ? Number(row.length_ft) : null,
          displayedPrice: row.displayed_price ? Number(row.displayed_price) : null,
          previousDisplayedPrice: row.previous_displayed_price ? Number(row.previous_displayed_price) : null,
          observedStatus: row.observed_status,
          evidenceType: 'facebook_observed',
          evidenceConfidence: row.evidence_confidence ? Number(row.evidence_confidence) : 0.5,
          features: (row.normalized_features as Record<string, unknown>) ?? {},
          qualityFlags: Array.isArray(row.quality_flags) ? (row.quality_flags as string[]) : [],
        });
      }

      // 2. Current Vendibook asking prices (lower-weight evidence).
      if (subject.assetCategory === 'food_truck' || subject.assetCategory === 'food_trailer') {
        const { data: asking, error: askErr } = await service
          .from('listings')
          .select('id, title, city, state, year_built, make, model, length_inches, price_sale')
          .eq('status', 'published')
          .eq('mode', 'sale')
          .eq('category', subject.assetCategory)
          .gt('price_sale', 0)
          .limit(40);
        if (askErr) console.warn('asking comp query failed:', askErr.message);
        for (const row of asking ?? []) {
          if (subjectListingId && row.id === subjectListingId) continue;
          comps.push({
            id: `vb-${row.id}`,
            title: row.title ?? 'Vendibook listing',
            city: row.city,
            state: row.state,
            year: row.year_built,
            make: row.make,
            model: row.model,
            lengthFt: row.length_inches ? Math.round((Number(row.length_inches) / 12) * 10) / 10 : null,
            displayedPrice: Number(row.price_sale),
            previousDisplayedPrice: null,
            observedStatus: 'active',
            evidenceType: 'vendibook_asking',
            evidenceConfidence: 0.4,
            features: {},
            qualityFlags: [],
          });
        }
      }

      const { scope, pool } = stageScope(subject, comps);
      const valuation = runSaleValuation(subject, pool);
      if (scope === 'regional') {
        valuation.warnings.push('Local evidence was sparse, so this report broadened to your surrounding region.');
      } else if (scope === 'national') {
        valuation.warnings.push('Local and regional evidence was sparse. This report uses the broader U.S. market.');
      } else if (scope === 'modeled') {
        valuation.warnings.push('This is a modeled directional estimate from your equipment profile and broad industry bands, not a read of live local comps.');
      }

      const { narrative, model } = await generatePricePilotNarrative({
        photos,
        systemPrompt:
          'You are a senior mobile food equipment appraiser writing the professional interpretation section of a valuation report. ' +
          'The numbers in the brief were computed by a deterministic statistical engine and are FINAL. ' +
          'Never propose different numbers, never invent comps, never claim a marketplace sold status is a verified closing price. ' +
          'If photos are attached, describe only conservative visible cosmetic observations (never claim mechanical condition from a photo). ' +
          'Do not use em dashes. Return strict JSON: {"headline": string, "summary": string (2-4 sentences), "drivers_positive": string[] (max 4), "drivers_negative": string[] (max 4), "caveats": string[] (max 3), "photo_observations": string[] (max 3, empty if no photos)}.',
        userPrompt:
          `VALUATION BRIEF (numbers are final, interpret only):\n` +
          JSON.stringify(
            {
              subject: {
                type: CATEGORY_LABEL[subject.assetCategory],
                location: [subject.city, subject.state].filter(Boolean).join(', ') || 'Not specified',
                year: subject.year,
                make: subject.make,
                model: subject.model,
                lengthFt: subject.lengthFt,
                mileage: subject.mileage,
                condition: subject.condition,
                operationalStatus: subject.operationalStatus,
                equipment: Object.entries(subject.features).filter(([, v]) => v).map(([k]) => k),
                knownIssues: subject.knownIssues,
                recentUpgrades: subject.recentUpgrades,
              },
              result: {
                estimatedMarketLow: valuation.estimatedMarketLow,
                estimatedMarketHigh: valuation.estimatedMarketHigh,
                recommendedListPrice: valuation.recommendedListPrice,
                quickSalePrice: valuation.quickSalePrice,
                premiumPositionPrice: valuation.premiumPositionPrice,
                confidenceScore: valuation.confidenceScore,
                confidenceLabel: valuation.confidenceLabel,
                comparableCount: valuation.comparableCount,
                medianComparablePrice: valuation.medianComparablePrice,
                marketScope: SCOPE_HEADLINE[scope],
              },
              adjustments: valuation.adjustmentSummary,
              warnings: valuation.warnings,
              topComparables: valuation.comparables.slice(0, 8).map((c) => ({
                title: c.title,
                location: [c.city, c.state].filter(Boolean).join(', '),
                displayedPrice: c.displayedPrice,
                status: c.observedStatus,
                evidence: c.evidenceType,
                similarity: Math.round(c.similarity * 100),
              })),
            },
            null,
            2,
          ),
      });

      const saleDrivers = valuation.adjustmentSummary.slice(0, 4).map((a) => `${a.label}: ${a.detail}`);
      if (!saleDrivers.length) {
        saleDrivers.push(`${SCOPE_HEADLINE[scope]} evidence for ${CATEGORY_LABEL[subject.assetCategory].toLowerCase()}s`);
      }
      const saleMoves = [
        `List at ${usd(valuation.recommendedListPrice)} to sit at the heart of the range.`,
        `If you need a faster sale, ${usd(valuation.quickSalePrice)} keeps you competitive without giving the unit away.`,
        `Strong photos, maintenance records and a clean title can support testing ${usd(valuation.premiumPositionPrice)}.`,
      ];
      if (scope === 'modeled') saleMoves.push('Treat this as directional — scan live listings near you before publishing a price.');

      const generatedAt = new Date().toISOString();
      return jsonResponse(200, {
        ok: true,
        mode: 'sale',
        // ── Unified pricing contract (consumed by the PricePilot report UI) ──
        salePrice: valuation.recommendedListPrice,
        saleLow: valuation.estimatedMarketLow,
        saleHigh: valuation.estimatedMarketHigh,
        marketBenchmark: valuation.medianComparablePrice || valuation.recommendedListPrice,
        benchmarkLabel: SCOPE_LABEL[scope],
        marketScope: scope,
        marketScopeLabel: SCOPE_HEADLINE[scope],
        confidence: mapConfidence(valuation.confidenceLabel, scope),
        reasoning:
          narrative?.summary ??
          `${SCOPE_HEADLINE[scope]} read for this ${CATEGORY_LABEL[subject.assetCategory].toLowerCase()}: an estimated market range of ${usd(valuation.estimatedMarketLow)} to ${usd(valuation.estimatedMarketHigh)}, with ${usd(valuation.recommendedListPrice)} as the recommended position.`,
        priceDrivers: saleDrivers,
        pricingMoves: saleMoves,
        sources: describeSources(pool, scope),
        lastUpdated: generatedAt,
        // ── Legacy shape (kept for backwards compatibility) ──
        subject: {
          assetCategory: subject.assetCategory,
          categoryLabel: CATEGORY_LABEL[subject.assetCategory],
          city: subject.city,
          state: subject.state,
          zip: subject.zip,
          year: subject.year,
          make: subject.make,
          model: subject.model,
          lengthFt: subject.lengthFt,
        },
        valuation: {
          estimatedMarketLow: valuation.estimatedMarketLow,
          estimatedMarketHigh: valuation.estimatedMarketHigh,
          recommendedListPrice: valuation.recommendedListPrice,
          quickSalePrice: valuation.quickSalePrice,
          premiumPositionPrice: valuation.premiumPositionPrice,
          confidenceScore: valuation.confidenceScore,
          confidenceLabel: valuation.confidenceLabel,
          comparableCount: valuation.comparableCount,
          strongComparableCount: valuation.strongComparableCount,
          medianComparablePrice: valuation.medianComparablePrice,
          adjustmentSummary: valuation.adjustmentSummary,
          methodology: valuation.methodology,
          warnings: valuation.warnings,
        },
        distribution: valuation.distribution,
        comparables: valuation.comparables.slice(0, 12).map((c) => ({
          id: c.id,
          title: c.title,
          city: c.city,
          state: c.state,
          year: c.year,
          lengthFt: c.lengthFt,
          displayedPrice: c.displayedPrice,
          previousDisplayedPrice: c.previousDisplayedPrice,
          observedStatus: c.observedStatus,
          evidenceType: c.evidenceType,
          similarity: Math.round(c.similarity * 100),
          qualityFlags: c.qualityFlags,
        })),
        narrative,
        narrativeModel: model,
        generatedAt,
      });
    }

    // ------------------------- RENTAL MODE -------------------------
    // Rental rates come from published Vendibook rental asking rates only.
    // The sale comp dataset is never used here.
    const rentalComps: CompRecord[] = [];
    if (subject.assetCategory === 'food_truck' || subject.assetCategory === 'food_trailer') {
      const { data: rentals, error: rentErr } = await service
        .from('listings')
        .select('id, title, city, state, year_built, length_inches, price_daily, price_weekly, price_monthly')
        .eq('status', 'published')
        .eq('mode', 'rent')
        .eq('category', subject.assetCategory)
        .gt('price_daily', 0)
        .limit(60);
      if (rentErr) console.warn('rental comp query failed:', rentErr.message);
      for (const row of rentals ?? []) {
        if (subjectListingId && row.id === subjectListingId) continue;
        rentalComps.push({
          id: `vb-${row.id}`,
          title: row.title ?? 'Vendibook rental listing',
          city: row.city,
          state: row.state,
          year: row.year_built,
          make: null,
          model: null,
          lengthFt: row.length_inches ? Math.round((Number(row.length_inches) / 12) * 10) / 10 : null,
          displayedPrice: Number(row.price_daily),
          previousDisplayedPrice: null,
          observedStatus: 'active',
          evidenceType: 'vendibook_asking',
          evidenceConfidence: 0.5,
          features: {
            __weeklyRate: row.price_weekly ? Number(row.price_weekly) : 0,
            __monthlyRate: row.price_monthly ? Number(row.price_monthly) : 0,
          },
          qualityFlags: [],
        });
      }
    }

    const { scope, pool } = stageScope(subject, rentalComps);
    const rental = runRentalValuation(subject, pool);
    if (scope === 'regional') {
      rental.warnings.push('Local rental evidence was sparse, so this report broadened to your surrounding region.');
    } else if (scope === 'national') {
      rental.warnings.push('Local and regional rental evidence was sparse. Rates reflect the broader U.S. market.');
    } else if (scope === 'modeled') {
      rental.warnings.push('This is a modeled directional estimate from your equipment profile and broad industry bands, not a read of live local rates.');
    }

    const { narrative, model } = await generatePricePilotNarrative({
      photos,
      systemPrompt:
        'You are a senior mobile food equipment appraiser writing the professional interpretation section of a rental rate report. ' +
        'The rates in the brief were computed by a deterministic statistical engine and are FINAL. ' +
        'Never propose different numbers. Rates are benchmarked from current asking rates, not sale prices. ' +
        'If photos are attached, describe only conservative visible cosmetic observations. ' +
        'Do not use em dashes. Return strict JSON: {"headline": string, "summary": string (2-4 sentences), "drivers_positive": string[] (max 4), "drivers_negative": string[] (max 4), "caveats": string[] (max 3), "photo_observations": string[] (max 3, empty if no photos)}.',
      userPrompt:
        `RENTAL RATE BRIEF (numbers are final, interpret only):\n` +
        JSON.stringify(
          {
            subject: {
              type: CATEGORY_LABEL[subject.assetCategory],
              location: [subject.city, subject.state].filter(Boolean).join(', ') || 'Not specified',
              year: subject.year,
              condition: subject.condition,
              operationalStatus: subject.operationalStatus,
            },
            result: {
              dailyRate: rental.dailyRate,
              dailyLow: rental.dailyLow,
              dailyHigh: rental.dailyHigh,
              weeklyRate: rental.weeklyRate,
              weeklyLow: rental.weeklyLow,
              weeklyHigh: rental.weeklyHigh,
              monthlyRate: rental.monthlyRate,
              confidenceScore: rental.confidenceScore,
              confidenceLabel: rental.confidenceLabel,
              comparableCount: rental.comparableCount,
              marketScope: SCOPE_HEADLINE[scope],
            },
            warnings: rental.warnings,
            topComparables: rental.comparables.slice(0, 8).map((c) => ({
              title: c.title,
              location: [c.city, c.state].filter(Boolean).join(', '),
              dailyAskingRate: c.displayedPrice,
              similarity: Math.round(c.similarity * 100),
            })),
          },
          null,
          2,
        ),
    });

    const rentalMoves = [
      `Anchor your daily rate at ${usd(rental.dailyRate)} — the heart of the observed range.`,
      `Offer a weekly bundle near ${usd(rental.weeklyRate)} to win longer bookings.`,
      'A refundable deposit and clear delivery terms let you hold the top of the range.',
    ];
    if (scope === 'modeled') rentalMoves.push('Treat this as directional — check live rental listings near you before publishing rates.');
    const rentalDrivers = [
      `${CATEGORY_LABEL[subject.assetCategory]} daily asking rates in the ${SCOPE_HEADLINE[scope].toLowerCase()}`,
      subject.condition ? `Condition: ${subject.condition}` : null,
      subject.operationalStatus ? `Operational status: ${subject.operationalStatus.replace(/_/g, ' ')}` : null,
    ].filter((d): d is string => !!d);

    const generatedAt = new Date().toISOString();
    return jsonResponse(200, {
      ok: true,
      mode: 'rental',
      // ── Unified pricing contract (consumed by the PricePilot report UI) ──
      dailyRate: rental.dailyRate,
      dailyLow: rental.dailyLow,
      dailyHigh: rental.dailyHigh,
      weeklyRate: rental.weeklyRate,
      weeklyLow: rental.weeklyLow,
      weeklyHigh: rental.weeklyHigh,
      marketBenchmark: rental.dailyRate,
      benchmarkLabel: SCOPE_LABEL[scope],
      marketScope: scope,
      marketScopeLabel: SCOPE_HEADLINE[scope],
      confidence: mapConfidence(rental.confidenceLabel, scope),
      reasoning:
        narrative?.summary ??
        `${SCOPE_HEADLINE[scope]} read for this ${CATEGORY_LABEL[subject.assetCategory].toLowerCase()}: a recommended daily rate of ${usd(rental.dailyRate)}, with a typical range of ${usd(rental.dailyLow)} to ${usd(rental.dailyHigh)}.`,
      priceDrivers: rentalDrivers,
      pricingMoves: rentalMoves,
      sources: describeSources(pool, scope),
      lastUpdated: generatedAt,
      // ── Legacy shape (kept for backwards compatibility) ──
      subject: {
        assetCategory: subject.assetCategory,
        categoryLabel: CATEGORY_LABEL[subject.assetCategory],
        city: subject.city,
        state: subject.state,
        zip: subject.zip,
        year: subject.year,
        make: subject.make,
        model: subject.model,
        lengthFt: subject.lengthFt,
      },
      valuation: {
        dailyRate: rental.dailyRate,
        dailyLow: rental.dailyLow,
        dailyHigh: rental.dailyHigh,
        weeklyRate: rental.weeklyRate,
        weeklyLow: rental.weeklyLow,
        weeklyHigh: rental.weeklyHigh,
        monthlyRate: rental.monthlyRate,
        confidenceScore: rental.confidenceScore,
        confidenceLabel: rental.confidenceLabel,
        comparableCount: rental.comparableCount,
        adjustmentSummary: [],
        methodology: rental.methodology,
        warnings: rental.warnings,
      },
      distribution: null,
      comparables: rental.comparables.slice(0, 12).map((c) => ({
        id: c.id,
        title: c.title,
        city: c.city,
        state: c.state,
        year: c.year,
        lengthFt: c.lengthFt,
        displayedPrice: c.displayedPrice,
        previousDisplayedPrice: null,
        observedStatus: 'active',
        evidenceType: 'vendibook_asking',
        similarity: Math.round(c.similarity * 100),
        qualityFlags: [],
      })),
      narrative,
      narrativeModel: model,
      generatedAt,
    });
  } catch (err) {
    console.error('pricepilot-appraisal error:', err);
    return unknownErrorResponse(err);
  }
});
