/**
 * LandBook Report — AI Narrative Generation
 * Single batched Claude API call to generate all 16 narrative slots.
 * Narratives are cached in reportData.narratives to avoid re-generation.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * Generate all narrative text for a LandBook report.
 * @param {object} reportData - The canonical data shape (without narratives populated)
 * @returns {object} narratives object matching reportData.narratives shape
 */
export async function generateNarratives(reportData) {
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
  const actions = reportData.actions || {};
  const meta = reportData.meta || {};

  const missingFields = (meta.missingFields || []).map(f => f.field).join(', ');

  const prompt = `You are writing the narrative text for a LandBook Natural Capital Assessment report for a property called "${p.name || 'this property'}" in ${p.address || 'Portugal'}.

The report is a magazine-quality editorial document. Write in the style of a Financial Times property assessment — authoritative, specific, grounded in data. Use the exact numbers provided. Do not invent data you were not given.

${missingFields ? `IMPORTANT: The following data fields were unavailable: ${missingFields}. Do not reference these missing values — write around the gaps naturally.\n` : ''}
FORMATTING RULES:
- "drop-cap" sections: the first word of the first paragraph should be a strong, concrete word (not "The" or "This") so the large decorative initial letter works.
- pullQuote: a single sentence, no quotation marks — they are added by the template.
- recommendation: a single actionable paragraph, 1-2 sentences, specific to this property's data.
- Word counts are approximate — better to be concise than padded.

Below is ALL the data for this property, grouped by the report section that uses it.

─── PROPERTY ───
Name: ${p.name || 'Unknown'} | Location: ${p.address || 'Unknown'}
Area: ${p.area ? p.area.toFixed(1) + ' ha' : '?'} | Coords: ${p.coords?.lat?.toFixed(4) || '?'}, ${p.coords?.lng?.toFixed(4) || '?'}
Municipality: ${p.municipality || '?'}

─── SCORES (used by Executive Summary + Scorecard) ───
Natural Capital Score: ${scores.naturalCapital ?? '?'}/100
Carbon: ${scores.carbon ?? '?'}/100, Biodiversity: ${scores.biodiversity ?? '?'}/100, Water: ${scores.water ?? '?'}/100, Soil: ${scores.soil ?? '?'}/100, Pollination: ${scores.pollination ?? '?'}/100

─── ECONOMICS (used by Ecosystem Services + Opportunities) ───
Value: ${eco.valuePerHa ? '\u20ac' + Math.round(eco.valuePerHa) + '/ha' : '?'}
Ecosystem services total: \u20ac${eco.ecosystemServices?.total ?? '?'}/yr
30-year NPV: \u20ac${eco.npv?.thirtyYear ?? '?'}
Carbon stock: ${eco.carbonStock ?? '?'} tCO\u2082e | Credit value: \u20ac${eco.carbonCreditValue ?? '?'}

─── TERRAIN (used by Terrain section) ───
Soil: pH ${soil.ph ?? '?'}, organic carbon ${soil.organicCarbon ?? '?'} g/kg, clay ${soil.clay ?? '?'}%, classification: ${soil.classification || '?'}
Geology: ${geology.lithology || '?'} (${geology.period || '?'}, ${geology.age ?? '?'} Ma)

─── WATER (used by Water section) ───
Springs: ${water.springs ?? '?'}, Wells: ${water.wells ?? '?'}, Waterways: ${water.waterways ?? '?'}
Security index: ${water.securityIndex ?? '?'}/10 | Flood risk: ${(water.floodRisk || {}).level || '?'}

─── CLIMATE (used by Climate section) ───
Annual mean: ${climate.annualMeanTemp ?? '?'}\u00b0C, rainfall: ${climate.annualRainfall ?? '?'} mm
Growing season: ${climate.growingSeason ?? '?'} days, zone: ${climate.zone || '?'}

─── BIODIVERSITY (used by Biodiversity section) ───
Species: ${species.total ?? '?'} documented, ${species.threatened ?? '?'} threatened
Trend: ${species.trends?.direction || '?'}

─── RISK (used by Risk section) ───
Fire: ${fire.riskScore ?? '?'}/5, Flood: ${flood.riskScore ?? '?'}/5, Drought: ${drought.riskScore ?? '?'}/5

─── AGRICULTURE (used by Agriculture section) ───
Land cover: ${agriculture.landCover || '?'}

─── ENERGY (used by Resilience section) ───
Solar: ${energy.solar?.level || '?'}, Wind: ${energy.wind?.level || '?'}
Independence score: ${energy.independenceScore ?? '?'}/10

─── TRENDS (used by Temporal section) ───
Temperature: ${trends.tempPerDecade ? (trends.tempPerDecade > 0 ? '+' : '') + trends.tempPerDecade.toFixed(2) + '\u00b0C/decade' : '?'}
Precipitation: ${trends.precipPerDecade ? (trends.precipPerDecade > 0 ? '+' : '') + trends.precipPerDecade.toFixed(1) + 'mm/decade' : '?'}

──────────────────────────────────────

Generate a JSON object with these exact keys. Return ONLY valid JSON, no markdown fences, no explanation.

{
  "executiveSummary": {
    "intro": "2-3 paragraphs, drop-cap, ~150 words. Position the property within its bioregion, highlight key strengths, frame the investment profile.",
    "pullQuote": "1 aspirational sentence about this specific property."
  },
  "ecosystemServices": {
    "intro": "2 paragraphs, drop-cap, ~120 words. Explain what ecosystem services are, reference SEEA-EA framework, frame the valuation.",
    "pullQuote": "1 sentence capturing the economic significance of these services."
  },
  "scorecard": {
    "text": "2 paragraphs, ~100 words. Interpret the dimension scores, identify strongest/weakest, compare to regional baseline.",
    "pullQuote": "1 sentence about the overall natural capital position."
  },
  "terrain": {
    "description": "2 paragraphs, drop-cap, ~120 words. Physical character of the land, what the geology means, soil quality implications.",
    "pullQuote": "1 sentence about the terrain's defining characteristic."
  },
  "water": {
    "narrative": "2 paragraphs, drop-cap, ~100 words. Water security assessment, feature inventory, drought resilience.",
    "pullQuote": "1 sentence about water as the defining resource."
  },
  "climate": {
    "profile": "2 paragraphs, drop-cap, ~100 words. Characterize the climate, growing season implications, microclimate advantages."
  },
  "biodiversity": {
    "intro": "2 paragraphs, drop-cap, ~120 words. Species richness context, notable findings, conservation significance."
  },
  "agriculture": {
    "potential": "2 paragraphs, drop-cap, ~100 words. What the land can produce, suitability benchmarks."
  },
  "opportunities": {
    "comparison": "2 paragraphs, drop-cap, ~100 words. Explain 3 revenue scenarios (conservative/moderate/optimized), investment logic."
  },
  "risks": {
    "narrative": "2 paragraphs, drop-cap, ~100 words. How fire/flood/drought risks interact, what the scores mean in practice.",
    "recommendation": "1-2 sentences. Specific, actionable mitigation step grounded in this property's risk data."
  },
  "resilience": {
    "narrative": "2 paragraphs, drop-cap, ~100 words. Energy independence potential, practical feasibility given this property's resources.",
    "recommendation": "1-2 sentences. Specific, actionable step to improve resilience score."
  },
  "context": {
    "narrative": "2 paragraphs, drop-cap, ~100 words. Bioregional position, what the percentile comparisons reveal."
  },
  "temporal": {
    "dynamics": "2 paragraphs, drop-cap, ~100 words. What temperature/precipitation trends mean for this property, projection caveats."
  },
  "compliance": {
    "framework": "2 paragraphs, drop-cap, ~100 words. Regulatory obligations, SEEA-EA alignment, compliance status."
  },
  "nextSteps": {
    "framing": "2 paragraphs, drop-cap, ~100 words. Invitation to stewardship relationship, community context."
  },
  "methodology": {
    "text": "2-3 paragraphs, ~150 words. SEEA-EA framework, conservative estimation approach, scoring methodology.",
    "disclaimer": "1 paragraph. For informational purposes only, consult professionals for decisions."
  }
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      timeout: 90_000,
    });

    const text = response.content[0]?.text || '{}';
    // Parse JSON — handle possible markdown fences
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const narratives = JSON.parse(cleaned);
    return narratives;
  } catch (error) {
    console.error('[narratives] Claude API call failed:', error.message);
    // Return empty structure — report renders with missing narratives
    return {
      executiveSummary: { intro: '', pullQuote: '' },
      ecosystemServices: { intro: '', pullQuote: '' },
      scorecard: { text: '', pullQuote: '' },
      terrain: { description: '', pullQuote: '' },
      water: { narrative: '', pullQuote: '' },
      climate: { profile: '' },
      biodiversity: { intro: '' },
      agriculture: { potential: '' },
      opportunities: { comparison: '' },
      risks: { narrative: '', recommendation: '' },
      resilience: { narrative: '', recommendation: '' },
      context: { narrative: '' },
      temporal: { dynamics: '' },
      compliance: { framework: '' },
      nextSteps: { framing: '' },
      methodology: { text: '', disclaimer: '' },
    };
  }
}
