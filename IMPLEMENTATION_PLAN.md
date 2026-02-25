# Land Library — Implementation Plan

## Decisions (from user feedback)

| Decision | Answer |
|---|---|
| Copy | River's exact copy (hero, below-fold, LandBook, pricing) |
| Logo | `public/logo.svg` (LANDLIBRARY wordmark) |
| Hero image | `public/LandLibrary__281_29.svg` (satellite with boundary overlay) |
| Map | MapBox (replacing Leaflet + OSM) |
| Storage | MongoDB (replacing localStorage) |
| Emojis | None across the site |
| Paywall | Coming-soon gate on LandBook purchase flow |
| Regional comparison | Later phase, basic flow first |

---

## Phase 1 — Landing Page ✅

Completed in a previous session.

## Phase 2 — Switch to MapBox ✅

Completed. All 6 pages migrated from Leaflet to MapBox GL JS. Shared helper at `src/lib/mapbox.js`.

## Phase 3 — MongoDB Storage ✅

Completed. `store.js` rewritten from localStorage to async fetch. API routes created for landbooks and properties.

---

## Phase 4 — Landbook Report Structure + Wiki Community Contributions

### 4A. Landbook Report Structure

The current landbook report renders 10 sections. The goal is to review, restructure, and refine how these sections are organized — what data goes where, what's missing, and what the ideal report flow should be.

**Current report sections:**

| # | Section | Data Source | Notes |
|---|---------|------------|-------|
| 1 | Header | MongoDB landbook doc | Address, area, perimeter, center, date |
| 2 | Map | MapBox GL + WMS overlays | Boundary polygon, CORINE/EFFIS/Natura toggles |
| 3 | Elevation & Terrain | Open-Meteo Elevation API | Single elevation point at center |
| 4 | Weather & Climate | Open-Meteo Forecast + Climate | Current conditions, 7-day forecast, 30-yr averages, frost dates |
| 5 | Soil | SoilGrids API | Texture, pH, nutrients, WRB classification |
| 6 | Biodiversity | iNaturalist + GBIF | Species counts, most observed, threatened, regional key species |
| 7 | Water Features | Overpass (OSM) | Rivers, streams, wells, springs nearby |
| 8 | Fire Risk | Estimated from weather + EFFIS history | Risk level + regional fire history |
| 9 | Protected Areas & Zoning | Static data (natura2000.js) | Nearby designations + PT zoning descriptions |
| 10 | User-Reported Form | MongoDB (userReported) | Primary use, challenges, goals, infrastructure, notes |

> [!IMPORTANT]
> **What should change?** Before implementing, we need to decide:
> 1. Should sections be reordered? (e.g., User Knowledge first? Map last?)
> 2. Are any sections missing? (e.g., Slope/Aspect analysis, Satellite NDVI, Historical imagery, Neighbors/nearby landbooks?)
> 3. Should the report be paginated, tabbed, or stay as one long scroll?
> 4. Should the "Your Knowledge" form be inline or a separate modal/page?
> 5. What print/export format do we want? (PDF, sharable link, both?)

---

### 4B. Wiki Community & Culture Contributions

Add a **user-generated contributions** system to the wiki's Community & Culture sections. This is the most important part — the wiki becomes a living document that people contribute to.

#### Design

The wiki currently has 8 sections with static articles from `wiki-data.js`. The Community (`#community`) and History (`#history`) sections especially need user contributions. The approach:

1. **Contribution types:**
   - **Stories** — personal accounts, memories, local knowledge, oral history
   - **Tips** — practical info (best suppliers, seasonal advice, bureaucracy navigation, "things I wish I knew")
   - **Events** — community gatherings, workshops, markets, festivals
   - **Places** — hidden gems, recommended spots, warnings
   - **Resources** — links, documents, contacts, organizations

2. **Display:** Community contributions appear below the curated articles in the relevant wiki section, newest first, with contributor name and date.

3. **Submission:** Simple form at the bottom of each wiki section (no login required initially — moderation can come later).

4. **Storage:** New MongoDB collection `wiki_contributions` with fields:
   - `id`, `section` (which wiki section), `type` (story/tip/event/place/resource)
   - `title`, `content`, `author` (optional name), `location` (optional coords)
   - `created`, `status` (active/pending/hidden)

#### Proposed Changes

##### [NEW] `api/wiki/contributions/index.js`
- `GET /api/wiki/contributions?section=community` — list contributions for a section
- `POST /api/wiki/contributions` — submit a new contribution

##### [NEW] `api/wiki/contributions/[id].js`
- `GET /api/wiki/contributions/:id` — single contribution
- `PUT /api/wiki/contributions/:id` — edit (future: auth-gated)
- `DELETE /api/wiki/contributions/:id` — remove (future: admin only)

##### [MODIFY] `wiki.js`
- After rendering each section's curated articles, fetch and display community contributions
- Add a "Share Your Knowledge" form at the bottom of each section
- Render contributions as cards with author, date, type badge, and content

##### [MODIFY] `wiki-data.js`
- Add contribution type definitions and section-to-contribution-type mapping

##### [MODIFY] `vercel.json`
- Already handled by existing `/api/(.*)` rewrite

---

## Future Phases

- [ ] Regional comparison feature
- [ ] Full payment integration (Stripe)
- [ ] Steward subscription flow
- [ ] Multi-language content expansion
- [ ] Moderation system for wiki contributions
- [ ] User authentication (AuthJS) for contribution editing
