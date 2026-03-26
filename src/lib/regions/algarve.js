/**
 * Algarve regional wiki content — structured data.
 * 10 sections matching the researched region profile.
 */

export const REGION = {
  name: 'Algarve',
  subtitle: 'Southern Portugal',
  country: 'Portugal',
  region: 'Algarve',
  center: [37.0194, -7.9304],
  bbox: [36.96, -8.99, 37.53, -7.39], // [south, west, north, east]
  area: 4997, // km²
  population: 467495, // 2021 census
  parishes: 67,
  elevation: { min: 0, max: 902 },
  coastline: '155 km',
};

export const SECTIONS = {
  bioregion: {
    id: 'bioregion',
    title: 'Region Overview',
    subtitle: 'Regional profile, geography, and key statistics',
    color: '#8B6914',
    icon: 'globe',
    description: 'Regional profile, geography, and key statistics',
    accentColor: '#8B6914',
    intro: `The Algarve is the southernmost region of continental Portugal, spanning approximately 4,997 km² across 16 municipalities and 67 parishes. With a 2021 census population of 467,495, it is one of the most tourism-dependent regions in Europe. The landscape divides into three distinct zones: the Litoral (coastal strip), the Barrocal (limestone hills), and the Serra (mountainous interior). The Ria Formosa lagoon system, a Ramsar wetland of international importance, stretches 60 km along the eastern coast. The region's climate, biodiversity, and cultural heritage make it a unique bioregion where Mediterranean and Atlantic influences converge.`,
    articles: [
      {
        title: 'Key Facts',
        content: `Area: 4,997 km². Population: 467,495 (2021 census). Municipalities: 16. Coastline: 155 km. Protected areas: Ria Formosa Natural Park (18,400 ha), Costa Vicentina Natural Park (western coast), Reserva Natural do Sapal de Castro Marim. Climate: Mediterranean (Csa), with over 3,000 hours of sunshine per year. The region accounts for approximately 6% of Portugal's GDP but receives over 30% of international tourist arrivals.`,
      },
    ],
    mapLayers: ['elevation', 'boundaries'],
    visuals: {
      stats: [
        { label: 'Area', value: '4,997', sublabel: 'km²' },
        { label: 'Population', value: '467,495', sublabel: '2021 census' },
        { label: 'Municipalities', value: '16' },
        { label: 'Coastline', value: '155 km', sublabel: 'Atlantic coast' },
      ],
    },
    references: [
      { id: 1, title: 'Algarve — Wikipedia', url: 'https://en.wikipedia.org/wiki/Algarve' },
      { id: 2, title: 'Algarve Region — Visit Algarve', url: 'https://www.visitalgarve.pt/en/' },
      { id: 3, title: 'Ria Formosa — ICNF', url: 'https://www.icnf.pt/conservacao/rnatuam/rnpnriaformosa' },
      { id: 4, title: 'Algarve Census 2021 — INE', url: 'https://www.ine.pt/' },
    ],
  },

  ecology: {
    id: 'ecology',
    title: 'Ecology',
    subtitle: 'Ecosystems, biodiversity, and ecological dynamics',
    color: '#2E8B57',
    icon: 'leaf',
    description: 'Ecosystems, biodiversity, and ecological dynamics',
    accentColor: '#2E8B57',
    intro: `The Algarve supports exceptional biodiversity across its coastal, wetland, and inland ecosystems. The Ria Formosa lagoon is one of Europe's most important bird habitats.`,
    articles: [
      {
        title: 'Ecosystems',
        content: `Coastal cliffs and caves: Iconic limestone formations along the south coast, including the Benagil sea cave. Ria Formosa lagoon: 60 km barrier island system with salt marshes, tidal flats, and seagrass meadows. Barrocal: Mediterranean scrubland and carob/almond orchards on limestone substrate. Serra: Cork oak montado, eucalyptus plantations, and remnant Mediterranean woodland in the Monchique and Caldeirao ranges.`,
      },
      {
        title: 'Biodiversity Highlights',
        content: `Flora: Over 1,200 plant species, including Iberian endemics. Avifauna: 200+ bird species in Ria Formosa alone, including purple gallinule (Porphyrio porphyrio) and greater flamingo. Marine: Seahorse populations (Hippocampus guttulatus and H. hippocampus) in Ria Formosa — one of the largest in the world. Mammals: Iberian lynx reintroduction areas in eastern Algarve (Guadiana valley).`,
      },
      {
        title: 'Protected Areas',
        content: `Ria Formosa Natural Park: 18,400 ha Ramsar wetland. Parque Natural do Sudoeste Alentejano e Costa Vicentina: Extends into western Algarve. Reserva Natural do Sapal de Castro Marim: Salt marshes on the Spanish border. Natura 2000: Multiple SCI and SPA sites across the region.`,
      },
    ],
    mapLayers: ['biodiversity', 'protected'],
    visuals: {
      stats: [
        { label: 'Plant Species', value: '1,200+', color: '#2E8B57' },
        { label: 'Bird Species', value: '200+', sublabel: 'Ria Formosa' },
        { label: 'Seahorse Species', value: '2', sublabel: 'Globally significant' },
        { label: 'Protected Areas', value: '3', sublabel: 'Major reserves' },
      ],
      charts: [{
        type: 'pie',
        title: 'Ecosystem Distribution',
        data: [
          { name: 'Serra (montado/woodland)', value: 35, color: '#2d5a3d' },
          { name: 'Barrocal (scrubland)', value: 25, color: '#8b9a46' },
          { name: 'Litoral (coastal)', value: 20, color: '#4a90a4' },
          { name: 'Wetlands/Lagoons', value: 10, color: '#2B7BB9' },
          { name: 'Agriculture', value: 10, color: '#d4a574' },
        ],
      }],
    },
    references: [
      { id: 3, title: 'Ria Formosa — ICNF', url: 'https://www.icnf.pt/conservacao/rnatuam/rnpnriaformosa' },
      { id: 5, title: 'Ria Formosa — Ramsar', url: 'https://rsis.ramsar.org/ris/212' },
      { id: 6, title: 'Seahorses of Ria Formosa — Project Seahorse', url: 'https://www.projectseahorse.org/' },
      { id: 7, title: 'Iberian Lynx Recovery — LIFE Lynx Connect', url: 'https://www.lifelynxconnect.eu/' },
    ],
  },

  land: {
    id: 'land',
    title: 'Land',
    subtitle: 'Geography, topography, and geology',
    color: '#6B8E23',
    icon: 'mountain',
    description: 'Geography, topography, and geology',
    accentColor: '#6B8E23',
    intro: `The Algarve divides into three distinct geomorphological zones running east-west: the Litoral, the Barrocal, and the Serra.`,
    articles: [
      {
        title: 'The Three Zones',
        content: `Litoral (coastal strip): Low-lying plains and cliffs. Sandy beaches in the west, limestone cliffs and caves centrally, barrier islands and lagoons in the east. Width: 3-10 km. Barrocal (limestone hills): Rolling hills of Jurassic and Cretaceous limestone at 100-400m elevation. Traditional agricultural heartland with fertile terra rossa soils. Serra (mountains): Paleozoic schist and greywacke hills rising to 902m at Foia (Serra de Monchique). Sparsely populated, cork oak dominated.`,
      },
      {
        title: 'Geology',
        content: `Western Algarve: Paleozoic schist (same formation as southwest Alentejo). Central/Eastern: Mesozoic limestone and dolomite (karst landscape with caves, sinkholes). Coastal: Miocene sandstone cliffs, Quaternary dune and alluvial deposits. Monchique: Unique syenite intrusion creating an alkaline island in the schist.`,
      },
      {
        title: 'Notable Features',
        content: `Benagil Cave: Iconic sea cave in limestone cliffs. Ria Formosa: 60 km barrier island lagoon system. Serra de Monchique: Highest point at Foia (902m). Guadiana River: Eastern border with Spain, major river system.`,
      },
    ],
    mapLayers: ['elevation', 'boundaries'],
    visuals: {
      stats: [
        { label: 'Elevation', value: '0-902m', sublabel: 'Coast to Foia' },
        { label: 'Area', value: '4,997', sublabel: 'km²' },
        { label: 'Municipalities', value: '16' },
        { label: 'Highest Point', value: '902m', sublabel: 'Foia, Monchique' },
      ],
      infoGrid: {
        title: 'Geomorphological Zones',
        rows: [
          { label: 'Litoral', value: 'Coastal plains and cliffs, 0-50m' },
          { label: 'Barrocal', value: 'Limestone hills, 100-400m' },
          { label: 'Serra', value: 'Schist mountains, up to 902m' },
          { label: 'Bedrock', value: 'Schist, limestone, syenite' },
        ],
      },
    },
    references: [
      { id: 1, title: 'Algarve — Wikipedia', url: 'https://en.wikipedia.org/wiki/Algarve' },
      { id: 8, title: 'Geology of the Algarve — Universidade do Algarve', url: 'https://www.ualg.pt/' },
      { id: 9, title: 'Serra de Monchique — ICNF', url: 'https://www.icnf.pt/' },
    ],
  },

  soil: {
    id: 'soil',
    title: 'Soil',
    subtitle: 'Soil types, management, and agricultural suitability',
    color: '#8B4513',
    icon: 'layers',
    description: 'Soil types, management, and agricultural suitability',
    accentColor: '#8B4513',
    intro: `The Algarve's soils reflect its three-zone geography: sandy coastal soils, fertile terra rossa on limestone, and thin schist soils in the Serra.`,
    articles: [
      {
        title: 'Barrocal Soils',
        content: `Type: Terra rossa (red Mediterranean soils) on limestone. Characteristics: Well-drained, moderately fertile, pH 7-8 (alkaline). Suitability: Traditional carob, almond, fig, and olive orchards. These are the most productive agricultural soils in the region.`,
      },
      {
        title: 'Serra Soils',
        content: `Type: Thin lithosols on schist and greywacke. Characteristics: Shallow, acidic (pH 5-6), poor in nutrients, high erosion risk. Management: Stabilized by cork oak cover and traditional agro-silvo-pastoral systems. Degraded rapidly when tree cover is removed.`,
      },
      {
        title: 'Coastal Soils',
        content: `Type: Sandy podzols, alluvial soils, and saline soils near estuaries. Characteristics: Low organic matter, fast-draining. Risks: Saltwater intrusion along the coast, compaction from tourism development.`,
      },
      {
        title: 'Erosion & Degradation',
        content: `Post-fire erosion is a major concern, especially in the Serra after the 2018 Monchique wildfire (27,000 ha). Desertification risk is classified as high across much of interior Algarve by the National Programme to Combat Desertification (PANCD).`,
      },
    ],
    mapLayers: ['landcover'],
    visuals: {
      stats: [
        { label: 'Soil Types', value: '3', sublabel: 'Major groups' },
        { label: 'pH Range', value: '5-8', sublabel: 'Acidic to alkaline' },
        { label: 'Erosion Risk', value: 'High', sublabel: 'Serra post-fire', color: '#CC6633' },
        { label: 'Desertification', value: 'High risk', sublabel: 'Interior zones', color: '#dc2626' },
      ],
      charts: [{
        type: 'pie',
        title: 'Soil Type Distribution',
        data: [
          { name: 'Terra Rossa (Barrocal)', value: 30, color: '#c4503a' },
          { name: 'Lithosol (Serra)', value: 35, color: '#8b7355' },
          { name: 'Sandy (Coastal)', value: 20, color: '#E8D8B8' },
          { name: 'Alluvial (River)', value: 15, color: '#c4b5a0' },
        ],
      }],
    },
    references: [
      { id: 10, title: 'PANCD — Desertification in Portugal', url: 'https://www.icnf.pt/florestas/desertificacao' },
      { id: 11, title: 'Monchique Fire 2018 — EFFIS', url: 'https://effis.jrc.ec.europa.eu/' },
    ],
  },

  water: {
    id: 'water',
    title: 'Water',
    subtitle: 'River systems, aquifers, and water governance',
    color: '#2B7BB9',
    icon: 'waves',
    description: 'River systems, aquifers, and water governance',
    accentColor: '#2B7BB9',
    intro: `Water is the defining challenge of the Algarve. The region depends heavily on surface reservoirs and groundwater aquifers that face increasing pressure from tourism, agriculture, and climate change.`,
    articles: [
      {
        title: 'River Systems & Reservoirs',
        content: `Major rivers: Arade, Gilao, Guadiana (border with Spain). Key reservoirs: Odelouca (157 hm3, primary water supply), Funcho (47 hm3), Bravura (35 hm3), Beliche (48 hm3). The Odelouca dam, completed in 2012, serves as the main drinking water source for the central Algarve through Aguas do Algarve.`,
      },
      {
        title: 'Groundwater & Aquifers',
        content: `The Barrocal karst aquifer system (Querenca-Silves, 318 km2) is the largest and most important groundwater reserve. Recharge is highly seasonal, dependent on winter rainfall. Coastal aquifers face saltwater intrusion from over-extraction and rising sea levels.`,
      },
      {
        title: 'Water Crisis',
        content: `2023-2024: Severe drought conditions. Odelouca reservoir dropped below 20% capacity. Emergency measures included water transfers from Alqueva (Alentejo) and temporary desalination studies. Agriculture and golf courses face irrigation restrictions. Albufeira desalination plant approved for construction (2025-2027).`,
      },
      {
        title: 'Governance',
        content: `Aguas do Algarve: Regional multi-municipal water utility. APA (Agencia Portuguesa do Ambiente): National water authority. Algarve Intermunicipal Community (AMAL): Regional coordination. EU Water Framework Directive: River basin management plans for Algarve (RH8).`,
      },
    ],
    mapLayers: ['water'],
    visuals: {
      stats: [
        { label: 'Reservoir Storage', value: 'Critical', sublabel: 'Drought conditions', color: '#dc2626' },
        { label: 'Major Reservoirs', value: '4', sublabel: 'Combined ~287 hm3' },
        { label: 'Key Aquifer', value: '318 km2', sublabel: 'Querenca-Silves' },
        { label: 'Desalination', value: 'Planned', sublabel: 'Albufeira, 2025-27' },
      ],
      infoGrid: {
        title: 'Water Infrastructure',
        rows: [
          { label: 'Primary Supply', value: 'Odelouca Dam (157 hm3)' },
          { label: 'Backup', value: 'Funcho + Bravura + Beliche' },
          { label: 'Groundwater', value: 'Querenca-Silves karst aquifer' },
          { label: 'Governance', value: 'Aguas do Algarve / APA' },
          { label: 'Emergency Transfer', value: 'Alqueva (Alentejo)' },
        ],
      },
    },
    references: [
      { id: 12, title: 'Aguas do Algarve', url: 'https://www.aguasdoalgarve.pt/' },
      { id: 13, title: 'Odelouca Dam — APA', url: 'https://www.apambiente.pt/' },
      { id: 14, title: 'Algarve Water Crisis — Observador', url: 'https://observador.pt/' },
      { id: 15, title: 'Querenca-Silves Aquifer — LNEG', url: 'https://www.lneg.pt/' },
    ],
  },

  climate: {
    id: 'climate',
    title: 'Climate',
    subtitle: 'Current climate patterns and future projections',
    color: '#E8A317',
    icon: 'sun',
    description: 'Current climate patterns and future projections',
    accentColor: '#E8A317',
    intro: `The Algarve has a hot-summer Mediterranean climate (Koppen Csa) with over 3,000 hours of sunshine per year, making it one of the sunniest regions in Europe.`,
    articles: [
      {
        title: 'Current Climate',
        content: `Annual mean temperature: ~17.5°C. Summer highs: 28-35°C. Winter lows: 6-10°C. Annual rainfall: 400-800 mm (decreasing west to east, increasing with altitude). Sunshine: 3,000+ hours/year. Dry season: May to September (virtually no rain June-August).`,
      },
      {
        title: 'Climate Projections',
        content: `RCP 8.5 scenarios for 2050: Temperature increase of 1.5-2.5°C. Rainfall reduction of 20-30%. Sea level rise of 0.3-0.6m threatening low-lying coastal areas. Wildfire season extending by 20-40 days. More frequent and intense heatwaves, with potential health impacts on aging population.`,
      },
      {
        title: 'Wildfire',
        content: `The 2018 Monchique fire burned 27,000 ha (the largest single fire in the Algarve's recorded history). Fire risk is highest in the Serra, where eucalyptus plantations and abandoned land create fuel loads. The Algarve is classified as a high fire risk region by ICNF.`,
      },
    ],
    mapLayers: ['fire'],
    visuals: {
      stats: [
        { label: 'Climate Zone', value: 'Csa', sublabel: 'Hot-summer Mediterranean' },
        { label: 'Mean Temperature', value: '17.5°C' },
        { label: 'Annual Rainfall', value: '400-800mm' },
        { label: 'Sunshine', value: '3,000+ hrs', sublabel: 'Per year' },
      ],
      charts: [{
        type: 'area',
        title: 'Seasonal Patterns',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            { label: 'Temperature (°C)', values: [12, 13, 14, 16, 19, 22, 25, 25, 23, 19, 15, 12], color: '#ea580c', fillOpacity: 0.25 },
            { label: 'Precipitation (mm)', values: [70, 55, 40, 35, 15, 5, 1, 2, 15, 55, 70, 85], color: '#0284c7', fillOpacity: 0.25 },
          ],
        },
      }],
      infoCards: [
        { label: 'Wet Season', value: 'Oct - Mar', sublabel: '~85% of annual precipitation' },
        { label: 'Dry Season', value: 'Jun - Sep', sublabel: 'Near-zero rainfall' },
        { label: '2018 Fire', value: '27,000 ha', sublabel: 'Monchique wildfire' },
      ],
    },
    references: [
      { id: 16, title: 'Algarve Climate — IPMA', url: 'https://www.ipma.pt/' },
      { id: 11, title: 'Monchique Fire 2018 — EFFIS', url: 'https://effis.jrc.ec.europa.eu/' },
      { id: 17, title: 'Climate Projections Portugal — Portal do Clima', url: 'https://portaldoclima.pt/' },
    ],
  },

  landuse: {
    id: 'landuse',
    title: 'Land Use',
    subtitle: 'Tourism, agriculture, and development patterns',
    color: '#6B8E23',
    icon: 'map',
    description: 'Tourism, agriculture, and development patterns',
    accentColor: '#6B8E23',
    intro: `The Algarve's land use has been dramatically transformed by mass tourism since the 1960s. The coastal strip is heavily urbanized, while the interior faces depopulation and land abandonment.`,
    articles: [
      {
        title: 'Tourism & Urbanization',
        content: `Tourism dominates the coastal economy: 20+ million overnight stays per year. Golf: 40+ courses consuming significant water resources. Resort development has consumed much of the coastal strip, particularly between Albufeira and Vilamoura. Second homes and short-term rentals have driven housing costs beyond local affordability.`,
      },
      {
        title: 'Agriculture',
        content: `Traditional crops: Carob, almond, fig, olive (Barrocal zone). Citrus: Major orange and lemon production (Silves, Tavira). Intensive: Greenhouse berries and avocados expanding in river valleys. Cork: Montado systems in Serra de Monchique and Caldeirao. Trend: Traditional orchards declining as land is sold for tourism or abandoned.`,
      },
      {
        title: 'Interior Abandonment',
        content: `The Serra has lost over 50% of its population since the 1960s. Consequences: fuel load accumulation (fire risk), loss of traditional land management, scrub encroachment on former agricultural terraces. Villages like Alferce, Marmelete, and Cachopo face near-total depopulation.`,
      },
      {
        title: 'Emerging Pressures',
        content: `Avocado expansion: Water-intensive crops in a water-scarce region. Solar farms: Large PV installations proposed on agricultural land. Data centers: Several proposals for the Algarve's mild climate and connectivity. Digital nomads: Changing demographics in towns like Lagos and Tavira.`,
      },
    ],
    mapLayers: ['landcover', 'agriculture'],
    visuals: {
      stats: [
        { label: 'Tourist Stays', value: '20M+', sublabel: 'Per year' },
        { label: 'Golf Courses', value: '40+', sublabel: 'High water use' },
        { label: 'Interior Pop. Loss', value: '>50%', sublabel: 'Since 1960s', color: '#CC6633' },
        { label: 'Citrus Area', value: '~15,000 ha', sublabel: 'Silves, Tavira' },
      ],
      charts: [{
        type: 'bar',
        title: 'Land Use Composition',
        data: [
          { name: 'Serra (montado/forest)', value: 30, color: '#2d5a3d' },
          { name: 'Barrocal (orchards/scrub)', value: 25, color: '#8b9a46' },
          { name: 'Urban/Tourism', value: 20, color: '#8b7355' },
          { name: 'Agriculture', value: 15, color: '#d4a574' },
          { name: 'Wetlands/Water', value: 5, color: '#2B7BB9' },
          { name: 'Other', value: 5, color: '#999' },
        ],
      }],
    },
    references: [
      { id: 18, title: 'Algarve Tourism — Turismo de Portugal', url: 'https://www.turismodeportugal.pt/' },
      { id: 19, title: 'Algarve Agriculture — DRAP Algarve', url: 'https://www.drapalg.min-agricultura.pt/' },
      { id: 20, title: 'Rural Abandonment Algarve — ScienceDirect', url: 'https://www.sciencedirect.com/' },
    ],
  },

  risks: {
    id: 'risks',
    title: 'Risks',
    subtitle: 'Climate impacts, water scarcity, and coastal erosion',
    color: '#CC6633',
    icon: 'alert',
    description: 'Climate impacts, water scarcity, and coastal erosion',
    accentColor: '#CC6633',
    intro: `The Algarve faces converging risks: water scarcity, wildfire, coastal erosion, and over-dependence on tourism. Climate change amplifies all of these.`,
    articles: [
      {
        title: 'Water Scarcity',
        content: `The most critical risk. Reservoir levels have dropped below 20% during drought years. Groundwater over-extraction threatens the Querenca-Silves aquifer. Competing demands from tourism (golf, hotels), agriculture (citrus, avocados), and 500,000+ residents. Emergency desalination and inter-basin transfers are stopgap measures.`,
      },
      {
        title: 'Wildfire',
        content: `The 2018 Monchique fire was a watershed: 27,000 ha, homes destroyed, one death. The Serra's mix of eucalyptus, abandoned terraces, and depopulation creates extreme fire risk. Climate projections suggest fire seasons will extend by 20-40 days by 2050.`,
      },
      {
        title: 'Coastal Erosion & Sea Level Rise',
        content: `Cliff retreat: 0.2-1.5m per year along the south coast limestone cliffs. Beach loss: Several iconic beaches narrowing due to sediment deficit. Ria Formosa: Barrier islands migrating landward, threatening infrastructure. Sea level rise projections: 0.3-0.6m by 2100 would inundate low-lying areas of Faro, Olhao, Tavira.`,
      },
      {
        title: 'Tourism Dependency',
        content: `Over 50% of regional GDP comes from tourism-related activities. COVID-19 exposed the fragility: GDP dropped 15% in 2020. Housing affordability crisis driven by short-term rentals. Seasonal employment creates social instability.`,
      },
    ],
    mapLayers: ['fire', 'water'],
    visuals: {
      stats: [
        { label: 'Water Scarcity', value: 'Severe', color: '#dc2626' },
        { label: 'Fire Risk', value: 'Very High', color: '#ea580c' },
        { label: 'Coastal Erosion', value: 'Active', color: '#CC6633' },
        { label: 'Tourism Dependency', value: '>50% GDP', color: '#E8A317' },
      ],
      charts: [{
        type: 'radar',
        title: 'Risk Profile',
        data: [
          { axis: 'Fire', value: 82, max: 100 },
          { axis: 'Drought', value: 85, max: 100 },
          { axis: 'Flood', value: 35, max: 100 },
          { axis: 'Erosion', value: 65, max: 100 },
        ],
      }],
      alertRows: [
        { icon: 'fire', label: 'Fire Risk', value: 'Very High', score: '82/100', bgColor: '#fef2f2', textColor: '#dc2626', iconColor: '#dc2626' },
        { icon: 'thermometer', label: 'Drought Risk', value: 'Severe', score: '85/100', bgColor: '#fff7ed', textColor: '#ea580c', iconColor: '#ea580c' },
        { icon: 'droplet', label: 'Flood Risk', value: 'Moderate', score: '35/100', bgColor: '#eff6ff', textColor: '#2563eb', iconColor: '#2563eb' },
        { icon: 'mountain', label: 'Erosion Risk', value: 'High', score: '65/100', bgColor: '#f5f3ff', textColor: '#7c3aed', iconColor: '#7c3aed' },
      ],
    },
    references: [
      { id: 11, title: 'Monchique Fire 2018 — EFFIS', url: 'https://effis.jrc.ec.europa.eu/' },
      { id: 21, title: 'Coastal Erosion Algarve — APA', url: 'https://www.apambiente.pt/' },
      { id: 22, title: 'Ria Formosa Dynamics — Universidade do Algarve', url: 'https://www.ualg.pt/' },
      { id: 14, title: 'Algarve Water Crisis — Observador', url: 'https://observador.pt/' },
    ],
  },

  culture: {
    id: 'culture',
    title: 'Culture',
    subtitle: 'Heritage, demographics, and traditional knowledge',
    color: '#B8860B',
    icon: 'people',
    description: 'Heritage, demographics, and traditional knowledge',
    accentColor: '#B8860B',
    intro: `The Algarve's cultural identity reflects layers of Phoenician, Roman, Moorish, and Portuguese influence. The Arabic name "Al-Gharb" (the west) reveals its deep Moorish heritage. Traditional knowledge of dryland farming, fishing, and water management is rapidly disappearing.`,
    articles: [
      {
        title: 'Demographics',
        content: `Population: 467,495 (2021), growing primarily from immigration. Age structure: One of Portugal's most aged regions (22%+ over 65). Immigration: Significant communities from Brazil, UK, France, Netherlands, and increasingly from South Asia. Seasonal workforce: Tourism creates large seasonal employment swings. Interior depopulation: Serra municipalities losing residents steadily since 1960s.`,
      },
      {
        title: 'Heritage & Architecture',
        content: `Moorish legacy: Chimney designs (chamine algarvia), azulejo tiles, place names (Albufeira, Alcoutim, Aljezur). Cataplana: Iconic copper cooking vessel from Arab tradition. Xaroque architecture: Baroque churches with gilded interiors (talha dourada). Fishing culture: Armacao de Pera, Olhao, and Tavira preserve tuna and sardine fishing heritage.`,
      },
      {
        title: 'Traditional Knowledge',
        content: `Dryland farming: Almond, carob, and fig orchards adapted to rainfall-only agriculture. Noria waterwheels: Traditional irrigation from wells. Salt production: Centuries-old salt pans in Ria Formosa and Castro Marim. Cork harvesting: 9-year cycle hand-stripping techniques preserved in the Serra.`,
      },
    ],
    mapLayers: ['places', 'historic'],
    visuals: {
      stats: [
        { label: 'Population', value: '467,495', sublabel: '2021 census' },
        { label: 'Over 65', value: '22%+', sublabel: 'Aged population' },
        { label: 'Moorish Heritage', value: '500+ yrs', sublabel: 'Al-Gharb legacy' },
        { label: 'Salt Pans', value: 'Active', sublabel: 'Ria Formosa, Castro Marim' },
      ],
      infoGrid: {
        title: 'Cultural Demographics',
        rows: [
          { label: 'Population Growth', value: 'Immigration-driven' },
          { label: 'Key Communities', value: 'Brazilian, British, French, Dutch' },
          { label: 'Interior Trend', value: 'Depopulation since 1960s' },
          { label: 'Seasonal Workforce', value: 'Tourism-driven swings' },
        ],
      },
    },
    references: [
      { id: 23, title: 'Algarve Heritage — Direção Regional de Cultura', url: 'https://www.cultalg.pt/' },
      { id: 24, title: 'Moorish Algarve — Visit Algarve', url: 'https://www.visitalgarve.pt/' },
      { id: 4, title: 'Algarve Census 2021 — INE', url: 'https://www.ine.pt/' },
    ],
  },

  community: {
    id: 'community',
    title: 'Community',
    subtitle: 'Initiatives, citizen science, and local organizations',
    color: '#8B4789',
    icon: 'heart',
    description: 'Initiatives, citizen science, and local organizations',
    accentColor: '#8B4789',
    intro: `Despite tourism dominance, the Algarve has a growing movement of community-driven environmental and regenerative initiatives.`,
    articles: [
      {
        title: 'Environmental Organizations',
        content: `ALMARGEM: Environmental association active since 1988, focused on heritage trails, habitat restoration, and environmental education. Operates the Via Algarviana long-distance trail. Quercus (Algarve chapter): National environmental NGO with local campaigns on water, fire prevention, and coastal protection. Ria Formosa stakeholder groups: Multiple organizations monitoring and advocating for lagoon ecosystem health.`,
      },
      {
        title: 'Regenerative Agriculture',
        content: `Herdade do Freixo do Meio: Pioneering regenerative montado farm (though in Alentejo, influences Algarve practice). Syntropic agriculture projects emerging in Lagos and Monchique areas. Community gardens: Growing movement in Faro, Portimao, Loulé. Transition Towns: Tavira Transition initiative focused on local food resilience.`,
      },
      {
        title: 'Citizen Science',
        content: `BioBlitz events: Annual biodiversity surveys in Ria Formosa. Seahorse monitoring: Community volunteer programs tracking Ria Formosa seahorse populations. Fire prevention: Volunteer brigades (bombeiros voluntarios) in Serra communities. Beach cleanup networks: Regular organized cleanups along the coast.`,
      },
      {
        title: 'Stakeholder Landscape',
        content: `Tourism operators and hospitality industry. Traditional fishers and farming communities. Environmental NGOs (ALMARGEM, Quercus, A Rocha). Foreign resident communities. Municipal governments and AMAL (intermunicipal community). University of Algarve (UAlg) research community.`,
      },
    ],
    mapLayers: ['places', 'infrastructure'],
    visuals: {
      stats: [
        { label: 'Key NGOs', value: '3+', sublabel: 'ALMARGEM, Quercus, A Rocha' },
        { label: 'Via Algarviana', value: '300 km', sublabel: 'Long-distance trail' },
        { label: 'Volunteer Brigades', value: 'Active', sublabel: 'Serra communities' },
      ],
      infoGrid: {
        title: 'Stakeholder Landscape',
        rows: [
          { label: 'Tourism Industry', value: 'Dominant economic force' },
          { label: 'Environmental NGOs', value: 'ALMARGEM, Quercus, A Rocha' },
          { label: 'Research', value: 'University of Algarve' },
          { label: 'Government', value: 'AMAL, 16 municipalities' },
          { label: 'Foreign Communities', value: 'UK, DE, NL, FR, BR' },
        ],
      },
    },
    references: [
      { id: 25, title: 'ALMARGEM', url: 'https://almargem.org/' },
      { id: 26, title: 'Via Algarviana', url: 'https://www.viaalgarviana.org/' },
      { id: 27, title: 'A Rocha Portugal', url: 'https://www.arocha.pt/' },
      { id: 28, title: 'Quercus Algarve', url: 'https://www.quercus.pt/' },
      { id: 29, title: 'University of Algarve', url: 'https://www.ualg.pt/' },
    ],
  },
};

export const EVENTS_CALENDAR = [
  { month: 'February', name: 'Carnival (Loule)', location: 'Loule', type: 'festival' },
  { month: 'March', name: 'Almond Blossom Festival', location: 'Various', type: 'festival' },
  { month: 'May', name: 'Festival Med', location: 'Loule', type: 'music' },
  { month: 'June', name: 'Santos Populares', location: 'Various', type: 'traditional' },
  { month: 'July', name: 'International Sand Sculpture Festival', location: 'Pera', type: 'art' },
  { month: 'August', name: 'Festival F', location: 'Faro', type: 'music' },
  { month: 'August', name: 'Feira da Serra', location: 'Sao Bartolomeu de Messines', type: 'fair' },
  { month: 'September', name: 'Algarve Nature Festival', location: 'Various', type: 'nature' },
  { month: 'October', name: 'Sweet Potato Festival', location: 'Aljezur', type: 'food' },
  { month: 'November', name: 'Feira de Santa Iria', location: 'Faro', type: 'fair' },
  { month: 'December', name: 'Christmas Markets', location: 'Various', type: 'market' },
];

export const LANDMARKS = [
  { name: 'Faro', type: 'town', coords: [37.0194, -7.9304], pop: 65000, desc: 'Regional capital. University city and gateway to Ria Formosa.' },
  { name: 'Portimao', type: 'town', coords: [37.1367, -8.5378], pop: 55000, desc: 'Major city. Port and sardine fishing heritage.' },
  { name: 'Lagos', type: 'town', coords: [37.1028, -8.6731], pop: 32000, desc: 'Historic maritime city. Age of Discovery departure point.' },
  { name: 'Albufeira', type: 'town', coords: [37.0886, -8.2504], pop: 40000, desc: 'Tourism capital of the Algarve.' },
  { name: 'Tavira', type: 'town', coords: [37.1272, -7.6506], pop: 26000, desc: 'Historic town on the Gilao River. Eastern Algarve cultural center.' },
  { name: 'Loule', type: 'town', coords: [37.1389, -8.0222], pop: 30000, desc: 'Market town. Cultural capital with traditional crafts.' },
  { name: 'Silves', type: 'town', coords: [37.1886, -8.4382], pop: 11000, desc: 'Former Moorish capital. Castle and citrus orchards.' },
  { name: 'Monchique', type: 'village', coords: [37.3189, -8.5556], pop: 5000, desc: 'Mountain spa town. Serra de Monchique gateway.' },
  { name: 'Aljezur', type: 'village', coords: [37.3167, -8.8028], pop: 5800, desc: 'Western Algarve. Costa Vicentina gateway.' },
  { name: 'Ria Formosa', type: 'landmark', coords: [37.0200, -7.8300], desc: 'Ramsar wetland. 60 km barrier island lagoon system.' },
  { name: 'Benagil Cave', type: 'landmark', coords: [37.0875, -8.4236], desc: 'Iconic limestone sea cave on the south coast.' },
  { name: 'Foia', type: 'landmark', coords: [37.3153, -8.5989], desc: 'Highest point in the Algarve at 902m.' },
];
