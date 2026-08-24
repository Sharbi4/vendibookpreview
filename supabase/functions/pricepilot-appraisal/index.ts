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

  return {
    mode,
    assetCategory: assetCategory as SubjectProfile['assetCategory'],
    city: str(body?.city, 80),
    state: str(body?.state, 2)?.toUpperCase() ?? null,
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

      const valuation = runSaleValuation(subject, comps);

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

      return jsonResponse(200, {
        ok: true,
        mode: 'sale',
        subject: {
          assetCategory: subject.assetCategory,
          categoryLabel: CATEGORY_LABEL[subject.assetCategory],
          city: subject.city,
          state: subject.state,
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
        generatedAt: new Date().toISOString(),
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

    const rental = runRentalValuation(subject, rentalComps);

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
              weeklyRate: rental.weeklyRate,
              monthlyRate: rental.monthlyRate,
              confidenceScore: rental.confidenceScore,
              confidenceLabel: rental.confidenceLabel,
              comparableCount: rental.comparableCount,
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

    return jsonResponse(200, {
      ok: true,
      mode: 'rental',
      subject: {
        assetCategory: subject.assetCategory,
        categoryLabel: CATEGORY_LABEL[subject.assetCategory],
        city: subject.city,
        state: subject.state,
        year: subject.year,
        make: subject.make,
        model: subject.model,
        lengthFt: subject.lengthFt,
      },
      valuation: {
        dailyRate: rental.dailyRate,
        weeklyRate: rental.weeklyRate,
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
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('pricepilot-appraisal error:', err);
    return unknownErrorResponse(err);
  }
});
