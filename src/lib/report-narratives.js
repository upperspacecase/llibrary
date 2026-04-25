/**
 * LandBook Report — AI Narrative Generation
 * Single batched Claude API call to generate all narrative slots.
 *
 * Slot shape is defined in landbook-app/lib/narrative-schema.js — the single
 * source of truth for the prompt schema, the empty fallback, and the TS types.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  buildPromptSchema,
  buildEmptyNarratives,
} from '../../landbook-app/lib/narrative-schema.js';

let _anthropic;
function getClient() {
  // maxRetries=4 lets the SDK retry transient failures (429, 5xx, timeouts)
  // on top of our 90s per-attempt timeout. Sonnet sometimes 529s under load.
  if (!_anthropic) _anthropic = new Anthropic({ maxRetries: 4 });
  return _anthropic;
}

function classifyNarrativeError(err) {
  const msg = err?.message || String(err);
  const status = err?.status;
  if (status === 429) return { code: 'RATE_LIMITED', message: msg };
  if (status === 529) return { code: 'OVERLOADED', message: msg };
  if (status === 401 || status === 403) return { code: 'KEY_MISSING', message: msg };
  if (err?.name === 'AbortError' || /timeout|aborted/i.test(msg)) return { code: 'TIMEOUT', message: msg };
  if (err instanceof SyntaxError || /JSON|unexpected token/i.test(msg)) return { code: 'PARSE_FAILED', message: msg };
  if (status >= 500) return { code: 'API_ERROR', message: msg };
  return { code: 'API_ERROR', message: msg };
}

const EMPTY_NARRATIVES_V2 = buildEmptyNarratives();
const PROMPT_SCHEMA = buildPromptSchema();

/**
 * Generate narrative text for the report.
 *
 * @param {object} reportData - The canonical ReportData shape
 * @returns {{
 *   narratives: object,
 *   usage: object | null,
 *   error: string | null,
 *   status: 'ok' | 'failed' | 'empty',
 *   errorCode: string | null,
 * }}
 */
export async function generateNarrativesV2(reportData) {
  const p = reportData.property || {};
  const scores = reportData.scores || {};
  const climate = reportData.climate || {};
  const soil = reportData.soil || {};
  const geology = reportData.geology || {};
  const water = reportData.water || {};
  const species = reportData.species || {};
  const fire = reportData.fire || {};
  const flood = reportData.flood || {};
  const drought = reportData.drought || {};
  const energy = reportData.energy || {};
  const eco = reportData.economics || {};
  const agriculture = reportData.agriculture || {};
  const regional = reportData.regional || {};
  const trends = reportData.trends || {};
  const meta = reportData.meta || {};

  const missingFields = (meta.missingFields || []).map(f => f.field || f).join(', ');

  const prompt = `You are writing the narrative text for a LandBook Natural Capital Assessment report for "${p.name || 'this property'}" in ${p.address || 'Portugal'}.

Write in the style of a Financial Times property assessment — authoritative, specific, grounded in data. Use exact numbers provided. Do not invent data you were not given.

${missingFields ? `UNAVAILABLE DATA: ${missingFields}. Write around gaps naturally — do not reference missing values.\n` : ''}
FORMATTING RULES:
- First word of each narrative should be a strong, concrete word (not "The" / "This" / "Located") for drop-cap styling.
- callout: a single sentence, no quotation marks.
- recommendation: 1-2 actionable sentences specific to this property.
- STRICT WORD LIMITS: each slot has a MAX word count. Stay within it.

─── PROPERTY DATA ───
Name: ${p.name || '?'} | Location: ${p.address || '?'}
Area: ${p.area ? p.area.toFixed(1) + ' ha' : '?'} | Coords: ${p.coords?.lat?.toFixed(4) || '?'}, ${p.coords?.lng?.toFixed(4) || '?'}
Municipality: ${p.municipality || '?'} | Parish: ${p.parish || '?'}

─── SCORES ───
Natural Capital: ${scores.naturalCapital ?? '?'}/100
Carbon: ${scores.carbon ?? '?'}, Biodiversity: ${scores.biodiversity ?? '?'}, Water: ${scores.water ?? '?'}, Soil: ${scores.soil ?? '?'}, Pollination: ${scores.pollination ?? '?'}

─── ECONOMICS ───
Value: ${eco.valuePerHa ? '\u20ac' + Math.round(eco.valuePerHa) + '/ha' : '?'} | Total: \u20ac${eco.ecosystemServices?.total ?? '?'}/yr
30yr NPV: \u20ac${eco.npv?.thirtyYear ?? '?'} | Carbon stock: ${eco.carbonStock ?? '?'} tCO\u2082e | Credits: \u20ac${eco.carbonCreditValue ?? '?'}/yr

─── TERRAIN & SOIL ───
Elevation: ${reportData.terrain?.elevation ?? '?'}m | Slope: ${reportData.terrain?.slope ?? '?'}% | Aspect: ${reportData.terrain?.aspect || '?'}
Soil pH: ${soil.ph ?? '?'}, OC: ${soil.organicCarbon ?? '?'} g/kg, Clay: ${soil.clay ?? '?'}%, Class: ${soil.classification || '?'}
Geology: ${geology.lithology || '?'} (${geology.period || '?'}, ${geology.age ?? '?'} Ma)

─── WATER ───
Springs: ${water.springs ?? '?'}, Wells: ${water.wells ?? '?'}, Waterways: ${water.waterways ?? '?'}, Bodies: ${water.waterBodies ?? '?'}
Security: ${water.securityIndex ?? '?'}/10 | Flood: ${water.floodRisk || '?'}

─── CLIMATE ───
Mean: ${climate.annualMeanTemp ?? '?'}\u00b0C | Rain: ${climate.annualRainfall ?? '?'}mm | Season: ${climate.growingSeason ?? '?'} months | Zone: ${climate.zone || '?'}

─── BIODIVERSITY ───
Species: ${species.total ?? '?'}, Threatened: ${species.threatened ?? '?'}, Trend: ${species.trends?.direction || '?'}

─── RISKS ───
Fire: ${fire.riskScore ?? '?'}/5, Flood: ${flood.riskScore ?? '?'}/5, Drought: ${drought.riskScore ?? '?'}/5

─── ENERGY ───
Solar: ${energy.solar?.level || '?'} (${energy.solar?.detail || '?'}), Wind: ${energy.wind?.level || '?'} (${energy.wind?.detail || '?'})
Independence: ${energy.independenceScore ?? '?'}/100

─── AGRICULTURE ───
Land cover: ${agriculture.landCover || '?'}
Systems: ${(agriculture.systems || []).map(s => s.name).join(', ') || '?'}

─── TRENDS ───
Temp: ${trends.tempPerDecade != null ? (trends.tempPerDecade > 0 ? '+' : '') + trends.tempPerDecade.toFixed(2) + '\u00b0C/decade' : '?'}
Precip: ${trends.precipPerDecade != null ? (trends.precipPerDecade > 0 ? '+' : '') + trends.precipPerDecade.toFixed(1) + 'mm/decade' : '?'}

─── REGIONAL ───
Protected areas: ${(regional.protectedAreas || []).map(a => a.name).join(', ') || 'None detected'}

──────────────────────────────────────

Generate a JSON object with EXACTLY these keys. Return ONLY valid JSON — no markdown fences, no explanation.

${PROMPT_SCHEMA}`;

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }, { timeout: 90_000 });

    const text = response.content[0]?.text || '{}';
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    let narratives;
    try {
      narratives = JSON.parse(cleaned);
    } catch (parseErr) {
      const { code, message } = classifyNarrativeError(parseErr);
      console.error('[narratives-v2] response was not valid JSON:', message);
      return {
        narratives: EMPTY_NARRATIVES_V2,
        usage: response.usage || null,
        error: `Narrative parse failed: ${message}`,
        status: 'failed',
        errorCode: code,
      };
    }

    // Validate that at least one slot has content
    const hasContent = Object.values(narratives).some(section =>
      section && typeof section === 'object' &&
      Object.values(section).some(v => typeof v === 'string' && v.trim().length > 0)
    );
    if (!hasContent) {
      console.error('[narratives-v2] Claude returned valid JSON but all slots are empty');
      return {
        narratives: EMPTY_NARRATIVES_V2,
        usage: response.usage || null,
        error: 'Claude returned empty narratives — model may have refused or returned unexpected format',
        status: 'empty',
        errorCode: 'EMPTY_RESPONSE',
      };
    }

    return {
      narratives,
      usage: response.usage || null,
      error: null,
      status: 'ok',
      errorCode: null,
    };
  } catch (error) {
    const { code, message } = classifyNarrativeError(error);
    console.error(`[narratives-v2] Claude API call failed [${code}]:`, message);
    return {
      narratives: EMPTY_NARRATIVES_V2,
      usage: null,
      error: `Narrative generation failed: ${message}`,
      status: 'failed',
      errorCode: code,
    };
  }
}
