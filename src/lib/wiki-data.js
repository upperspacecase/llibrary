/**
 * Odemira bioregional wiki content — structured data from WIKI_CONTENT.md.
 * 8 sections matching the researched bioregion profile.
 */

// Odemira municipality reference coordinates
export const ODEMIRA = {
  name: 'Odemira',
  country: 'Portugal',
  region: 'Alentejo Litoral',
  center: [37.5967, -8.6400],
  bbox: [37.30, -8.95, 37.85, -8.20], // [south, west, north, east]
  area: 1720.6, // km²
  population: 29538, // 2021 census
  parishes: 13,
  elevation: { min: 0, max: 590 },
  coastline: '110 km (PNSACV)',
};

export const SECTIONS = {
  bioregion: {
    id: 'bioregion',
    title: 'Bioregion Profile',
    subtitle: 'Boundaries, geography, climate & soils',
    icon: '&#127758;',
    color: '#8B6914',
    intro: `Odemira municipality covers 1,720.6 km², making it the largest in Portugal by area. Ecologically, the bioregion is structured around the Mira River basin, from the Santa Clara dam to the estuary at Vila Nova de Milfontes. Much of the coastline falls within the Parque Natural do Sudoeste Alentejano e Costa Vicentina (PNSACV), and the Natura 2000 site "Costa Sudoeste" (PTCON0012) protects 118,267 ha including 47 habitat types and 110 directive species.`,
    articles: [
      {
        title: 'Boundaries & delineation',
        content: `Administratively, the Odemira bioregion coincides with the municipality of Odemira in the district of Beja, Alentejo. The resident population was 29,538 in the 2021 census, rising to about 31,488 by the end of 2022. Ecologically, the bioregion is structured around the Mira River basin, notably the stretch from the Santa Clara dam to the estuary at Vila Nova de Milfontes and the irrigated coastal plain known as the Perímetro de Rega do Mira (Mira Irrigation Perimeter), a 15,200 ha equipped area. At the European scale, most of the coastal and lower valley falls inside the Natura 2000 site "Costa Sudoeste" (PTCON0012), spanning 118,267 ha in the Mediterranean and Marine Atlantic biogeographical regions.`,
      },
      {
        title: 'Geography & topography',
        content: `Odemira's territory grades from a rugged, cliffed Atlantic coastline with dune systems and small estuaries into rolling plateaus and dissected hills inland. The PNSACV coastline includes high cliffs, narrow ravines with intermittent or permanent streams, sandy beaches, dune fields and the estuary of the Mira River. Altitudes range up to about 324 m inland and 156 m on the coastal hills, with the Serra do Cercal forming notable inland ridges. Steeper schist hill slopes inland support montado (cork and holm oak agroforestry), while flatter coastal terraces host the Mira Irrigation Perimeter with intensive horticulture and berries under plastic.`,
      },
      {
        title: 'Climate & hydrology',
        content: `Odemira has a hot-summer Mediterranean climate (Köppen Csa) with strong Atlantic influence: mild, wet winters and hot, dry summers. Annual mean temperature is around 18.9°C, with summer highs above 30°C and winter lows around 6–8°C. Annual rainfall is 550–600 mm, highly seasonal, with most precipitation in November–February. The Mira irrigation scheme, built 1963–1973, serves 12,000 ha via a 38 km main canal and 600 km of secondary canals. However, reservoir storage has dropped to 36–37% of capacity versus historical averages of 76–80%, with sections of the Mira running with virtually no flow between Santa Clara and the estuary.`,
      },
      {
        title: 'Soils & geology',
        content: `Geologically, the coastal PNSACV strip showcases Carboniferous, Triassic and Jurassic formations along the cliffs, overlain by Quaternary beach deposits and dune systems. Inland, schist and grauvacke bedrock forms rolling, erosion-prone slopes with shallow, low-fertility soils — conditions that have favoured extensive agro-silvo-pastoral systems (montado) where tree cover and grazing help stabilise soils. The coastal irrigation zone overlays lighter sandy soils prone to wind erosion and saltwater intrusion if poorly managed.`,
      },
    ],
    mapLayers: ['elevation', 'boundaries'],
  },

  ecology: {
    id: 'ecology',
    title: 'Ecology',
    subtitle: 'Ecosystems, species & ecological dynamics',
    icon: '&#127793;',
    color: '#2E8B57',
    intro: `Odemira's bioregion spans a particularly rich gradient of ecosystems, from coastal cliffs and dunes to montado woodlands and irrigated agricultural mosaics. The Natura 2000 site "Costa Sudoeste" includes 47 habitat types, and botanical inventories record about 750 plant species including at least 12 worldwide endemics. Marine biodiversity within PNSACV counts 1,889 recorded species.`,
    articles: [
      {
        title: 'Ecosystems & habitats',
        content: `Odemira spans coastal cliffs and dunes (with rare cliff-top scrub, dune grasslands, saline steppes), riverine and estuarine systems (Mira estuary wetlands, tidal flats, saltmarshes, riparian forests), montado (semi-natural cork/holm oak woodlands with understorey pastures — a man-made but biodiversity-rich ecosystem emblematic of Alentejo), shrublands and heathlands on poorer soils, and agricultural mosaics ranging from dryland cereals and olive groves to intensive greenhouse berries within the Mira irrigation perimeter.`,
      },
      {
        title: 'Flora & fauna',
        content: `Botanical inventories for the PNSACV area record about 750 plant species, including at least 12 worldwide endemics concentrated on coastal cliffs and dunes — endemic Armeria and Astragalus species adapted to salt spray and wind. The park hosts around 200 bird species, about 26 breeding on cliffs including seabirds and raptors. Mammals include otter (Lutra lutra) along the entire coast, plus mustelids, genets, mongooses and wildcats. Montado supports nearly 400 vertebrate species and around 140 aromatic/medicinal plants. A marine biodiversity review reports 1,889 species with at least 38 having conservation status.`,
      },
      {
        title: 'Endangered & protected species',
        content: `The Natura 2000 Costa Sudoeste site protects 110 species under the Birds and Habitats Directives, including cliff-breeding raptors and seabirds, endemic cliff/dune flora with narrow ranges, and otter dependent on intact coastal and riverine habitats. Cork oak (Quercus suber) is legally protected — Portugal holds about 720,000 ha, most in Alentejo. Montado is recognised as a priority habitat (Habitat 6310) under Natura 2000. At least 17 non-indigenous marine species have been identified in PNSACV waters, underscoring bio-invasion risks.`,
      },
      {
        title: 'Ecological dynamics',
        content: `Key ecological dynamics include fire regimes (montado historically helped reduce large fire risk through dispersed trees and grazing), hydrological connectivity (Mira corridors provide key connectivity for fish, amphibians, mammals and birds — threatened by water abstraction), soil and dune dynamics (vegetation stabilises dunes; agriculture and tourism destabilise), and agro-ecological dynamics where traditional extensive grazing maintains open woodland structure and diversity, while intensification or abandonment reduces resilience.`,
      },
    ],
    mapLayers: ['biodiversity', 'protected'],
  },

  landuse: {
    id: 'landuse',
    title: 'Land Use',
    subtitle: 'Historical patterns, current use & pressures',
    icon: '&#127806;',
    color: '#6B8E23',
    intro: `Odemira's agricultural story is one of dramatic transformation. Traditional dryland farming, montado and pastoralism dominated for centuries. The construction of the Mira irrigation scheme in the 1960s–70s was a turning point, and since the 2000s, greenhouse berry production has expanded rapidly — the area of covered crops almost tripled between 2013 and 2021, transforming the landscape, economy and demographics.`,
    articles: [
      {
        title: 'Historical land use',
        content: `Historically, Odemira was characterised by extensive dryland cereals, olive groves, pastoralism and large estates with montado systems. The Mira irrigation scheme (built 1963–73) converted parts of the previously marginal "Charneca de Odemira" into irrigated land. Over recent decades, especially since the 2000s, irrigated horticulture and berry production (raspberries, blueberries, strawberries) in greenhouses have expanded rapidly within the perimeter, overlapping with the PNSACV protected area.`,
      },
      {
        title: 'Current patterns',
        content: `Inland and upland areas are dominated by montado, shrublands, pastures and some eucalyptus plantations supporting extensive livestock and cork production. The coastal irrigation zone (Perímetro de Rega do Mira) covers approximately 12,000 ha with dense mosaic of intensive horticulture, berry plantations and ornamental plants, much under greenhouses. Government resolutions allow up to 40% of the irrigation area (c. 4,800 ha) to be covered with greenhouses, compared to existing ~1,253 ha — permitting a potential quadrupling. Urban and tourism nodes include Vila Nova de Milfontes, Zambujeira do Mar, Almograve, and São Teotónio.`,
      },
      {
        title: 'Zoning & planning',
        content: `The municipality's PDM (Plano Diretor Municipal) is the core legal instrument for land-use zoning, establishing categories such as urban, agricultural, forest and protected areas, and defining building indices and minimum parcel sizes. Coastal zones within PNSACV face additional constraints. A special regime (RCM 179/2019) sets specific rules for greenhouse coverage, water use and worker accommodation within the irrigation perimeter, though this regime has been strongly contested by local movements for enabling excessive intensification in a protected area.`,
      },
      {
        title: 'Pressures & trends',
        content: `Major pressures include agricultural intensification (rapid expansion of plastic greenhouses for berries with associated water use, pesticide inputs and landscape fragmentation), water-driven land-use conflict (scarcity at Santa Clara reservoir with rationing and exclusion of small users while large farms lobby for high allocations), tourism and coastal development along the coast, and land abandonment in some inland parishes leading to shrub encroachment, altered fire regimes and loss of traditional mosaic landscapes.`,
      },
    ],
    mapLayers: ['landcover', 'agriculture'],
  },

  cultural: {
    id: 'cultural',
    title: 'Cultural',
    subtitle: 'History, communities, traditions & knowledge',
    icon: '&#128220;',
    color: '#B8860B',
    intro: `Odemira's human history mirrors broader southwest Iberian trajectories: prehistoric occupation, Roman settlement, medieval consolidation, and centuries of agrarian estates. The montado landscape is the product of centuries of human management. Since the 1990s–2000s, integration into EU agricultural markets has driven a shift toward export-oriented horticulture, reshaping demographic and social patterns — the 2021 census recorded 5,623 residents born in Asia & Oceania.`,
    articles: [
      {
        title: 'Historical overview',
        content: `By the 20th century, large estates and extensive land uses dominated, with low population densities and limited industrialisation. The mid-century construction of the Mira irrigation scheme and later the designation of PNSACV added new layers of agrarian modernization and environmental regulation. Since the 1990s–2000s, integration into EU agricultural markets has driven a shift toward export-oriented horticulture and berries, reshaping demographic and social patterns fundamentally.`,
      },
      {
        title: 'Communities & demographics',
        content: `Odemira's population grew from about 26,066 in 2011 to 29,538 in 2021, with significant parish-level variation: coastal and irrigation-zone parishes like São Teotónio and Vila Nova de Milfontes have grown strongly, while inland parishes have declined. In 2021, of 29,538 residents, 5,623 were born in Asia & Oceania (vs 20,946 in Portugal), indicating a large South and Southeast Asian migrant workforce in agriculture — more than 10,000 migrant workers are employed in Portugal's berry industry, with Odemira as a key hub.`,
      },
      {
        title: 'Traditions & cultural landscapes',
        content: `Alentejo culture is deeply expressed in Odemira's montado landscapes, traditional pastoralism, cork harvesting, and rural architecture (whitewashed villages, montes, stone terraces). Cork oak forests have been managed for cork, acorns and grazing for centuries and are celebrated in regional identity, music and cuisine. Coastal fishing communities have their own traditions linked to the sea, river and seasonal work cycles. Cultural landscapes — terraced fields overlooking cliffs, old irrigation channels, small-scale orchards — coexist uneasily with large export-oriented greenhouses.`,
      },
      {
        title: 'Local knowledge systems',
        content: `Traditional ecological knowledge (TEK) persists among older farmers and shepherds: water harvesting (cisterns, wells) and careful rainfall use, grazing regimes that avoid overuse of fragile soils, fire use and avoidance in montado systems. However, much of the new intensive agriculture is driven by external capital and agronomic models with limited TEK integration. Citizen movements and regenerative initiatives represent attempts to blend tradition with agroecology and restoration science.`,
      },
    ],
    mapLayers: ['places', 'historic'],
  },

  intelligence: {
    id: 'intelligence',
    title: 'Land Intelligence',
    subtitle: 'Data, GIS layers & spatial analysis',
    icon: '&#128752;',
    color: '#4682B4',
    intro: `Key spatial datasets relevant to the Odemira bioregion include CORINE Land Cover (1990–2018), Natura 2000 boundaries (PTCON0012 "Costa Sudoeste"), PDM planning maps, Mira Irrigation Perimeter boundaries and canal networks, and elevation models from Copernicus. These support analyses of land-cover change, habitat fragmentation, zoning conflicts and suitability mapping.`,
    articles: [
      {
        title: 'GIS layers & spatial datasets',
        content: `Key spatial datasets include: CORINE Land Cover datasets (1990–2018) from Copernicus providing 44 land-cover classes and change layers; Natura 2000 site PTCON0012 boundaries with habitat and species tables; PNSACV boundary and internal zoning from ICNF management plans; Odemira PDM zoning maps and urban plans; ABM technical data on the Mira Irrigation Perimeter including canal network and equipped areas; and EU-DEM elevation models enabling slope and aspect mapping. The municipal hydrography map covers all rivers and streams.`,
      },
      {
        title: 'Remote sensing & land-cover change',
        content: `National CORINE statistics show shifts from forest to agro-forestry and heterogeneous agricultural categories. Local analyses indicate rapid expansion of greenhouse and plastic-covered crops in the Mira perimeter — citizen estimates suggest covered area almost tripled between 2013 and 2021, visible in Sentinel-2 and Landsat imagery as bright plastic rectangles. Water consumption per hectare in the perimeter rose sharply after 2014, linked to high-density greenhouse production. Systematic classification of greenhouse expansion, NDVI time-series and coastline erosion mapping could be undertaken using Copernicus data.`,
      },
      {
        title: 'Socioeconomic & ownership data',
        content: `Municipality-level statistics from INE and CityPopulation provide demographic data, but fine-scale land ownership is not openly accessible. Key patterns: large agro-industrial enterprises (often foreign capital) lease or own significant tracts in the irrigation perimeter for export berries; many small Portuguese landowners rely on limited water allocations; thousands of migrant workers live in precarious housing on or adjacent to agricultural land. Industrial-scale agriculture now represents over 60% of local economic activity in parts of the coastal strip.`,
      },
      {
        title: 'Tools & platforms',
        content: `Relevant tools include: Natura 2000 map viewer for PTCON0012 queries; Copernicus Land Monitoring Service for downloadable CLC and high-resolution layers; Odemira municipal portal for PDM regulation and zoning maps; ICNF portals for park management plans and biodiversity syntheses; and climate data services (Meteoblue, NearWeather) for downscaled climate normals and historical simulations. These enable integrated analysis of land-cover change, conservation status, planning conflicts and restoration opportunities.`,
      },
    ],
    mapLayers: ['landcover', 'boundaries'],
  },

  planning: {
    id: 'planning',
    title: 'Planning & Management',
    subtitle: 'Governance, policies & conservation',
    icon: '&#9878;',
    color: '#4A708B',
    intro: `Understanding how land is governed in Odemira means navigating layers of Portuguese and EU regulation: the PDM municipal plan, national protections (REN, RAN), EU Natura 2000 designations, and the PNSACV Natural Park authority (ICNF). A particularly contentious regulation is RCM 179/2019, which created a special regime allowing greenhouse expansion within the protected area.`,
    articles: [
      {
        title: 'Governance & institutions',
        content: `Key institutions include: Municipality of Odemira (PDM, local infrastructure, climate initiatives); ICNF (manages PNSACV as part of the national protected-areas network); APA (water resources including Santa Clara reservoir and Mira basin management — took over from ABM in 2023); and regional bodies (DGT, CCDR Alentejo) influencing planning and enforcement. Co-management models for PNSACV were reinforced by recent legislation, giving municipalities a formal role.`,
      },
      {
        title: 'Policies & regulations',
        content: `Several policy regimes intersect: EU Common Agricultural Policy (CAP), Natura 2000 / Habitats and Birds Directives requiring conservation of habitats and species, Water Framework Directive requiring good ecological status, and national planning framework (RJIGT) mandating PDMs. The 2019 RCM 179/2019 created a special transitional regime allowing plastic-covered agriculture to expand up to 40% of the 12,000 ha perimeter (~4,800 ha) and authorising container settlements for up to 36,000 additional workers — widely criticised as incompatible with protected-area goals.`,
      },
      {
        title: 'Protected & conservation areas',
        content: `Core designations: PNSACV (created 1995 from a Protected Landscape established 1988; ~89,425 ha total — 60,567 ha terrestrial, 28,858 ha marine, spanning Sines, Odemira, Aljezur and Vila do Bispo) and Natura 2000 site PTCON0012 "Costa Sudoeste" (118,267 ha protecting 47 habitats and 110 species). The ZPE (Special Protection Zone) Costa Sudoeste covers much of the same area with emphasis on bird conservation. Park and Natura 2000 regulations constrain construction and agricultural intensification, but enforcement remains contentious.`,
      },
      {
        title: 'Restoration & sustainable projects',
        content: `Active restoration projects include: MARSW project synthesising marine biodiversity across PNSACV; A Quinta da Lage, a regenerative eco-farm applying keyline design, holistic grazing and soil restoration; Regenerativa – Cooperativa Integral, a platform for ecological and social regeneration supporting agroforestry and local food systems. The municipality is also engaged in EU projects such as Phoenix Horizon, co-creating a local Agenda 2030-aligned climate action plan with community participation.`,
      },
    ],
    mapLayers: ['governance', 'protected'],
  },

  threats: {
    id: 'threats',
    title: 'Threats & Resilience',
    subtitle: 'Climate, water & environmental challenges',
    icon: '&#9888;',
    color: '#CC6633',
    intro: `Water scarcity is perhaps the most acute and visible threat: Santa Clara reservoir has fallen to 36–37% of capacity. Climate projections indicate rising temperatures, more frequent droughts and higher wildfire risk. Intensive agriculture has driven a "sea of plastic" along ~40 km of coast, while social and cultural erosion strains community cohesion. Emerging responses include water governance negotiations and regenerative agriculture initiatives.`,
    articles: [
      {
        title: 'Climate change impacts',
        content: `Climate projections for Alentejo show rising temperatures, more frequent heatwaves, decreasing and more variable rainfall with longer, more intense droughts, and increased fire risk. In Odemira, these intersect with water scarcity in the Mira basin (reservoir at half historical capacity), stress on rain-fed montado where water scarcity reduces tree vitality and pasture productivity, and elevated wildfire risk on shrub-encroached and plantation areas. Marine and coastal systems face additional risks from sea-level rise and warming.`,
      },
      {
        title: 'Water scarcity & hydrological stress',
        content: `Storage in Santa Clara reservoir has fallen to 36–37% of capacity versus historical averages of 76–80%. Sections of the Mira between dam and estuary have been reported with no surface flow — described as ecological "agony." The Beneficiaries' Association began rationing water; 100–150 small property owners classified as "precários" risk losing access. Traditional wells are drying up, and numerous unregulated boreholes contribute to aquifer depletion. In 2023, APA removed ABM's management of irrigation due to conflicts over water allocation.`,
      },
      {
        title: 'Environmental threats',
        content: `Heavy use of plastics, agrochemicals and intensive cultivation in the irrigation perimeter threatens soils, habitats and water quality — citizen movements describe a "mar de plástico" (sea of plastic) along ~40 km of coast. Large greenhouse blocks, roads and container settlements fragment habitats within the protected area. At least 17 non-indigenous marine species have been identified in PNSACV waters. Rapid demographic change and precarious labour conditions strain social cohesion and governance capacity.`,
      },
      {
        title: 'Adaptation & resilience',
        content: `Emerging responses include: negotiation of a "pacto da água" among the municipality, APA and agricultural authorities to balance supply, irrigation and ecological needs; calls for a moratorium on new greenhouses ("nem mais um metro de estufa"); new co-management structures for PNSACV; EU-funded climate-action planning (Phoenix Horizon); and nature-based solutions from regenerative farms and cooperatives implementing keyline water management, agroforestry and community food systems that enhance soil water-holding capacity, biodiversity and food resilience.`,
      },
    ],
    mapLayers: ['fire', 'water'],
  },

  community: {
    id: 'community',
    title: 'Community',
    subtitle: 'Initiatives, citizen science & collaboration',
    icon: '&#128101;',
    color: '#8B4789',
    intro: `Several community-driven and regenerative initiatives illustrate alternative trajectories for Odemira. Citizen movements (Juntos pelo Sudoeste, SOS Rio Mira) function as de facto monitoring networks, collecting data on greenhouse expansion and water scarcity. Regenerative cooperatives and eco-farms demonstrate practical pathways for ecological and social regeneration. This section is open for community contributions — share your stories, tips, events and resources.`,
    articles: [
      {
        title: 'Regenerativa – Cooperativa Integral',
        content: `A cooperative platform founded in 2022 in São Luís, dedicated to ecological, economic, social and cultural regeneration. Hosts the "Odemira Local Food System" (short supply chains connecting producers and consumers), a "Web of Entrepreneurs" network, and Espaço Nativa (a multi-use space with grocery, café, events, coworking). Involves around 180 collaborators and about 30 entrepreneurial initiatives in agroforestry, education and culture.`,
      },
      {
        title: 'A Quinta da Lage',
        content: `A regenerative eco-farm in the coastal natural park applying water harvesting, keyline design, holistic grazing, agroforestry and no-till gardening to restore land and soils. Functions as an educational hub offering courses on regenerative agriculture, eco-construction, landscape restoration and local food security, aiming to demonstrate practical pathways to reverse soil erosion and desertification.`,
      },
      {
        title: 'Citizen science & monitoring',
        content: `Local movements function as de facto monitoring and advocacy networks: Juntos pelo Sudoeste (JPS) has collected data on greenhouse area expansion and rainfall trends; SOS Rio Mira highlights ecological degradation and water scarcity in the Mira. These groups have submitted petitions to parliament, complaints to the EU, and public commentaries that compile and interpret official datasets, democratising environmental information. There is an opportunity to formalise these into structured citizen-science programmes.`,
      },
      {
        title: 'Stakeholder landscape & future visions',
        content: `Key stakeholders include small and medium local farmers, large agro-industrial enterprises, thousands of migrant agricultural workers (mainly from South Asia), environmental NGOs and citizen movements (JPS, SOS Rio Mira), municipal/national authorities (ICNF, APA), tourism actors, and regenerative cooperatives. Emerging visions include the municipality's Plano Estratégico de Valorização do Rio Mira for integrated catchment management, and citizen petitions warning that water-intensive, plastic-driven agriculture within a protected bioregion is ecologically and socially unsustainable.`,
      },
    ],
    mapLayers: ['places', 'infrastructure'],
  },
};

// Calendar events for Odemira region
export const EVENTS_CALENDAR = [
  { month: 'March', name: 'Festa das Flores', location: 'São Teotónio', type: 'festival' },
  { month: 'May', name: 'Feira Medieval', location: 'Odemira', type: 'cultural' },
  { month: 'June', name: 'Festas de São João', location: 'Various', type: 'traditional' },
  { month: 'July', name: 'Festival Terras sem Sombra', location: 'Various', type: 'music' },
  { month: 'August', name: 'Festival Sudoeste', location: 'Zambujeira do Mar', type: 'music' },
  { month: 'August', name: 'Festa da Espiga', location: 'Relíquias', type: 'traditional' },
  { month: 'September', name: 'Feira de Castro', location: 'Odemira', type: 'fair' },
  { month: 'October', name: 'Festival da Castanha', location: 'Sabóia', type: 'food' },
  { month: 'November', name: 'Festival de Sopas', location: 'Odemira', type: 'food' },
  { month: 'December', name: 'Mercado de Natal', location: 'Vila Nova de Milfontes', type: 'market' },
];

// Key landmarks and places
export const LANDMARKS = [
  { name: 'Vila Nova de Milfontes', type: 'town', coords: [37.7268, -8.7828], pop: 4000, desc: 'Coastal town at the mouth of the Mira river. Tourism hub.' },
  { name: 'Odemira', type: 'town', coords: [37.5967, -8.6400], pop: 5500, desc: 'Municipal capital. Administrative center on the Mira river.' },
  { name: 'São Teotónio', type: 'town', coords: [37.5178, -8.7389], pop: 3500, desc: 'Agricultural hub. Center of greenhouse agriculture.' },
  { name: 'Zambujeira do Mar', type: 'village', coords: [37.5247, -8.7867], pop: 800, desc: 'Cliff-top fishing village. Home to Festival Sudoeste.' },
  { name: 'Santa Clara-a-Velha', type: 'village', coords: [37.5100, -8.4378], pop: 1200, desc: 'Reservoir village. Gateway to inland Odemira.' },
  { name: 'Sabóia', type: 'village', coords: [37.4903, -8.5461], pop: 900, desc: 'Interior village known for chestnut festival.' },
  { name: 'São Luís', type: 'village', coords: [37.5850, -8.6150], pop: 700, desc: 'Home to Regenerativa Cooperativa Integral.' },
  { name: 'Barragem de Santa Clara', type: 'landmark', coords: [37.4900, -8.4400], desc: 'Major reservoir supplying irrigation and drinking water to the Mira perimeter.' },
  { name: 'Praia de Almograve', type: 'beach', coords: [37.6500, -8.8000], desc: 'Wild beach backed by dramatic schist cliffs.' },
  { name: 'A Quinta da Lage', type: 'farm', coords: [37.55, -8.78], desc: 'Regenerative eco-farm in the coastal natural park.' },
];

export function getSectionById(id) {
  return SECTIONS[id] || null;
}

export function getAllSections() {
  return Object.values(SECTIONS);
}
