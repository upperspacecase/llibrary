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

${missingFields ? `\nIMPORTANT: The following data fields were unavailable: ${missingFields}. Do not reference these missing values — write around the gaps naturally.\n` : ''}

Property details:
- Name: ${p.name || 'Unknown'}
- Location: ${p.address || 'Unknown'}
- Area: ${p.area ? p.area.toFixed(1) + ' ha' : 'unknown'}
- Coordinates: ${p.coords?.lat?.toFixed(4) || '?'}, ${p.coords?.lng?.toFixed(4) || '?'}
- Municipality: ${p.municipality || 'unknown'}

Natural Capital Scores (0-100):
- Overall NCS: ${scores.naturalCapital ?? '?'}/10
- Carbon: ${scores.carbon ?? '?'}, Biodiversity: ${scores.biodiversity ?? '?'}, Water: ${scores.water ?? '?'}, Soil: ${scores.soil ?? '?'}, Pollination: ${scores.pollination ?? '?'}

Climate: Annual mean ${climate.annualMeanTemp ?? '?'}°C, rainfall ${climate.annualRainfall ?? '?'}mm, growing season ${climate.growingSeason ?? '?'} days, zone: ${climate.zone || '?'}

Soil: pH ${soil.ph ?? '?'}, organic carbon ${soil.organicCarbon ?? '?'} g/kg, clay ${soil.clay ?? '?'}%, classification: ${soil.classification || '?'}
Geology: ${geology.lithology || '?'} (${geology.period || '?'}, ${geology.age ?? '?'} Ma)

Water: ${water.springs ?? '?'} springs, ${water.wells ?? '?'} wells, ${water.waterways ?? '?'} waterways, security index ${water.securityIndex ?? '?'}/10

Species: ${species.total ?? '?'} documented, ${species.threatened ?? '?'} threatened
Biodiversity trend: ${species.trends?.direction || '?'}

Risk: Fire ${fire.riskScore ?? '?'}/5, Flood ${flood.riskScore ?? '?'}/5, Drought ${drought.riskScore ?? '?'}/5

Economics: Value ${eco.valuePerHa ? '€' + Math.round(eco.valuePerHa) + '/ha' : '?'}, ecosystem services €${eco.ecosystemServices?.total ?? '?'}/yr, 30yr NPV €${eco.npv?.thirtyYear ?? '?'}

Land cover: ${agriculture.landCover || '?'}
Energy: Solar ${energy.solar?.level || '?'}, Wind ${energy.wind?.level || '?'}

Trends: Temperature ${trends.tempPerDecade ? (trends.tempPerDecade > 0 ? '+' : '') + trends.tempPerDecade.toFixed(2) + '°C/decade' : '?'}, Precipitation ${trends.precipPerDecade ? (trends.precipPerDecade > 0 ? '+' : '') + trends.precipPerDecade.toFixed(1) + 'mm/decade' : '?'}

Generate a JSON object with these exact keys. Each value is a string of 2-3 paragraphs (~100-150 words) unless noted otherwise. First paragraph of sections marked "drop-cap" should work well with a large decorative first letter.

{
  "executiveSummary": { "intro": "(2-3 paragraphs, drop-cap, ~150 words: property positioning within bioregion, key strengths, investment profile)", "pullQuote": "(1 aspirational sentence about this specific property)" },
  "ecosystemServices": { "intro": "(2 paragraphs, drop-cap, ~120 words: explain ecosystem services, reference SEEA-EA, frame the valuation)" },
  "scorecard": { "text": "(2 paragraphs, ~100 words: interpret the radar chart, strongest/weakest dimensions, compare to baseline)" },
  "terrain": { "description": "(2 paragraphs, drop-cap, ~120 words: physical character of the land, geology meaning, soil quality)" },
  "water": { "narrative": "(2 paragraphs, drop-cap, ~100 words: water security assessment, feature inventory, drought resilience)", "pullQuote": "(1 sentence about water as defining resource)" },
  "climate": { "profile": "(2 paragraphs, drop-cap, ~100 words: characterize climate, growing season, microclimate)" },
  "biodiversity": { "intro": "(2 paragraphs, drop-cap, ~120 words: species richness, notable findings, trends)" },
  "agriculture": { "potential": "(2 paragraphs, drop-cap, ~100 words: what the land can produce, benchmarks)" },
  "opportunities": { "comparison": "(2 paragraphs, drop-cap, ~100 words: explain 3 scenarios, investment logic)" },
  "risks": { "narrative": "(2 paragraphs, drop-cap, ~100 words: risk interaction, mitigation priorities)" },
  "resilience": { "narrative": "(2 paragraphs, drop-cap, ~100 words: energy independence potential, practical feasibility)" },
  "context": { "narrative": "(2 paragraphs, drop-cap, ~100 words: bioregional position, protected area significance)" },
  "temporal": { "dynamics": "(2 paragraphs, drop-cap, ~100 words: what trends mean, projection caveats)" },
  "compliance": { "framework": "(2 paragraphs, drop-cap, ~100 words: regulatory obligations, SEEA-EA alignment)" },
  "nextSteps": { "framing": "(2 paragraphs, drop-cap, ~100 words: invitation to relationship, community context)" },
  "methodology": { "text": "(2-3 paragraphs, ~150 words: SEEA-EA framework, conservative estimation, scoring logic)", "disclaimer": "(1 paragraph: informational purposes, verify with professionals)" }
}

Return ONLY the JSON object, no markdown fences, no explanation.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
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
      ecosystemServices: { intro: '' },
      scorecard: { text: '' },
      terrain: { description: '' },
      water: { narrative: '', pullQuote: '' },
      climate: { profile: '' },
      biodiversity: { intro: '' },
      agriculture: { potential: '' },
      opportunities: { comparison: '' },
      risks: { narrative: '' },
      resilience: { narrative: '' },
      context: { narrative: '' },
      temporal: { dynamics: '' },
      compliance: { framework: '' },
      nextSteps: { framing: '' },
      methodology: { text: '', disclaimer: '' },
    };
  }
}
