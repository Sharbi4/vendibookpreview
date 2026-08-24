/**
 * PricePilot model configuration — the ONLY place PricePilot model ids live.
 *
 * Primary: openai/gpt-5.6-sol (verified available on the Lovable AI Gateway).
 * Fallback: google/gemini-3.1-pro-preview (current supported Gemini 3.1 Pro
 * reasoning model on the gateway). If the primary is unavailable the caller
 * automatically retries with the fallback; the valuation itself is
 * deterministic and does not depend on either model succeeding.
 */

export const PRICEPILOT_MODEL_PRIMARY = 'openai/gpt-5.6-sol';
export const PRICEPILOT_MODEL_FALLBACK = 'google/gemini-3.1-pro-preview';

const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export interface PricePilotNarrative {
  headline?: string;
  summary?: string;
  drivers_positive?: string[];
  drivers_negative?: string[];
  caveats?: string[];
  photo_observations?: string[];
}

interface NarrativeRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Optional data-URL images for conservative visual observations. */
  photos?: string[];
}

async function callGateway(
  model: string,
  req: NarrativeRequest,
  apiKey: string,
  withImages: boolean,
): Promise<PricePilotNarrative | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const userContent =
      withImages && req.photos?.length
        ? [
            { type: 'text', text: req.userPrompt },
            ...req.photos.slice(0, 3).map((url) => ({
              type: 'image_url',
              image_url: { url },
            })),
          ]
        : req.userPrompt;

    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1400,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`PricePilot model ${model} HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) return null;
    return JSON.parse(content) as PricePilotNarrative;
  } catch (err) {
    console.warn(`PricePilot model ${model} failed:`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs the appraisal narrative through the primary model, then the fallback.
 * Image input is attempted once with the primary; on failure the retry is
 * text-only so a vision incompatibility never blocks the narrative.
 * Never throws — a null narrative means the client renders statistics only.
 */
export async function generatePricePilotNarrative(
  req: NarrativeRequest,
): Promise<{ narrative: PricePilotNarrative | null; model: string | null }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return { narrative: null, model: null };

  if (req.photos?.length) {
    const withImages = await callGateway(PRICEPILOT_MODEL_PRIMARY, req, apiKey, true);
    if (withImages) return { narrative: withImages, model: PRICEPILOT_MODEL_PRIMARY };
  }

  const primary = await callGateway(PRICEPILOT_MODEL_PRIMARY, req, apiKey, false);
  if (primary) return { narrative: primary, model: PRICEPILOT_MODEL_PRIMARY };

  const fallback = await callGateway(PRICEPILOT_MODEL_FALLBACK, req, apiKey, false);
  if (fallback) return { narrative: fallback, model: PRICEPILOT_MODEL_FALLBACK };

  return { narrative: null, model: null };
}
