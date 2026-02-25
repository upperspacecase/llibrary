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

## Phase 1 — Landing Page (NOW)

### [MODIFY] `index.html`

Complete rewrite with River's copy:

- **Header:** LANDLIBRARY logo from `public/logo.svg`, minimal nav
- **Hero:** Full-viewport satellite hero (`LandLibrary__281_29.svg`), dark overlay. _"Your land is worth more than you know."_ Two pill CTAs: "Discover My Land's Value" + "Explore the Commons"
- **Below fold:** Two product cards — LandBook (paid) + The Commons (free wiki)
- **LandBook section:** "Complete land intelligence. One report." + 3-step process + what's included + benefits
- **Pricing:** Preview €0 / LandBook €250 / Steward €29/mo
- **Footer:** Clean, minimal

### [MODIFY] `main.css`

- Dark hero with satellite background matching reference screenshot
- Transparent pill-outline buttons with white borders
- Remove all emoji-based icons, replace with text or CSS
- Clean editorial spacing throughout

### [MODIFY] `en.js` / `pt.js`

- Update translation keys to match new copy structure

---

## Phase 2 — Switch to MapBox

> _Replace Leaflet + OpenStreetMap with MapBox for all map functionality._

- [ ] Install / link MapBox GL JS
- [ ] Replace Leaflet map instances with MapBox GL
- [ ] Update satellite imagery layer to MapBox
- [ ] Migrate boundary overlay rendering to MapBox sources/layers
- [ ] Update geocoding to MapBox Geocoding API
- [ ] Remove Leaflet dependencies
- [ ] Test map interactions (zoom, pan, boundary display)

---

## Phase 3 — MongoDB Storage

> _Replace localStorage with MongoDB for persistent data._

- [ ] Set up MongoDB connection (`api/_db.js`)
- [ ] Define schemas/collections (properties, users, landbooks)
- [ ] Create API routes for CRUD operations
- [ ] Migrate property save/load from localStorage → API calls
- [ ] Migrate LandBook data flow to MongoDB
- [ ] Add error handling and loading states
- [ ] Test data persistence end-to-end

---

## Future Phases

- [ ] Regional comparison feature
- [ ] Full payment integration (Stripe)
- [ ] Steward subscription flow
- [ ] Multi-language content expansion
