/**
 * LandBook Report — AI Narrative Generation
 * Single batched Claude API call to generate all narrative slots
 * for the 12-section V2 report layout.
 */

import Anthropic from '@anthropic-ai/sdk';

let _anthropic;
function getClient() {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

/**
 * Generate narrative text matching the 12-section report layout.
 *
 * @param {object} reportData - The canonical ReportData shape
 * @returns {object} NarrativesV2 shape
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
- pullQuote: a single sentence, no quotation marks.
- recommendation: 1-2 actionable sentences specific to this property.
- STRICT WORD LIMITS: each slot has a max word count. Stay within it.

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

Each section has an "intro" (editorial prose, 2-3 paragraphs setting context) and a "callout" (a single punchy sentence displayed as a styled blockquote — NOT a repeat of the intro, something that stands alone and adds emphasis).

{
  "overview": {
    "intro": "2-3 paragraphs, MAX 150 WORDS. Position the property within its bioregion. Highlight 2-3 key strengths from the data. Frame the investment profile using actual valuation numbers.",
    "callout": "1 aspirational sentence about this specific property and its potential."
  },
  "regionEcosystem": {
    "intro": "2 paragraphs, MAX 100 WORDS. Frame why bioregional context matters — comparing a property to its neighbours reveals hidden strengths and risks that raw numbers alone miss.",
    "callout": "1 sentence about the property's position relative to its neighbours.",
    "slopeDesc": "1-2 sentences, MAX 30 WORDS. What the slope grade means for access, erosion risk, and land use. Use the terrain.slope value.",
    "slopeTip": "1 sentence, MAX 20 WORDS. A practical tip about the slope — terracing, drainage, machinery access. Omit key if not insightful.",
    "waterDesc": "1-2 sentences, MAX 30 WORDS. Interpret the water security index — reliability of supply, drought resilience, irrigation potential.",
    "waterTip": "1 sentence, MAX 20 WORDS. A practical insight about water on this property. Omit key if not insightful.",
    "solarDesc": "1-2 sentences, MAX 30 WORDS. Interpret the solar score — what the exposure level means for energy generation or agriculture.",
    "solarTip": "1 sentence, MAX 20 WORDS. A practical insight or trade-off about solar exposure. Omit key if not insightful.",
    "treeCoverDesc": "1-2 sentences, MAX 30 WORDS. General statement about why tree cover matters for carbon, shade, and biodiversity — note that satellite canopy data is not yet available."
  },
  "landWater": {
    "intro": "2 paragraphs, MAX 150 WORDS. Physical character of the land — terrain, geology, soil quality. Then water security — features inventory, drought resilience, what the security index means.",
    "callout": "1 sentence about the defining physical characteristic (the water network, the soil depth, etc)."
  },
  "biodiversity": {
    "intro": "2 paragraphs, MAX 120 WORDS. Species richness in context. Notable findings from the data. Conservation significance and observation trends.",
    "callout": "1 sentence about the most notable biodiversity finding."
  },
  "climateSeasons": {
    "intro": "2 paragraphs, MAX 120 WORDS. Characterize the climate zone. Growing season implications. Energy potential from solar/wind resources.",
    "callout": "1 sentence about the climate advantage or challenge."
  },
  "valueBenefits": {
    "intro": "2 paragraphs, MAX 120 WORDS. Explain the SEEA-EA valuation framework briefly. Frame the economic significance using actual service values.",
    "callout": "1 sentence capturing the economic significance."
  },
  "landUse": {
    "intro": "2 paragraphs, MAX 120 WORDS. Current land cover and what it supports. Production potential and suitable systems.",
    "callout": "1 sentence about the most promising land use opportunity."
  },
  "historyTrends": {
    "intro": "2 paragraphs, MAX 120 WORDS. What temperature and precipitation trends mean for this property. Projection caveats. How trends affect long-term value.",
    "callout": "1 sentence about the trajectory — improving, stable, or concerning."
  },
  "risksResilience": {
    "intro": "2 paragraphs, MAX 150 WORDS. How fire/flood/drought risks interact at this property. Energy independence potential. What the scores mean in practice.",
    "callout": "1 sentence about the overall risk profile.",
    "recommendation": "1-2 sentences. Specific, actionable mitigation step grounded in this property's risk and energy data."
  },
  "futureScenarios": {
    "intro": "2 paragraphs, MAX 120 WORDS. Compare revenue scenarios (conservative/moderate/optimized). Investment-return logic. Carbon credit opportunity.",
    "callout": "1 sentence about the return opportunity."
  },
  "mapsLayers": {
    "intro": "2 paragraphs, MAX 120 WORDS. Describe what the technical map layers reveal about this property's spatial character — terrain patterns, connectivity corridors, fire/flood exposure zones, and biodiversity hotspots visible across the nine map layers.",
    "callout": "1 sentence highlighting the most significant spatial pattern or connectivity feature."
  },
  "recommendations": {
    "intro": "2 paragraphs, MAX 100 WORDS. Invitation to a stewardship relationship. Community context. Frame next steps as an opportunity, not a burden."
  },
  "sourcesMethodology": {
    "intro": "1-2 paragraphs, MAX 120 WORDS. SEEA-EA framework basis. How scores are computed. Data sources used. Conservative approach.",
    "disclaimer": "1 short paragraph, MAX 50 WORDS. For informational purposes only, consult qualified professionals for investment or management decisions."
  }
}`;

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }, { timeout: 90_000 });

    const text = response.content[0]?.text || '{}';
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const narratives = JSON.parse(cleaned);

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
      };
    }

    return {
      narratives,
      usage: response.usage || null,
      error: null,
    };
  } catch (error) {
    console.error('[narratives-v2] Claude API call failed:', error.message);
    return {
      narratives: EMPTY_NARRATIVES_V2,
      usage: null,
      error: `Narrative generation failed: ${error.message}`,
    };
  }
}

const EMPTY_NARRATIVES_V2 = {
  overview: { intro: '', callout: '' },
  regionEcosystem: { intro: '', callout: '', slopeDesc: '', slopeTip: '', waterDesc: '', waterTip: '', solarDesc: '', solarTip: '', treeCoverDesc: '' },
  landWater: { intro: '', callout: '' },
  biodiversity: { intro: '', callout: '' },
  climateSeasons: { intro: '', callout: '' },
  valueBenefits: { intro: '', callout: '' },
  landUse: { intro: '', callout: '' },
  historyTrends: { intro: '', callout: '' },
  risksResilience: { intro: '', callout: '', recommendation: '' },
  futureScenarios: { intro: '', callout: '' },
  mapsLayers: { intro: '', callout: '' },
  recommendations: { intro: '' },
  sourcesMethodology: { intro: '', disclaimer: '' },
};
