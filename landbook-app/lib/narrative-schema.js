/**
 * Single source of truth for AI narrative slots.
 *
 * Every narrative slot rendered anywhere in the report must be defined here.
 * Derived in three places:
 *   - prompt schema sent to Claude (src/lib/report-narratives.js)
 *   - EMPTY_NARRATIVES fallback (src/lib/report-narratives.js)
 *   - Narratives TypeScript type (landbook-app/lib/types.ts)
 *
 * To add a new slot: add an entry below with { maxWords, prompt }.
 * To add a new section: add a top-level key with its slots object.
 *
 * Plain JS with JSDoc so both the Next.js app and the root serverless
 * functions can import it without a build step.
 */

/**
 * @typedef {Object} SlotDef
 * @property {number} maxWords - Soft cap communicated to Claude
 * @property {string} prompt - Per-slot instruction appended to the section schema
 */

// Declared without an explicit @type so TypeScript infers the literal
// section and slot keys, which feeds the Narratives type in types.ts.
export const NARRATIVE_SCHEMA = {
  overview: {
    intro: {
      maxWords: 150,
      prompt: "2-3 paragraphs. Position the property within its bioregion. Highlight 2-3 key strengths from the data. Frame the investment profile using actual valuation numbers.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 aspirational sentence about this specific property and its potential.",
    },
  },

  regionEcosystem: {
    intro: {
      maxWords: 100,
      prompt: "2 paragraphs. Frame why bioregional context matters — comparing a property to its neighbours reveals hidden strengths and risks that raw numbers alone miss.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the property's position relative to its neighbours.",
    },
    slopeDesc: {
      maxWords: 30,
      prompt: "1-2 sentences. What the slope grade means for access, erosion risk, and land use. Use the terrain.slope value.",
    },
    slopeTip: {
      maxWords: 20,
      prompt: "1 sentence. A practical tip about the slope — terracing, drainage, machinery access.",
    },
    waterDesc: {
      maxWords: 30,
      prompt: "1-2 sentences. Interpret the water security index — reliability of supply, drought resilience, irrigation potential.",
    },
    waterTip: {
      maxWords: 20,
      prompt: "1 sentence. A practical insight about water on this property.",
    },
    solarDesc: {
      maxWords: 30,
      prompt: "1-2 sentences. Interpret the solar score — what the exposure level means for energy generation or agriculture.",
    },
    solarTip: {
      maxWords: 20,
      prompt: "1 sentence. A practical insight or trade-off about solar exposure.",
    },
    treeCoverDesc: {
      maxWords: 30,
      prompt: "1-2 sentences. General statement about why tree cover matters for carbon, shade, and biodiversity — note that satellite canopy data is not yet available.",
    },
  },

  mapsLayers: {
    intro: {
      maxWords: 120,
      prompt: "2 paragraphs. Describe what the technical map layers reveal about this property's spatial character — terrain patterns, connectivity corridors, fire/flood exposure zones, and biodiversity hotspots visible across the nine map layers.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence highlighting the most significant spatial pattern or connectivity feature.",
    },
  },

  landWater: {
    intro: {
      maxWords: 150,
      prompt: "2 paragraphs. Physical character of the land — terrain, geology, soil quality. Then water security — features inventory, drought resilience, what the security index means.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the defining physical characteristic (the water network, the soil depth, etc).",
    },
  },

  biodiversity: {
    intro: {
      maxWords: 120,
      prompt: "2 paragraphs. Species richness in context. Notable findings from the data. Conservation significance and observation trends.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the most notable biodiversity finding.",
    },
  },

  climateSeasons: {
    intro: {
      maxWords: 120,
      prompt: "2 paragraphs. Characterize the climate zone. Growing season implications. Energy potential from solar/wind resources.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the climate advantage or challenge.",
    },
  },

  valueBenefits: {
    intro: {
      maxWords: 120,
      prompt: "2 paragraphs. Explain the SEEA-EA valuation framework briefly. Frame the economic significance using actual service values.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence capturing the economic significance.",
    },
    assetCallout: {
      maxWords: 20,
      prompt: "1 sentence about the 30-year NPV and what it represents as a long-term asset stock value.",
    },
  },

  landUse: {
    intro: {
      maxWords: 120,
      prompt: "2 paragraphs. Current land cover and what it supports. Production potential and suitable systems.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the most promising land use opportunity.",
    },
  },

  historyTrends: {
    intro: {
      maxWords: 120,
      prompt: "2 paragraphs. What temperature and precipitation trends mean for this property. Projection caveats. How trends affect long-term value.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the trajectory — improving, stable, or concerning.",
    },
  },

  risksResilience: {
    intro: {
      maxWords: 150,
      prompt: "2 paragraphs. How fire/flood/drought risks interact at this property. Energy independence potential. What the scores mean in practice.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the overall risk profile.",
    },
    recommendation: {
      maxWords: 40,
      prompt: "1-2 sentences. Specific, actionable mitigation step grounded in this property's risk and energy data.",
    },
  },

  futureScenarios: {
    intro: {
      maxWords: 120,
      prompt: "2 paragraphs. Compare revenue scenarios (conservative/moderate/optimized). Investment-return logic. Carbon credit opportunity.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the return opportunity.",
    },
  },

  recommendations: {
    intro: {
      maxWords: 100,
      prompt: "2 paragraphs. Invitation to a stewardship relationship. Community context. Frame next steps as an opportunity, not a burden.",
    },
  },

  sourcesMethodology: {
    intro: {
      maxWords: 120,
      prompt: "1-2 paragraphs. SEEA-EA framework basis. How scores are computed. Data sources used. Conservative approach.",
    },
    disclaimer: {
      maxWords: 50,
      prompt: "1 short paragraph. For informational purposes only, consult qualified professionals for investment or management decisions.",
    },
  },
};

/**
 * Build the JSON schema block to append to the Claude prompt.
 * @returns {string} pretty-printed JSON describing the expected response shape
 */
export function buildPromptSchema() {
  const schema = {};
  for (const [sectionKey, slots] of Object.entries(NARRATIVE_SCHEMA)) {
    schema[sectionKey] = {};
    for (const [slotKey, { maxWords, prompt }] of Object.entries(slots)) {
      schema[sectionKey][slotKey] = `MAX ${maxWords} WORDS. ${prompt}`;
    }
  }
  return JSON.stringify(schema, null, 2);
}

/**
 * Build an empty narratives object with all slots present as empty strings.
 * Used as the fallback when narrative generation fails.
 * @returns {Record<string, Record<string, string>>}
 */
export function buildEmptyNarratives() {
  const empty = {};
  for (const [sectionKey, slots] of Object.entries(NARRATIVE_SCHEMA)) {
    empty[sectionKey] = {};
    for (const slotKey of Object.keys(slots)) {
      empty[sectionKey][slotKey] = "";
    }
  }
  return empty;
}
