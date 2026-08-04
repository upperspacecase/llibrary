# Second Region Wiki — Bacia do Lima

Plan for standing up region #2 and turning the one-off Odemira wiki into a repeatable
region pipeline.

Written 2026-08-04. Status: proposal, nothing implemented.

---

## 1. The record this starts from

The June submission is real and already region-shaped:

| Field | Value |
|---|---|
| Collection | `submissions` |
| `id` | `c022402f-ce57-4d37-b85e-2cd0d2892586` |
| `propertyTitle` | **Bacia do Lima (rough outline)** |
| Submitted by | Carolina Carvalho |
| `created` | 2026-06-06T17:28:21Z |
| `postcode` | 3500-887 |
| `center` | `[41.86340, -8.37220]` |
| `boundary` | 27 points |
| `area` | 1,180,077,512 m² = **1,180.1 km²** |
| `perimeter` | 175.7 km |
| bbox | `[41.6798, -8.8288, 42.0797, -8.0871]` |
| `data` | `false` — the pipeline has never been run on it |

Retrieved from `GET /api/submissions` on the live deployment (unauthenticated route),
so no credentials were touched.

Two things follow from this record. It is in **Portugal**, which means the whole
SNIRH / IPMA / DGT data stack that powers the Odemira dashboard applies unchanged —
this is the cheap branch. And it is a **river basin**, not a municipality, which is
the one genuinely new thing about region #2 (see §2).

## 2. The pipeline that already exists

Tay was right — there is one, and `region-odemira` is its output. Evidence: the
`landbooks` collection holds a synthetic doc

```
id: region-odemira
address: "Odemira (município) · sampled at São Teotónio agri"
area: 1720600000        # 1,720.6 km², the whole municipality
created: 2026-05-18
data: true
```

So the recipe used for region #1 was:

1. **Create a synthetic region landbook** — a normal `landbooks` doc whose `id` is
   `region-<slug>` and whose `boundary` is the region polygon rather than a property.
   The `address` records a representative sample point for the point-based sources.
2. **`POST /api/landbooks/region-<slug>/refresh`** — `api/landbooks/[id]/refresh.js`
   runs `fetchAllData` across the 30 sources in `src/lib/source-registry.js`, generates
   AI narratives, and dual-writes to `observations` / `facts` / `reports`.
   The admin dashboard's Submissions tab has a button for exactly this.
3. **Serve the facts** — `api/regions/odemira.js` reads `facts` where
   `landbookId: 'region-odemira'` and unwraps it into the dashboard payload.
4. **Ingest the station network** — `scripts/odemira-stations-ingest.mjs` pulls the
   SNIRH station list, filters it to a bbox, and writes to `stations` with
   `region: 'odemira'`; `odemira-backfill.mjs` pulls the observation series.
   `odemira-inat-ingest.mjs` does the same for iNaturalist observations.
5. **Bake to static JSON** — `scripts/bake-odemira-data.mjs` invokes each endpoint with
   a mock req/res at build time and writes `public/data/odemira/*.json`, so the
   dashboard reads from the CDN and never hits Mongo on the hot path.
6. **Seed the chat RAG** — `scripts/seed-embeddings.js <region>` already takes a region
   argument.

Steps 1–3 are region-agnostic today. Steps 4–6 are parameterized by two constants at
the top of each script. **That is the pipeline, and it is in decent shape.**

## 3. What is missing

The pipeline produces a region's *data*. It does not produce a region's *wiki*. The
gap is in three places.

**No region registry.** There is no `regions` collection and no config module. The
string `'odemira'` is a literal in ~15 files. Nothing knows that a region is a thing
with a slug, a bbox, a centre, a sample point and a landbook id.

**The read layer is hardcoded.** `api/regions/odemira.js` plus 11 files under
`api/regions/odemira/` each hardcode `region: 'odemira'` or
`LANDBOOK_ID = 'region-odemira'` in their Mongo queries. The queries themselves are
generic — the collections are already region-keyed — so this is a rename, not a rewrite.

**The wiki page is a single-region instance.** `wiki.html` has the title, description
and OG tags baked in. The `/wiki/:section` rewrite in `vercel.json` has no slot for a
region. `src/pages/wiki.js` is 5,914 lines that import a singleton `ODEMIRA` constant
and reference it ~70 times, including hardcoded prose ("Odemira spans a rich gradient
of ecosystems…"), a hardcoded `ODEMIRA_PROTECTED_AREAS` list, and a soil legend tuned
to Odemira's 82% Luvisols. The content itself — `src/lib/wiki-data.js` (680 lines) and
`wiki-data-pt.js` (639 lines), derived from the ~49k `WIKI_CONTENT.md` — is entirely
hand-researched. **There is no pipeline for this and there probably shouldn't be a
fully automatic one.**

## 3a. Prior art — `feat/algarve-region`

This has been attempted once. The branch `feat/algarve-region` (one commit,
`f8b809c`, on origin) added a second region called Algarve. What it built:

- `src/lib/regions/index.js` — a `REGIONS` map with `getRegion` / `getAllRegions` /
  `getLiveRegions` and a `status: 'live'` flag per region.
- `src/lib/regions/odemira.js` — a thin re-export of the existing `wiki-data.js`, so
  region #1 keeps working unchanged.
- `src/lib/regions/algarve.js` — 558 lines of Algarve content in the same shape.
- `src/pages/wiki.js` — resolves the region from `?region=` and aliases
  `const ODEMIRA = REGION_DATA` so the other ~65 references keep compiling.
- `wiki.html` — meta tags genericised; title set at runtime.

**Do not rebase it.** It is 394 commits behind main, and everything that makes the
current wiki interesting — the entire environmental dashboard and the SNIRH panels —
landed after it. The `wiki.js` it patched is a much smaller, older file.

**Do steal two ideas from it.** The per-region module registry is the right shape and
is what §5 Phase 1 should build. And the `const ODEMIRA = REGION_DATA` alias is a smart
shortcut: it converts ~65 mechanical edits into one line, and the references can be
renamed later at leisure.

**Note what it did not do.** It only regionalised the *content* layer. `api/regions/
odemira/*` was untouched, so the Algarve wiki would have rendered Odemira's dashboard
data or a broken dashboard. That gap is Phase 2 here, and it is why that branch never
shipped.

## 4. Decisions needed before any code

These are Tay's calls, not mine. Everything downstream branches on them.

**D1 — Basin or municipality framing? DECIDED 2026-08-04.** Keep the same ten
sections; do not build a variant model for basins. Re-source three of them:

- *Overview* leads with basin facts — river length, headwaters to estuary, the
  municipalities crossed — instead of resident population and parish count.
- *Community* is framed as the municipalities in the basin, with any population
  figure clearly labelled approximate: it is a sum over municipalities that only
  partly fall inside the line.
- *Governance* covers river-basin management and the constituent municipalities
  rather than a single council and PDM.

Everything else — ecology, soil, climate, land use, risks — is unaffected. Water
arguably gets *better*, since a watershed is the natural unit for it where Odemira's
municipal boundary is slightly arbitrary against the Mira's actual catchment.

This is a content-authoring decision with no engineering consequence. The registry
carries `kind: 'basin'`, `homeMunicipality: null` and the municipality list to drive it.

Verified footprint of Carolina's outline — all 27 vertices plus the centroid
reverse-geocoded via Nominatim, 2026-08-04: **Melgaço, Arcos de Valdevez, Ponte da
Barca, Vila Verde, Ponte de Lima, Viana do Castelo, Paredes de Coura, Terras de Bouro,
Caminha, Monção** — ten Portuguese municipalities, plus Lobios, Lobeira and Entrimo
in Galicia.

**D2 — Cross-border scope.** The Lima rises in Galicia as the Limia. If the wiki
claims the basin, the Spanish headwaters are part of it — and SNIRH, IPMA and DGT all
stop at the border. Recommend scoping v1 to the Portuguese basin and saying so
explicitly rather than showing a map with a silently empty upper third.

**D3 — Keep the submitted boundary? DECIDED 2026-08-04: yes, ship Carolina's outline.**
Since she labelled it a rough outline, area figures are presented as approximate rather
than quoted to a decimal. Recorded on the registry entry as `boundaryIsProvisional:
false` with the reasoning alongside it.

**D4 — Bilingual at launch?** Odemira ships EN + PT. Doubling Lima's content at launch
roughly doubles the authoring cost. EN-first with PT to follow is a legitimate call.

**D5 — Slug.** `lima` is ambiguous (Peru). Suggest `bacia-do-lima` or `lima-basin`.

## 4a. Building it without launching it

The whole thing can be built and reviewed on a branch. Code isolation is free; data
isolation needs one deliberate choice.

**Code — free.** Branch off current `main` as `feat/lima-region`. Vercel builds every
non-production branch to its own preview URL, with production served only from the
production branch, so nothing reaches `llibrary-eight.vercel.app` until a merge. Worth
one glance at Vercel → Settings → Git to confirm the production branch is `main` and
nothing else is promoted. The preview URL is shareable, which is how Carolina Carvalho
could see her basin before launch.

**Env — already works.** `vercel env ls` shows `MONGODB_URI`, `PINECONE_API_KEY`,
`ANTHROPIC_API_KEY`, `VITE_MAPBOX_TOKEN` and the rest scoped to Preview as well as
Production, so a preview build has everything the pipeline needs. Two are
Production-only — `ADMIN_EMAILS` and `GOOGLE_CLIENT_ID` — so admin *Google* sign-in may
behave differently on a preview; `ADMIN_PASSWORD` covers all three targets, so
password admin login still works there.

**Data — the wrinkle.** `MONGODB_URI` is a single value covering Preview *and*
Production. A preview deploy therefore reads and writes the **production database**.
Running the pipeline on the branch puts `region-bacia-do-lima` documents into the live
`landbooks`, `facts`, `stations`, `station_observations`, `observations` and `reports`
collections. Consequences, accurately:

- The live Odemira wiki is **unaffected**. Every read query filters on region — e.g.
  `stations.find({ region: 'odemira' })`, `facts.findOne({ landbookId: 'region-odemira' })`
  — so new region rows are invisible to it.
- The chat is **cleanly isolated**. Pinecone is namespaced per region
  (`api/chat/embed.js` and `api/chat/index.js` both derive a namespace from the region
  slug), so Lima vectors cannot surface in Odemira answers.
- The new records **would** appear in the admin dashboard, and in the unauthenticated
  `GET /api/landbooks` and `GET /api/submissions` responses on production.
- Nothing on the public site would link to the new region unless the commons card is
  added, which stays on the branch.

Three ways to handle that last point:

- **(A) Accept the shared database.** Simplest, and the blast radius is genuinely
  small given region-keyed reads. The cost is that the two open list endpoints expose
  the region's existence to anyone who calls them.
- **(B) Preview-scoped `MONGODB_URI`.** Vercel allows a Preview-only override pointing
  at a different database name on the same Atlas cluster. Clean isolation — but the
  preview starts empty, so Odemira would have to be re-piped there to compare regions
  side by side, burning API calls and Anthropic tokens for a dev-only copy.
- **(C) Recommended: (A) plus a launch gate.** Share the database, but keep the
  commons card, the i18n strings and any inbound link on the branch, and give the
  registry entry `status: 'draft'` so `getLiveRegions()` never returns it. Merging then
  becomes a content decision rather than an infrastructure one, and a single flag flip
  launches it.

**One build-time note.** `npm run build` runs the bake script, which hits Mongo. It is
already wrapped so a bake failure does not block the deploy — keep that property when
generalising it to loop over regions in Phase 3, so a thin or failing Lima bake can
never break an Odemira deploy.

## 5. Phases

Phases 1–3 are the refactor that makes region #3 cheap. Phase 5 can technically run
before them against hardcoded copies, but that doubles the mess.

### Phase 1 — Region as a first-class record
*Small. No user-visible change.*

- New `src/lib/regions.js`: a keyed config per region — `slug`, `name`, `subtitle`,
  `landbookId`, `center`, `bbox`, `samplePoint`, `area`, `country`, `dataSources`
  (which national networks apply), `sections` (which of the 10 exist for this region).
- Move the `ODEMIRA` constant out of `wiki-data.js` into this registry, re-export it so
  nothing breaks yet.
- Regression net: `scripts/check-baseline.mjs` covers pipeline output but **not** the
  wiki UI. Nothing here should change pipeline output; verify with a baseline run.

### Phase 2 — Generalize the read layer
*Small–medium. Mechanical.*

- `api/regions/odemira/*.js` → `api/regions/[region]/*.js`, reading the slug from
  `req.query` and looking up the landbook id in the registry. Twelve files, each a
  one-or-two-line change to the Mongo filter.
- Old `/api/regions/odemira/*` paths keep resolving through the dynamic route, so the
  deployed wiki does not break mid-refactor.
- Reject unknown slugs with a 404 rather than an empty result set.

### Phase 3 — Generalize the scripts
*Small.*

- `stations-ingest`, `backfill`, `inat-ingest`, `enrich-station-names`, `prune-hourly`:
  replace the `REGION` / `BBOX` constants with a `--region <slug>` flag reading the
  registry. The SNIRH station list is national and already bbox-filtered, so Lima needs
  no new source code — just the new bbox.
- `bake-odemira-data.mjs` → `bake-region-data.mjs`, looping over all registered regions
  and writing `public/data/<slug>/`. Update the `build` script in `package.json`.
- Re-run `snirh-discover.mjs` against the Lima bbox to confirm which of the three
  default networks (piezometry, hidrométrica, groundwater quality) actually have
  stations there. **This is the main unknown in the whole plan** — if the Lima basin is
  thinly instrumented, some dashboard panels will be sparse or empty, and that is a
  content decision, not a bug to fix in code.

### Phase 4 — Multi-region wiki shell
*The largest engineering piece. Medium–large, and the highest-risk.*

- Route: `/wiki/:region` and `/wiki/:region/:section` in `vercel.json`; keep `/wiki` →
  redirect to the Odemira slug so existing links and any indexed URLs survive.
- `wiki.html`: strip the Odemira title/description/OG tags; set them at runtime from
  the registry, or split per-region entry points in `vite.config.js` if SEO-quality
  static meta matters (it probably does for a public wiki).
- `src/pages/wiki.js`: replace the singleton import with a region resolved from the
  path. The ~70 references become field reads off that object. The hardcoded prose,
  `ODEMIRA_PROTECTED_AREAS`, and the soil-legend tuning move into region content.
- Sections become opt-in per region so Lima can launch with fewer than 10.
- Risk: 5,914 lines, no UI test coverage. Recommend `/browse` or `/qa` screenshot
  diffing of the Odemira wiki before and after, section by section, as the only
  practical regression net.

### Phase 5 — Run the pipeline for Lima
*Facts DONE 2026-08-04. Station ingest still outstanding.*

Done: the `region-bacia-do-lima` landbook was created from Carolina's 27-point
boundary via `POST /api/landbooks`, with `center` set to the sample point
**Refóios do Lima (41.7830, -8.5450)** — valley floor at 39 m. The centroid was
rejected at 306 m on high ground, which would have sampled soil and geology off the
uplands. `POST /api/landbooks/region-bacia-do-lima/refresh` then ran the full
pipeline: **42 of 45 sources OK**, 21 data sections, 13 narratives, scores written,
and all three layers (observations / facts / report v2) persisted.

Two known gaps from that run:

- `historicalFires` fails with **NASA FIRMS HTTP 400**, persistently, across both a
  full run and a single-source retry. Worth checking whether Odemira hits the same —
  it may be a key or date-range problem affecting every region, not a Lima issue.
- The **SNIRH station ingest has not run.** `snirh.apambiente.pt` was unreachable
  from this machine (connect timeout on 443), so basin instrumentation could not be
  verified, and the ingest scripts write to Mongo directly — they need `MONGODB_URI`,
  which lives in `.env.local`. Until that runs, `stations`, `groundwater`,
  `reservoirs`, `water-quality` and `rainfall-stations` return empty for Lima and
  those dashboard panels stay blank.

Original steps, for reference:

1. Resolve D3 (boundary), then create the `region-bacia-do-lima` landbook doc with the
   chosen polygon and a representative sample point — the Odemira precedent picks an
   agricultural point rather than the centroid.
2. Run `POST /api/landbooks/region-bacia-do-lima/refresh` from the admin dashboard.
   The 1,180 km² polygon is smaller than Odemira's 1,720 km², so scale is proven.
3. Run the SNIRH station ingest + backfill for the Lima bbox; run the iNat ingest.
4. Bake, and verify each dashboard panel against the live API — note explicitly which
   panels come back thin.

### Phase 6 — Content
*The long pole. Research, not engineering.*

Ten sections of researched prose with references, following `WIKI_CONTENT.md` as the
model. Half of it — terrain, soil, water, climate, species, risks — can be drafted from
the Phase 5 facts output. The other half — culture, community, events, landmarks,
governance, history — is genuine research with no data pipeline behind it. Then PT, if
D4 says so.

### Phase 7 — Surface it
*Small.*

- Commons page: the region grid in `commons.html` is static HTML with one card. Make it
  render from the registry.
- `src/lib/lang/en.js` and `pt.js`: ~12 keys per language hardcode "Odemira"
  (`hero.sub`, `chat.title`, `chat.welcome`, `cta.wiki`, `wiki.hub.hero.title`, …).
  Move region names out of the string table into interpolation.
- `node scripts/seed-embeddings.js bacia-do-lima` once content exists — the chat layer
  already takes a region arg and needs no changes.
- Close the loop with Carolina Carvalho, who submitted the outline.

## 6. Effort, honestly

| Phase | Size | Confidence |
|---|---|---|
| 1–3 (registry, read layer, scripts) | ~1–2 focused days | High — mechanical, well-understood |
| 4 (wiki shell) | ~2–3 days | Medium — 5,914 lines, no UI tests |
| 5 (run the pipeline) | Hours, plus ingest wait | High — proven path |
| 6 (content) | Weeks, at research pace | Low — depends entirely on D1/D4 |
| 7 (surface) | Half a day | High |

The code is the small half. Phases 1–4 are a one-time cost that makes region #3 close to
free; phase 6 is paid again for every region and does not get cheaper.

## 7. Open questions

- **D1–D5 above.**
- Does the Lima basin have enough SNIRH instrumentation to fill the water dashboard?
  Unknown until `snirh-discover.mjs` runs against the new bbox. Phase 3 answers it, and
  the answer may reshape phase 6.
- Is region #2 meant to prove the pipeline, or to be as deep as Odemira? A deliberately
  thinner launch — say 5 sections and a dashboard — tests the machinery for a fraction
  of the content cost.
