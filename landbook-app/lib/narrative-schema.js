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
      maxWords: 55,
      prompt: "1 paragraph. Make a compelling case for the land's total value by weaving together its strongest data points across natural capital (€/yr), water security, biodiversity, energy potential, climate, soil, and 30-year NPV. Lead with the single most striking number. Avoid focusing on biodiversity alone — span the full picture.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 aspirational sentence about this specific property and its potential as a whole — economic upside, ecological strength, or long-term resilience.",
    },
  },

  regionEcosystem: {
    intro: {
      maxWords: 40,
      prompt: "1 paragraph. Frame why bioregional context matters — neighbours reveal hidden strengths and risks raw numbers miss.",
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
      maxWords: 40,
      prompt: "1 paragraph. What the map layers reveal about this property's spatial character and connectivity.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence highlighting the most significant spatial pattern or connectivity feature.",
    },
  },

  landWater: {
    intro: {
      maxWords: 40,
      prompt: "1 paragraph. Physical character of the land and water security at a glance — terrain, soil, drought resilience.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the defining physical characteristic (the water network, the soil depth, etc).",
    },
  },

  biodiversity: {
    intro: {
      maxWords: 40,
      prompt: "1 paragraph. Species richness in context and most notable finding from the data.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the most notable biodiversity finding.",
    },
  },

  climateSeasons: {
    intro: {
      maxWords: 40,
      prompt: "1 paragraph. Characterize the climate zone and its growing-season implications.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the climate advantage or challenge.",
    },
  },

  valueBenefits: {
    intro: {
      maxWords: 40,
      prompt: "1 paragraph. SEEA-EA valuation framework briefly, then the economic significance of ecosystem services here.",
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
      maxWords: 40,
      prompt: "1 paragraph. Current land cover and the production potential it supports.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the most promising land use opportunity.",
    },
  },

  historyTrends: {
    intro: {
      maxWords: 40,
      prompt: "1 paragraph. What temperature and precipitation trends mean for this property's long-term value.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the trajectory — improving, stable, or concerning.",
    },
  },

  risksResilience: {
    intro: {
      maxWords: 40,
      prompt: "1 paragraph. How fire, flood, and drought risks interact with energy independence at this property.",
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
      maxWords: 40,
      prompt: "1 paragraph. Compare revenue scenarios and flag the carbon credit opportunity.",
    },
    callout: {
      maxWords: 20,
      prompt: "1 sentence about the return opportunity.",
    },
  },

  recommendations: {
    intro: {
      maxWords: 40,
      prompt: "1 paragraph. Invitation to stewardship — frame next steps as opportunity, not burden.",
    },
  },

  sourcesMethodology: {
    intro: {
      maxWords: 40,
      prompt: "1 paragraph. SEEA-EA framework basis, scoring approach, and data sources in brief.",
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
