/**
 * Odemira bioregional wiki content — structured data from WIKI_CONTENT.md.
 * 10 sections matching the researched bioregion profile.
 */

// Odemira municipality reference coordinates
export const ODEMIRA = {
  name: 'Odemira',
  subtitle: 'Southwest Alentejo, Portugal',
  country: 'Portugal',
  region: 'Alentejo Litoral',
  center: [37.5967, -8.6400],
  bbox: [37.30, -8.95, 37.85, -8.20], // [south, west, north, east]
  area: 1720.6, // km²
  population: 31488, // ~end of 2022
  parishes: 13,
  elevation: { min: 0, max: 590 },
  coastline: '110 km (PNSACV)',
};

export const SECTIONS = {
  bioregion: {
    id: 'bioregion',
    title: 'Bioregion Overview',
    subtitle: 'Municipality profile, geography, and key statistics',
    color: '#8B6914',
    icon: 'globe',
    description: 'Municipality profile, geography, and key statistics',
    accentColor: '#8B6914',
    stats: { suggestions: 12, comments: 8, updatedAgo: '3 days ago' },
    intro: `Odemira is a municipality in the Beja District of Portugal's Alentejo region, encompassing approximately 1,720.6 km² (172,929 hectares), making it the largest municipality in Portugal by area. The resident population was 29,538 in the 2021 census, rising to about 31,488 by the end of 2022. The bioregion stretches from the Atlantic coast at Zambujeira do Mar inland to the rolling hills of the Alentejo. Ecologically, it is structured around the Mira River basin, from the Santa Clara dam to the estuary at Vila Nova de Milfontes and the irrigated coastal plain known as the Perímetro de Rega do Mira (Mira Irrigation Perimeter). 44% of the territory falls within the Parque Natural do Sudoeste Alentejano e Costa Vicentina (PNSACV), extending 110 km along the southwest coast.`,
    articles: [
      {
        title: 'Key Facts',
        content: `Area: 1,720.6 km². Population: ~30,000 (growing due to migration). Elevation: 0m (coast) to 590m (interior hills). Protected: 44% under PNSACV. Coastline: 110 km within protected park. At the European scale, the Natura 2000 site "Costa Sudoeste" (PTCON0012) protects 118,266.58 ha across Mediterranean and Marine Atlantic biogeographical regions, safeguarding 110 directive species and 47 habitat types.`,
      },
    ],
    mapLayers: ['elevation', 'boundaries'],
  },

  ecology: {
    id: 'ecology',
    title: 'Ecology',
    subtitle: 'Ecosystems, biodiversity, and ecological dynamics',
    color: '#2E8B57',
    icon: 'leaf',
    description: 'Ecosystems, biodiversity, and ecological dynamics',
    accentColor: '#2E8B57',
    stats: { suggestions: 18, comments: 24, updatedAgo: '1 week ago' },
    intro: `Odemira spans a rich gradient of ecosystems from Atlantic cliffs to Mediterranean woodlands.`,
    articles: [
      {
        title: 'Ecosystems',
        content: `Coastal cliffs and dunes: Rare natural Mediterranean coastal landscape with cliff-top scrub, dune grasslands, saline steppes. Riverine and estuarine systems: Mira estuary wetlands, tidal flats, saltmarshes, riparian forests. Montado: Semi-natural cork and holm oak agroforestry, emblematic of Alentejo. Shrublands and heathlands: Mediterranean flora on poorer soils. Agricultural mosaics: Dryland cereals, olive groves, irrigated horticulture.`,
      },
      {
        title: 'Biodiversity Highlights',
        content: `Flora: ~750 plant species, including 12 worldwide endemics on coastal cliffs. Avifauna: ~200 bird species, 26 breeding on cliffs. Marine: 1,889 species recorded in PNSACV waters (38 with conservation status). Mammals: Otter (Lutra lutra), wildcats, genets, mongooses throughout territory.`,
      },
      {
        title: 'Protected Species',
        content: `The Natura 2000 site protects 110 species under EU directives, including priority plants, cliff-breeding raptors, and the legally protected cork oak (Quercus suber), a priority habitat (6310) recognized since the 16th century.`,
      },
      {
        title: 'Ecological Dynamics',
        content: `Fire regimes: Montado systems historically reduce large fire risk. Hydrological connectivity: River corridors provide key wildlife corridors. Agro-ecological cycles: Traditional grazing maintains open woodland structure.`,
      },
    ],
    mapLayers: ['biodiversity', 'protected'],
  },

  land: {
    id: 'land',
    title: 'Land',
    subtitle: 'Geography, topography, and geology',
    color: '#6B8E23',
    icon: 'mountain',
    description: 'Geography, topography, and geology',
    accentColor: '#6B8E23',
    stats: { suggestions: 7, comments: 5, updatedAgo: '2 weeks ago' },
    intro: `The territory grades from rugged Atlantic coastline to rolling interior plateaus.`,
    articles: [
      {
        title: 'Geography & Topography',
        content: `Coastal Zone: High cliffs (up to 156m), narrow ravines, sandy beaches, dune fields. Mira River estuary with tidal characteristics. Interior: Rolling plateaus and dissected hills (up to 324m at Serra do Cercal). Schist hill slopes supporting montado systems. Flatter coastal terraces hosting irrigation perimeter.`,
      },
      {
        title: 'Geology',
        content: `Coastal: Carboniferous, Triassic, and Jurassic formations overlain by Quaternary beach deposits. Inland: Schist and grauvacke bedrock with erosion-prone slopes.`,
      },
      {
        title: 'Topographic Influence on Land Use',
        content: `Steeper slopes: Montado, shrubland, extensive grazing. Flatter terraces: Intensive irrigated agriculture. Valley corridors: Alluvial agriculture and urban settlement.`,
      },
    ],
    mapLayers: ['elevation', 'boundaries'],
  },

  soil: {
    id: 'soil',
    title: 'Soil',
    subtitle: 'Soil types, management, and agricultural suitability',
    color: '#8B4513',
    icon: 'layers',
    description: 'Soil types, management, and agricultural suitability',
    accentColor: '#8B4513',
    stats: { suggestions: 4, comments: 3, updatedAgo: '1 month ago' },
    intro: `Odemira's soils range from sandy coastal substrates to shallow inland schist soils, each with distinct management needs.`,
    articles: [
      {
        title: 'Coastal Soils',
        content: `Type: Sandy to sandy-clayey substrates. Origin: Quaternary beach deposits, fluvial terraces, dune systems. Risks: Wind erosion, saltwater intrusion if poorly managed.`,
      },
      {
        title: 'Inland Soils',
        content: `Type: Shallow, low-fertility soils on schist/grauvacke. Management: Stabilized by montado tree cover and low-intensity grazing. Function: Tree cover and ground vegetation regulate runoff and prevent erosion.`,
      },
      {
        title: 'Agricultural Soils',
        content: `Irrigation perimeter: Lighter sandy soils supporting intensive cultivation. Montado systems: Mixed agro-forestry with organic matter accumulation from tree litter.`,
      },
      {
        title: 'Data Gaps',
        content: `High-resolution soil maps (texture, depth, organic matter, salinity) and erosion-risk maps for Odemira specifically are not readily available in open sources.`,
      },
    ],
    mapLayers: ['landcover'],
  },

  water: {
    id: 'water',
    title: 'Water',
    subtitle: 'Mira River system, irrigation, and water governance',
    color: '#2B7BB9',
    icon: 'waves',
    description: 'Mira River system, irrigation, and water governance',
    accentColor: '#2B7BB9',
    stats: { suggestions: 32, comments: 41, updatedAgo: '2 days ago' },
    intro: `The Mira River is the hydrological backbone of the bioregion.`,
    articles: [
      {
        title: 'The Mira River System',
        content: `Aproveitamento Hidroagrícola do Mira (built 1963-1973): Equipped area: 15,200 ha. Benefited area: ~12,000 ha effectively irrigated. Infrastructure: 38 km main canal + ~600 km secondary/tertiary network. Coverage: ~41 km coastal strip between Vila Nova de Milfontes and Rogil.`,
      },
      {
        title: 'Current Crisis',
        content: `Reservoir storage: 36-37% of capacity (vs. historical average 76-80%). River flow: Sections between Santa Clara dam and estuary reported with virtually no surface flow. Ecological state: Described by activists as "agony" for the river ecosystem.`,
      },
      {
        title: 'Governance Changes',
        content: `2023 Update: The Ministry of Agriculture removed the Associação de Beneficiários do Mira (ABM) from irrigation management. The Portuguese Environment Agency (APA) now manages water resources directly due to conflicts over allocation between farmers and public supply.`,
      },
      {
        title: 'Water Conflict',
        content: `Rationing: ABM began rationing water for irrigation. At-risk users: 100-150 small property owners classified as "precários" may lose access. Unregulated extraction: Numerous uncontrolled boreholes suspected of contributing to aquifer depletion. Traditional wells: Reported to be drying up.`,
      },
    ],
    mapLayers: ['water'],
  },

  climate: {
    id: 'climate',
    title: 'Climate',
    subtitle: 'Current climate patterns and future projections',
    color: '#E8A317',
    icon: 'sun',
    description: 'Current climate patterns and future projections',
    accentColor: '#E8A317',
    stats: { suggestions: 9, comments: 12, updatedAgo: '1 week ago' },
    intro: `Köppen classification: Csa (hot-summer Mediterranean) with strong Atlantic coastal influence.`,
    articles: [
      {
        title: 'Current Climate',
        content: `Annual mean temperature: ~18.9°C. Summer highs: Above 30°C. Winter lows: 6-8°C. Annual rainfall: 550-600 mm. Seasonality: Highly seasonal, with November-February as wettest months; very dry summers.`,
      },
      {
        title: 'Climate Projections',
        content: `For Alentejo region: Rising temperatures and more frequent heatwaves. Decreasing and more variable rainfall. Longer and more intense droughts. Increased evapotranspiration and elevated wildfire risk.`,
      },
      {
        title: 'Current Stress',
        content: `Climate-driven aridity exacerbates existing summer water scarcity, placing added pressure on the Mira system and rain-fed montado landscapes.`,
      },
    ],
    mapLayers: ['fire'],
  },

  landuse: {
    id: 'landuse',
    title: 'Land Use',
    subtitle: 'Historical trajectory and current land use patterns',
    color: '#6B8E23',
    icon: 'map',
    description: 'Historical trajectory and current land use patterns',
    accentColor: '#6B8E23',
    stats: { suggestions: 15, comments: 19, updatedAgo: '5 days ago' },
    intro: `Historically characterized by extensive dryland cereals, olive groves, pastoralism, and large estates with montado systems. The 1960s-70s Mira irrigation scheme marked a turning point, converting marginal "Charneca de Odemira" into productive agricultural land.`,
    articles: [
      {
        title: 'Current Patterns',
        content: `Inland and Upland: Montado (cork/holm oak agroforestry), shrublands and pastures, some eucalyptus or pine plantations, extensive livestock, cork production, hunting. Coastal Irrigation Zone (Perímetro de Rega do Mira): ~12,000 ha benefited land, intensive horticulture, berry plantations (raspberries, blueberries, strawberries), much under greenhouses or plastic tunnels. Urban/Tourism Nodes: Vila Nova de Milfontes, Zambujeira do Mar, Almograve, Odemira town, São Teotónio.`,
      },
      {
        title: 'Agricultural Intensification',
        content: `Greenhouse expansion: 2013: 438 ha covered crops. 2021: 1,253 ha (satellite data). Potential: Up to 4,800 ha (40% of irrigation perimeter) permitted under RCM 179/2019.`,
      },
      {
        title: 'Pressures',
        content: `Water-driven land-use conflict. Tourism and coastal development. Land abandonment and shrub encroachment (inland). "Mar de plástico" (sea of plastic) along ~40 km of coast.`,
      },
    ],
    mapLayers: ['landcover', 'agriculture'],
  },

  risks: {
    id: 'risks',
    title: 'Risks',
    subtitle: 'Climate impacts, water scarcity, and social pressures',
    color: '#CC6633',
    icon: 'alert',
    description: 'Climate impacts, water scarcity, and social pressures',
    accentColor: '#CC6633',
    stats: { suggestions: 28, comments: 33, updatedAgo: '3 days ago' },
    intro: `Water scarcity is the most acute threat: Santa Clara reservoir has fallen to 36-37% of capacity. Climate projections indicate rising temperatures, more frequent droughts and higher wildfire risk.`,
    articles: [
      {
        title: 'Climate Change Impacts',
        content: `Rising temperatures and heatwaves. Decreasing rainfall variability. Longer droughts. Elevated wildfire risk on shrub-encroached areas.`,
      },
      {
        title: 'Water Scarcity',
        content: `The most acute threat: Reservoir depletion (36-37% capacity). Ecological degradation of Mira River. Competition between agricultural, public supply, and ecological needs.`,
      },
      {
        title: 'Intensive Agriculture',
        content: `Heavy plastic/agrochemical use. Soil degradation and pollution. Habitat fragmentation from large greenhouse blocks. Landscape homogenization.`,
      },
      {
        title: 'Social & Cultural Erosion',
        content: `Rapid demographic change (migrant workforce influx). Precarious labor conditions. Overload of local services (schools, health, social security). Loss of traditional ecological knowledge.`,
      },
      {
        title: 'Adaptation Strategies',
        content: `"Pacto da água": Negotiation between municipality, APA, agricultural authorities. Policy debates: Moratorium on new greenhouses ("nem mais um metro de estufa"). Co-management: New PNSACV governance structures involving municipalities and civil society. Regenerative agriculture: Demonstration farms implementing keyline design, holistic grazing, agroforestry. Climate planning: Phoenix Horizon EU project for participatory climate-action agenda.`,
      },
    ],
    mapLayers: ['fire', 'water'],
  },

  culture: {
    id: 'culture',
    title: 'Culture',
    subtitle: 'Demographics, cultural landscapes, and traditional knowledge',
    color: '#B8860B',
    icon: 'people',
    description: 'Demographics, cultural landscapes, and traditional knowledge',
    accentColor: '#B8860B',
    stats: { suggestions: 11, comments: 14, updatedAgo: '2 weeks ago' },
    intro: `Human history mirrors southwest Iberian trajectories: prehistoric occupation, Roman and medieval settlement, consolidated agrarian estates in early modern period. The montado landscape is centuries of human management transforming Mediterranean woodland into agro-silvo-pastoral systems.`,
    articles: [
      {
        title: 'Demographics & Communities',
        content: `Population Growth: 26,066 (2011) → 29,538 (2021). Unique Demographic Structure: 5,623 residents born in Asia & Oceania (vs. 20,946 in Portugal). 5,787 residents hold Asian & Oceania citizenship. Large South and Southeast Asian migrant workforce in agriculture (>10,000 berry industry workers nationally, Odemira as key hub). Age Structure: Relatively young for rural Portugal. 15-64 years: 22,699. 65+ years: 7,538.`,
      },
      {
        title: 'Cultural Landscapes',
        content: `Montado heritage: Cork harvesting, acorn gathering, traditional pastoralism. Architecture: Whitewashed villages (montes), stone terraces. Coastal fishing: Traditional communities and seasonal work cycles. Alentejo identity: Regional music, cuisine, festivals tied to harvests and cork stripping.`,
      },
      {
        title: 'Traditional Knowledge (TEK)',
        content: `Persisting among older farmers and shepherds: Water harvesting (cisterns, wells) and rainfall conservation. Grazing regimes avoiding fragile soil overuse. Fire use/avoidance practices limiting catastrophic burns.`,
      },
    ],
    mapLayers: ['places', 'historic'],
  },

  community: {
    id: 'community',
    title: 'Community',
    subtitle: 'Regenerative initiatives, citizen science, and stakeholders',
    color: '#8B4789',
    icon: 'heart',
    description: 'Regenerative initiatives, citizen science, and stakeholders',
    accentColor: '#8B4789',
    stats: { suggestions: 22, comments: 27, updatedAgo: '4 days ago' },
    intro: `Several community-driven and regenerative initiatives illustrate alternative trajectories for Odemira.`,
    articles: [
      {
        title: 'Regenerativa — Cooperativa Integral (São Luís)',
        content: `Founded 2022, emerging from local movements since 2020. 180 collaborators, ~30 entrepreneurial initiatives. Projects: Odemira Local Food System, Web of Entrepreneurs network, Espaço Nativa (multi-use community space). Focus: Agroforestry regeneration, non-formal education, cultural projects.`,
      },
      {
        title: 'A Quinta da Lage (Coastal Natural Park)',
        content: `Regenerative eco-farm demonstration site. Practices: Keyline water harvesting, holistic grazing, agroforestry, no-till gardening. Educational hub with courses on land restoration and local food security.`,
      },
      {
        title: 'Citizen Science & Advocacy',
        content: `Juntos pelo Sudoeste (JPS): Citizen movement defending the southwest. Data collection on greenhouse area expansion and rainfall trends. Petitions to parliament and EU complaints. SOS Rio Mira: River health advocacy. Public alerts on ecological degradation. Water governance monitoring.`,
      },
      {
        title: 'Stakeholder Landscape',
        content: `Small and medium local farmers (irrigated and rain-fed). Large agro-industrial enterprises (greenhouse operations). Migrant agricultural workers (primarily South Asian). Environmental NGOs and citizen movements. Municipal government, ICNF, APA. Tourism operators. Regenerative cooperatives and agroecological initiatives.`,
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
