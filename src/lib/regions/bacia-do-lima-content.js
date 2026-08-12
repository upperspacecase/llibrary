/**
 * Bacia do Lima — wiki content.
 *
 * Sourcing rules for this file, because a regional wiki is only worth having
 * if its facts hold up:
 *
 *   - Terrain, soil and score figures come from this region's own pipeline run
 *     (landbook `region-bacia-do-lima`, 2026-08-04, 42/45 sources).
 *   - Fire figures come from EFFIS burnt-area perimeters queried for this
 *     boundary. They are a LOWER BOUND — EFFIS has no WFS, so perimeters are
 *     found by sampling on a grid and small fires between points are missed.
 *   - The municipality list comes from reverse-geocoding all 27 boundary
 *     vertices, not from an administrative dataset.
 *   - Everything else carries a reference. Nothing here is written from memory.
 *
 * Structure mirrors src/lib/wiki-data.js. No PT translation yet.
 */


export const IMAGE_CREDITS = [
  { section: 'bioregion', author: 'Feliciano Guimarães from Guimarães, Portugal', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Ponte_de_Lima_(1806522070).jpg' },
  { section: 'climate', author: 'manjerix', license: 'CC BY-SA 2.0', source: 'https://commons.wikimedia.org/wiki/File:Serra_Amarela_(3998828848)_(2).jpg' },
  { section: 'community', author: 'Krzysztof Golik', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Monte_de_Santa_Luzia_sanctuary_in_Viana_do_Castelo_05.jpg' },
  { section: 'culture', author: 'Mário José Martins', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Ponte_de_Lima_47.jpg' },
  { section: 'ecology', author: 'Ruben Minderico', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Parque_Nacional_da_Peneda-Ger%C3%AAs_1.jpg' },
  { section: 'fires', author: 'DianaCleto', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Burned_Life.jpg' },
  { section: 'land', author: 'manjerix', license: 'CC BY-SA 2.0', source: 'https://commons.wikimedia.org/wiki/File:Serra_Amarela_(3998066989)_(2).jpg' },
  { section: 'landuse', author: 'Xauxa Håkan Svensson', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:ArcozeloPTL_Stone_fence.jpg' },
  { section: 'risks', author: 'User:PatríciaR / Patrícia', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:BarragemLindoso2.jpg' },
  { section: 'soil', author: 'Vitor Oliveira from Torres Vedras, PORTUGAL', license: 'CC BY-SA 2.0', source: 'https://commons.wikimedia.org/wiki/File:Anta_do_Mezio_-_Portugal_(30337760538).jpg' },
  { section: 'water', author: 'Francisco Restivo from Porto, Portugal', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Lima_river_-_rio_lima_(4468859940).jpg' },
];

export const LIMA = {
  name: 'Bacia do Lima',
  subtitle: 'Alto Minho, Portugal',
  country: 'Portugal',
  region: 'Alto Minho',
  center: [41.86340, -8.37220],
  bbox: [41.6798, -8.8288, 42.0797, -8.0871],
  area: 1180.1,
  elevation: { min: 10, max: 1252 },
  municipalities: 10,
};

const REF = {
  lima: { id: 1, title: 'Lima River — Wikipedia', url: 'https://en.wikipedia.org/wiki/Lima_River' },
  pnpg: { id: 2, title: 'Peneda-Gerês National Park — Wikipedia', url: 'https://en.wikipedia.org/wiki/Peneda-Ger%C3%AAs_National_Park' },
  pdl: { id: 3, title: 'Ponte de Lima — Wikipedia', url: 'https://en.wikipedia.org/wiki/Ponte_de_Lima' },
  vc: { id: 4, title: 'Viana do Castelo — Wikipedia', url: 'https://en.wikipedia.org/wiki/Viana_do_Castelo' },
  vv: { id: 5, title: 'Vinho Verde — Wikipedia', url: 'https://en.wikipedia.org/wiki/Vinho_Verde' },
  effis: { id: 6, title: 'EFFIS — European Forest Fire Information System', url: 'https://effis.jrc.ec.europa.eu/' },
  icnf: { id: 7, title: 'ICNF — Instituto da Conservação da Natureza e das Florestas', url: 'https://www.icnf.pt/' },
  pipeline: { id: 8, title: 'LandLibrary data pipeline — region-bacia-do-lima (2026-08-04)', url: '#' },
  cmpdl: { id: 9, title: 'Câmara Municipal de Ponte de Lima', url: 'https://www.cm-pontedelima.pt/' },
  cmvc: { id: 10, title: 'Câmara Municipal de Viana do Castelo', url: 'https://www.cm-viana-castelo.pt/' },
};

export const LIMA_SECTIONS = {
  bioregion: {
    id: 'bioregion',
    title: 'Region Overview',
    subtitle: 'A river basin, not a municipality — profile and key statistics',
    color: '#8B6914',
    icon: 'globe',
    description: 'A river basin, not a municipality — profile and key statistics',
    accentColor: '#8B6914',
    intro: `The Bacia do Lima is the catchment of the Lima river: every slope in the Alto Minho whose water drains toward one channel. It is not an administrative unit and has no council, no census and no master plan of its own. The outline mapped here covers roughly 1,180 km² and crosses ten Portuguese municipalities — Melgaço, Arcos de Valdevez, Ponte da Barca, Vila Verde, Ponte de Lima, Viana do Castelo, Paredes de Coura, Terras de Bouro, Caminha and Monção — before reaching the Atlantic at Viana do Castelo. The river itself runs 108 km from Talariño mountain in Ourense, Galicia, where it is called the Limia, to its mouth on the Portuguese coast.`,
    articles: [
      {
        title: 'Key Facts',
        content: `Area: approximately 1,180 km². Elevation: 10 m to 1,252 m. Municipalities crossed: 10 in Portugal, plus Galician territory upstream. River length: 108 km total, of which 41 km lie in Spain. Mouth: Viana do Castelo, on the Atlantic. Mean elevation: 374 m.`,
      },
      {
        title: 'The river the Romans would not cross',
        content: `Roman writers identified the Lima — which they called the Limaeas — with the mythical Lethe, the river of forgetfulness, and believed that anyone crossing it would lose their memory. Decimus Junius Brutus Callaicus became the first Roman to cross, carrying the standard across himself to convince his frightened soldiers to follow. The story is recorded by Strabo, Appian, Florus and Livy, and it is still the single best-known thing about this river.`,
      },
      {
        title: 'Why a basin and not a municipality',
        content: `Most regional profiles are written around an administrative unit, because that is where the statistics come from. A watershed has no equivalent. Population, governance and planning figures here belong to the ten municipalities the basin crosses, each of which only partly falls inside the line, so any total is an approximation and is presented as one. What the basin does have, uniquely, is hydrological coherence — the water section is the one that most naturally describes it.`,
      },
    ],
    mapLayers: ['elevation', 'boundaries'],
    visuals: {
      stats: [
        { label: 'Area', value: '~1,180', sublabel: 'km²' },
        { label: 'Elevation', value: '10–1,252', sublabel: 'metres' },
        { label: 'Municipalities', value: '10', sublabel: 'Portuguese', color: '#2E8B57' },
        { label: 'River length', value: '108 km', sublabel: 'source to sea' },
      ],
    },
    references: [REF.lima, REF.pdl, REF.vc, REF.pipeline],
  },

  ecology: {
    id: 'ecology',
    title: 'Ecology',
    subtitle: 'Atlantic forest, granite uplands, and an estuary',
    color: '#2E8B57',
    icon: 'leaf',
    description: 'Atlantic forest, granite uplands, and an estuary',
    accentColor: '#2E8B57',
    intro: `The basin climbs from an Atlantic estuary to granite massifs above 1,200 m, and that gradient carries one of the sharpest ecological transitions in Portugal. Its upper catchment lies partly within Peneda-Gerês, the country's oldest protected area and its only national park.`,
    articles: [
      {
        title: 'Peneda-Gerês',
        content: `Established on 8 May 1971, Peneda-Gerês is the oldest protected area in Portugal and the only one designated a national park. It covers 695.9 km² across the districts of Viana do Castelo, Braga and Vila Real, reaching 1,546 m at its highest point. It takes its name from two granite massifs, the Serra da Peneda and the Serra do Gerês, which together with the Serra Amarela and the Serra do Soajo form its highest ground. Around 9,000 people live inside it, scattered across small villages.`,
      },
      {
        title: 'Atlantic flora at its southern edge',
        content: `The park's steep valleys hold temperate broadleaf and mixed forests of oak and pine, described as one of the last strongholds of typical Atlantic European flora in Portugal, sitting in contrast with an advancing Mediterranean biome. That transition — Atlantic forest giving way to Mediterranean conditions — is the defining ecological story of the upper basin, and it is a moving boundary rather than a fixed one.`,
      },
      {
        title: 'Iberian endemics',
        content: `Around 220 vertebrate species are recorded in the park, several native only to the Iberian Peninsula, including the threatened Pyrenean desman, the Iberian frog and the gold-striped salamander. The park borders the Spanish Baixa Limia – Serra do Xurés natural park to the north; together they form the UNESCO Gerês-Xurés biosphere reserve, one continuous protected landscape split by an international border.`,
      },
      {
        title: 'Protection on the ground',
        content: `Protected status is not incidental here. Of the largest fires recorded in this basin since 2000, one burnt 7,225 hectares in July 2025 with essentially its entire footprint inside Natura 2000 territory, and a 3,074-hectare fire in 2016 burnt 95% inside it. Conservation designation and fire exposure occupy the same ground.`,
      },
    ],
    mapLayers: ['biodiversity', 'protected'],
    visuals: {
      stats: [
        { label: 'National park', value: '695.9', sublabel: 'km² (Peneda-Gerês)', color: '#2E8B57' },
        { label: 'Vertebrate species', value: '~220', sublabel: 'in the park' },
        { label: 'Highest point', value: '1,546 m', sublabel: 'park maximum' },
        { label: 'Established', value: '1971', sublabel: "Portugal's only national park" },
      ],
    },
    references: [REF.pnpg, REF.icnf, REF.effis],
  },

  land: {
    id: 'land',
    title: 'Land',
    subtitle: 'Granite, relief, and the shape of the catchment',
    color: '#6B8E23',
    icon: 'mountain',
    description: 'Granite, relief, and the shape of the catchment',
    accentColor: '#6B8E23',
    intro: `The basin is granite country. Its relief spans 1,242 vertical metres, from tidal flats at the estuary to summits above 1,200 m, within a catchment roughly 44 km north to south and 61 km east to west.`,
    articles: [
      {
        title: 'Relief',
        content: `Elevation across the mapped boundary ranges from 10 m to 1,252 m, with a mean of 374 m. The terrain profile sampled along the boundary alternates sharply between valley floor and upland — 39 m, 877 m, 1,252 m, 367 m, 1,085 m within a single traverse — which is characteristic of a catchment cut into a granite plateau rather than one opening onto a plain.`,
      },
      {
        title: 'The granite massifs',
        content: `The high ground is formed by granite: the Serra da Peneda and the Serra do Gerês, with the Serra Amarela and the Serra do Soajo alongside them. These are the same massifs that give Peneda-Gerês its name, and their weathering supplies the coarse, acidic material that defines soils across the upper basin.`,
      },
      {
        title: 'Valley and estuary',
        content: `Below the uplands the Lima occupies a broad valley floor running west, through Ponte da Barca and Ponte de Lima, before opening into the estuary at Viana do Castelo. Viana's own municipality spans the full range from sea level to 825 m, which gives a sense of how quickly the ground rises away from the water.`,
      },
    ],
    mapLayers: ['elevation', 'geology'],
    visuals: {
      stats: [
        { label: 'Elevation range', value: '1,242 m', sublabel: '10 m to 1,252 m' },
        { label: 'Mean elevation', value: '374 m' },
        { label: 'Mean slope', value: '1.6°', sublabel: 'basin average' },
        { label: 'Dominant aspect', value: 'North', sublabel: 'facing' },
      ],
    },
    references: [REF.pnpg, REF.vc, REF.pipeline],
  },

  soil: {
    id: 'soil',
    title: 'Soil',
    subtitle: 'Cambisols on granite, and what that means for farming',
    color: '#8B4513',
    icon: 'layers',
    description: 'Cambisols on granite, and what that means for farming',
    accentColor: '#8B4513',
    intro: `The dominant soil class across the basin is Cambisol — young soils with a weakly developed subsurface horizon, typical of granite uplands under a wet Atlantic climate.`,
    articles: [
      {
        title: 'Cambisols',
        content: `Soil classification sampled for this basin returns Cambisols as the dominant World Reference Base class. These are moderately developed soils: enough weathering to distinguish a subsurface horizon, not enough to have leached into something more strongly differentiated. On granite parent material under high rainfall they tend to be acidic, free-draining and shallow on slopes, deepening on valley floors and terraces.`,
      },
      {
        title: 'Why this differs from southern Portugal',
        content: `This is a genuinely different soil story from the Alentejo. Odemira, the other region in this library, is dominated by Luvisols — clay-enriched soils formed under a drier Mediterranean regime. Comparing the two regions on soil means comparing two distinct pedological worlds rather than two variations on one, and any map legend built for one will mislabel the other.`,
      },
      {
        title: 'Working the slope',
        content: `Steep, thin, acidic soils are why the traditional agriculture here is terraced and small-parcelled rather than extensive. The same constraint underlies the region's characteristic vine training, which lifts fruit clear of ground that is often wet.`,
      },
    ],
    mapLayers: ['soil'],
    visuals: {
      stats: [
        { label: 'Dominant class', value: 'Cambisols', color: '#8B4513' },
        { label: 'Parent material', value: 'Granite' },
        { label: 'Soil score', value: '75', sublabel: 'pipeline index' },
      ],
    },
    references: [REF.pipeline, REF.pnpg],
  },

  water: {
    id: 'water',
    title: 'Water',
    subtitle: 'The Lima from Galicia to the Atlantic',
    color: '#2B7BB9',
    icon: 'waves',
    description: 'The Lima from Galicia to the Atlantic',
    accentColor: '#2B7BB9',
    intro: `Water is what defines this region — it is the only thing that does. The Lima runs 108 km from the Galician interior to the Atlantic, and the basin is simply everything that drains into it.`,
    articles: [
      {
        title: 'Source to mouth',
        content: `The Lima rises at Talariño mountain, 975 m above sea level, near the village of Paradiña in the municipality of Sarreaus, Ourense, Spain. It runs 41 km in Spain, where it is known officially in Galicia as the Limia, before crossing into Portugal. From there it passes through Ponte da Barca and Ponte de Lima and reaches the Atlantic at Viana do Castelo, 108 km from its source.`,
      },
      {
        title: 'Alto Lindoso and the drowned villages',
        content: `The river enters Portugal through the reservoir of the Alto Lindoso dam, near the village of Lindoso. The dam carries a hydro-electric plant and impounds a large reservoir extending back across the border. Filling it in 1992 flooded several villages in the Spanish municipality of Lobios, among them Aceredo, Buscalque, O Bao, A Reloeira and Lantemil. After a prolonged drought through the winter of 2021–22, Aceredo re-emerged from the falling reservoir and was on dry land again by February 2022 — an event that drew international attention and made the basin's water balance briefly visible.`,
      },
      {
        title: 'A cross-border catchment',
        content: `The basin does not stop at the frontier. Its headwaters are Galician, and the boundary mapped here crosses into the Spanish municipalities of Lobios, Lobeira and Entrimo. Portuguese national monitoring — the SNIRH hydrometric network, IPMA weather stations, DGT administrative data — stops at the border, so the upper catchment is genuinely less well described here than the lower. This wiki scopes its data to the Portuguese side and says so rather than presenting a partial picture as a complete one.`,
      },
      {
        title: 'Estuary',
        content: `The river meets the sea at Viana do Castelo, a municipality of 85,778 people whose land runs from sea level to 825 m. The estuary is the basin's ecological and economic terminus, and the point at which a catchment of granite uplands becomes an Atlantic port.`,
      },
    ],
    mapLayers: ['water', 'watershed'],
    visuals: {
      stats: [
        { label: 'River length', value: '108 km', sublabel: 'source to mouth', color: '#2B7BB9' },
        { label: 'In Spain', value: '41 km', sublabel: 'as the Limia' },
        { label: 'Source elevation', value: '975 m', sublabel: 'Talariño, Ourense' },
        { label: 'Water score', value: '100', sublabel: 'pipeline index' },
      ],
    },
    references: [REF.lima, REF.vc, REF.pipeline],
  },

  climate: {
    id: 'climate',
    title: 'Climate',
    subtitle: 'Atlantic and wet, with a Mediterranean edge advancing',
    color: '#E8A317',
    icon: 'sun',
    description: 'Atlantic and wet, with a Mediterranean edge advancing',
    accentColor: '#E8A317',
    intro: `The Alto Minho is the wettest corner of Portugal, and the basin's climate is Atlantic rather than Mediterranean — though the boundary between the two is moving through this landscape rather than sitting still.`,
    articles: [
      {
        title: 'An Atlantic regime',
        content: `The basin sits open to the Atlantic, and its vegetation reflects that: temperate broadleaf and mixed oak and pine forest of a kind that survives in few other places in Portugal. Ecological descriptions of Peneda-Gerês characterise the park as holding typical Atlantic European flora in contrast with an evolving Mediterranean biome — climate change described through what is growing, not through a projection.`,
      },
      {
        title: 'Drought is not hypothetical',
        content: `The winter of 2021–22 brought drought severe enough to draw the Alto Lindoso reservoir down until a village submerged in 1992 stood on dry ground again. In a catchment this wet, that is the clearest available illustration of how far the water balance can swing.`,
      },
      {
        title: 'Fire season',
        content: `Recorded burnt areas cluster in August and September, with the notable exception of a 3,893-hectare fire on 14 October 2017 and a 525-hectare fire in April 2017 — a reminder that the fire season here has edges that move with the weather rather than the calendar.`,
      },
    ],
    mapLayers: ['climate'],
    visuals: {
      stats: [
        { label: 'Regime', value: 'Atlantic', sublabel: 'temperate, wet' },
        { label: 'Carbon score', value: '90', sublabel: 'pipeline index', color: '#2E8B57' },
        { label: 'Peak fire months', value: 'Aug–Sep' },
      ],
    },
    references: [REF.pnpg, REF.lima, REF.effis],
  },

  landuse: {
    id: 'landuse',
    title: 'Land Use',
    subtitle: 'Vinho verde, smallholdings, and terraced valley floor',
    color: '#6B8E23',
    icon: 'map',
    description: 'Vinho verde, smallholdings, and terraced valley floor',
    accentColor: '#6B8E23',
    intro: `The Lima valley sits inside the Vinho Verde denomination, and its agriculture is defined by very small parcels worked intensively — the opposite of the extensive estates of southern Portugal.`,
    articles: [
      {
        title: 'Vinho Verde',
        content: `Vinho Verde is a protected-origin wine from the far north of Portugal, covering the original 1908 Minho province plus adjacent areas to the south. The name means green wine in the sense of young wine: it is released three to six months after harvest and usually drunk soon after bottling. It has no specified grape variety and may be white, red or rosé, as well as sparkling, late harvest or brandy. The region is characterised by its very large number of small growers.`,
      },
      {
        title: 'Vines trained overhead',
        content: `The traditional training system, vinha de enforcado, lifts vines onto high pergolas so that grapes must be picked from ladders. On wet ground with limited flat land, training vines overhead keeps fruit away from damp soil and leaves the ground beneath free for another crop — a direct architectural response to the basin's rainfall and its shortage of level parcels.`,
      },
      {
        title: 'The fizz that was a fault',
        content: `The slight effervescence Vinho Verde is known for originally came from malolactic fermentation continuing in the bottle. In winemaking that is normally considered a fault, and producers had to use opaque bottles to conceal the turbidity and sediment it produced — but consumers liked the sparkle. Most producers now add it by carbonation instead.`,
      },
    ],
    mapLayers: ['landcover'],
    visuals: {
      stats: [
        { label: 'Denomination', value: 'Vinho Verde', sublabel: 'DOC' },
        { label: 'Release', value: '3–6 mo', sublabel: 'after harvest' },
        { label: 'Holding size', value: 'Small', sublabel: 'many growers' },
      ],
    },
    references: [REF.vv, REF.pdl],
  },

  risks: {
    id: 'risks',
    title: 'Risks',
    subtitle: 'Fire, drought, and a cross-border blind spot',
    color: '#CC6633',
    icon: 'alert',
    description: 'Fire, drought, and a cross-border blind spot',
    accentColor: '#CC6633',
    intro: `Fire is the dominant recorded hazard in this basin, and it concentrates on exactly the ground that conservation designation is meant to protect.`,
    articles: [
      {
        title: 'Recorded fire history',
        content: `EFFIS burnt-area perimeters for this boundary record at least 49 fires between 2000 and 2026, totalling at least 49,842 hectares. These are lower bounds: EFFIS publishes no queryable feature service, so perimeters are found by sampling on a grid and fires small enough to fall between sample points are missed. The true count is higher; the large fires are all captured.`,
      },
      {
        title: '2016, the worst year',
        content: `2016 accounts for 29,338 of the recorded hectares across 13 separate fires. Four perimeters were mapped on a single day, 8 August 2016: 9,224 ha at Estorãos, 5,720 ha at Soajo, 2,698 ha across Nogueira, Meixedo e Vilar de Murteda, and 942 ha at Cabreiro. A further 3,074 ha burnt at Entrimo, across the Spanish border, on 7 September.`,
      },
      {
        title: 'Fire inside protected land',
        content: `The July 2025 fire at Entre Ambos-os-Rios, Ermida e Germil burnt 7,225 hectares with effectively 100% of its footprint inside Natura 2000. The 2016 Entrimo fire was 95% inside, Soajo 42%, Estorãos 39%. Protection status and fire exposure are not separate maps here.`,
      },
      {
        title: 'Drought',
        content: `The 2021–22 drought drew the Alto Lindoso reservoir low enough to expose a village flooded thirty years earlier. In a basin whose water security depends on upstream storage, that is the clearest single indicator of drought exposure available.`,
      },
      {
        title: 'The blind spot',
        content: `The basin's headwaters are in Galicia, and Portuguese monitoring networks stop at the frontier. Fire, water and weather data for the upper catchment are therefore thinner than for the lower — a gap in the record rather than an absence of risk. The 2016 Entrimo fire, which burnt on the Spanish side, appears here only because EFFIS is a European dataset rather than a national one.`,
      },
    ],
    mapLayers: ['fire', 'flood'],
    visuals: {
      stats: [
        { label: 'Recorded fires', value: '49+', sublabel: 'since 2000', color: '#CC6633' },
        { label: 'Area burnt', value: '49,842+', sublabel: 'hectares' },
        { label: 'Worst year', value: '2016', sublabel: '29,338 ha' },
        { label: 'Largest fire', value: '9,224 ha', sublabel: 'Estorãos, Aug 2016' },
      ],
    },
    references: [REF.effis, REF.lima, REF.icnf],
  },

  fires: {
    id: 'fires',
    title: 'Fire',
    subtitle: 'Twenty-five years of burnt ground, and where it burned',
    color: '#CC6633',
    icon: 'alert',
    description: 'Twenty-five years of burnt ground, and where it burned',
    accentColor: '#CC6633',
    intro: `Fire is the best-recorded hazard in this basin and the one that has reshaped most ground. The table below is drawn from EFFIS burnt-area perimeters — the European mapping of where fire actually reached, rather than where a satellite detected heat — for the boundary used throughout this wiki.`,
    articles: [
      {
        title: 'What this records, and what it misses',
        content: `EFFIS maps the perimeter of a burnt area after the fact, which is a different thing from a live thermal detection: it is what burned, not what was burning. The figures here are a lower bound. EFFIS publishes no queryable feature service, so perimeters are found by sampling across a grid, and a fire small enough to fall between sample points is missed entirely. Large fires are all captured; the count of small ones is not complete.`,
      },
      {
        title: 'Fire and protected land are the same map',
        content: `The share of each fire falling inside Natura 2000 is shown alongside its size, because in this basin the two are not independent. The largest fires of the last decade have burned through the Peneda-Gerês uplands, and conservation designation has not kept fire out of them. A fire that is 100% inside protected territory is not an anomaly here.`,
      },
      {
        title: 'The border cuts the record, not the fire',
        content: `Some perimeters listed here lie on the Spanish side of the basin. They appear because EFFIS is a European dataset; Portuguese national fire statistics would not include them, even though the ground they burned drains into the same river. Where a fire is recorded outside Portugal it is marked.`,
      },
    ],
    mapLayers: ['fire'],
    visuals: {},
    references: [REF.effis, REF.icnf, REF.pnpg],
  },

  culture: {
    id: 'culture',
    title: 'Culture',
    subtitle: 'The oldest vila in Portugal, and a road to Santiago',
    color: '#B8860B',
    icon: 'people',
    description: 'The oldest vila in Portugal, and a road to Santiago',
    accentColor: '#B8860B',
    intro: `The basin has been continuously settled for more than three thousand years, and its principal town holds the oldest municipal charter in Portugal.`,
    articles: [
      {
        title: 'Ponte de Lima',
        content: `Ponte de Lima is the oldest vila — chartered town — in Portugal. It received its first foral on 4 March 1125 from Theresa, Countess of Portugal, and her son Afonso Henriques, who would become the country's first king. It sits on the southern bank of the Lima and takes its name from the medieval bridge across it. The municipality holds 41,164 people across 39 parishes and 320.25 km², though the town itself has roughly 2,800.`,
      },
      {
        title: 'Castros, Romans and the Camino',
        content: `The area has been inhabited for over 3,000 years, with Iron Age castros — hillforts — across the modern municipality, notably at Monte das Santas near the town centre and Monte de Santo Ovídio on the opposite bank. Under Roman occupation the settlement gained importance from the Via XIX of the Antonine Itinerary, the road linking Braga to Santiago de Compostela, Lugo and Astorga. That route was reused in the medieval period and partly coincides with the Camino de Santiago, which still brings pilgrims through the valley.`,
      },
      {
        title: 'Feiras Novas',
        content: `Ponte de Lima's Feiras Novas — the New Fairs — are held annually on the second weekend of September, and the municipal holiday falls on the Tuesday following. Viana do Castelo, at the river mouth, keeps its municipal holiday on 20 August for the festivity of Our Lady of Sorrows, its patron saint.`,
      },
    ],
    mapLayers: ['historic'],
    visuals: {
      stats: [
        { label: 'First charter', value: '1125', sublabel: 'Ponte de Lima', color: '#B8860B' },
        { label: 'Settled for', value: '3,000+', sublabel: 'years' },
        { label: 'Roman road', value: 'Via XIX', sublabel: 'Braga to Astorga' },
      ],
    },
    references: [REF.pdl, REF.vc, REF.cmpdl],
  },

  community: {
    id: 'community',
    title: 'Community',
    subtitle: 'Ten municipalities, no single authority',
    color: '#8B4789',
    icon: 'heart',
    description: 'Ten municipalities, no single authority',
    accentColor: '#8B4789',
    intro: `No one body governs this basin. It is administered by ten Portuguese municipalities, each responsible for its own slice, plus Galician authorities upstream — which makes coordination a standing problem rather than a solved one.`,
    articles: [
      {
        title: 'Who the basin belongs to',
        content: `The mapped boundary crosses Melgaço, Arcos de Valdevez, Ponte da Barca, Vila Verde, Ponte de Lima, Viana do Castelo, Paredes de Coura, Terras de Bouro, Caminha and Monção, and continues into Lobios, Lobeira and Entrimo in Galicia. This list was derived by reverse-geocoding every vertex of the boundary rather than taken from an administrative dataset, so it reflects the outline as drawn.`,
      },
      {
        title: 'The two population centres',
        content: `Viana do Castelo, at the mouth, is a city and district seat of 85,778 people across 30 parishes, chartered in 1258. Ponte de Lima, upriver, holds 41,164 across 39 parishes. Between and above them the basin thins out quickly; roughly 9,000 people live inside the national park in the upper catchment, spread across small villages.`,
      },
      {
        title: 'A landscape people still live in',
        content: `Peneda-Gerês is not wilderness. Its stated aims include preserving the value of existing human resources alongside soil, water, flora and fauna, and the villages inside it are working settlements rather than exhibits. Land management in the upper basin is therefore a question of how people farm and graze, not whether they are present.`,
      },
      {
        title: 'Why this wiki exists',
        content: `This region entered the library because someone drew it. The boundary used throughout was submitted through the public form in June 2026 by Carolina Carvalho, labelled "Bacia do Lima (rough outline)". It is a watershed, drawn by hand, by someone who thought it should be described as one place — which is precisely the argument this section is making.`,
      },
    ],
    mapLayers: ['boundaries'],
    visuals: {
      stats: [
        { label: 'Municipalities', value: '10', sublabel: 'Portuguese', color: '#8B4789' },
        { label: 'Viana do Castelo', value: '85,778', sublabel: '2021 census' },
        { label: 'Ponte de Lima', value: '41,164', sublabel: '2021 census' },
        { label: 'In the park', value: '~9,000', sublabel: 'upper catchment' },
      ],
    },
    references: [REF.vc, REF.pdl, REF.pnpg, REF.cmvc],
  },
};
