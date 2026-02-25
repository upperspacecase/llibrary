/**
 * Odemira bioregional wiki content — static data, narratives, and configuration.
 * This is the "knowledgeable neighbor" content layer.
 */

// Odemira municipality reference coordinates
export const ODEMIRA = {
  name: 'Odemira',
  country: 'Portugal',
  region: 'Alentejo Litoral',
  center: [37.5967, -8.6400],
  bbox: [37.30, -8.95, 37.85, -8.20], // [south, west, north, east]
  area: 1720, // km²
  population: 26066, // 2021 census
  parishes: 13,
  elevation: { min: 0, max: 590 },
  coastline: '55 km',
};

export const SECTIONS = {
  land: {
    id: 'land',
    title: 'The Land',
    subtitle: 'What\'s physically here',
    icon: '&#9968;',
    color: '#8B6914',
    intro: `Odemira is the largest municipality in Portugal — 1,720 km² stretching from the wild Atlantic coastline to the rolling hills of the interior Alentejo. The landscape transitions from dramatic sea cliffs and sand dunes through flat coastal plains into a mosaic of cork oak woodland, eucalyptus plantation, and low scrubby hills that eventually reach toward the Serra de Monchique to the south.`,
    articles: [
      {
        title: 'The coastline',
        content: `The western edge of Odemira is 55 kilometers of some of Europe's most pristine coastline. Sea cliffs up to 100 meters high alternate with sandy coves and river mouths. This entire stretch falls within the Southwest Alentejo and Vicentine Coast Natural Park. Vila Nova de Milfontes sits where the Rio Mira meets the Atlantic — the town's character shifts dramatically between sleepy winter village and bustling summer destination. Further south, Zambujeira do Mar and its dramatic cliffs draw surfers and the annual Sudoeste festival-goers.`,
      },
      {
        title: 'The interior',
        content: `Move inland and the landscape flattens into a patchwork of agricultural land — some ancient, some very new. The traditional Alentejo landscape of cork oaks (montado) and dryland grain farming is increasingly interrupted by large-scale greenhouse operations, particularly around São Teotónio and Aljezur borders. The transition zone between coast and interior is where most of the agricultural intensity concentrates. Further east, the land rises gently toward the Alentejo hills, with small villages scattered among olive groves and pasture.`,
      },
      {
        title: 'Geology',
        content: `The geology of Odemira tells a story spanning hundreds of millions of years. The coastal zone sits on Paleozoic schists and greywackes — some of the oldest rocks in Portugal. These hard formations create the dramatic cliff faces. Inland, the geology shifts to Carboniferous formations with occasional volcanic intrusions. The soil types follow the geology: thin, acidic soils on the schist bedrock near the coast, gradually becoming deeper and more fertile in the alluvial valleys of the Mira and its tributaries.`,
      },
    ],
    mapLayers: ['elevation', 'boundaries'],
  },

  water: {
    id: 'water',
    title: 'The Water',
    subtitle: 'What flows through',
    icon: '&#128167;',
    color: '#2B7BB9',
    intro: `Water defines Odemira. The Rio Mira is the region's artery — 145 km from its source in the Serra do Caldeirão to its mouth at Vila Nova de Milfontes. The Santa Clara-a-Velha dam creates the region's largest reservoir. But the water story here is increasingly one of tension: between agricultural demand (especially greenhouses), drinking water supply, and ecosystem needs.`,
    articles: [
      {
        title: 'The Mira River',
        content: `The Mira is one of Portugal's most important rivers. It flows through a steep-sided valley that is largely wild and undeveloped — a rare thing in southern Europe. The river's estuary at Vila Nova de Milfontes is a Natura 2000 site, important for migratory fish and birds. Upstream, the Barragem de Santa Clara (Santa Clara dam) was built in 1968 and creates a reservoir that supplies irrigation and drinking water to much of the region. Water levels in the reservoir have become a growing concern during drought years.`,
      },
      {
        title: 'Groundwater and wells',
        content: `Traditional farms in Odemira relied on wells, springs, and seasonal streams (ribeiras). Many of these still function, but groundwater levels have dropped in areas of intensive agriculture. The greenhouse sector, concentrated around São Teotónio and Odemira town, draws significant water from boreholes. Monitoring wells in the region show declining aquifer levels in some areas, though the situation varies significantly by location.`,
      },
      {
        title: 'Water quality concerns',
        content: `The intensive greenhouse agriculture that has expanded rapidly since the 2010s has raised water quality questions. Pesticide and fertilizer runoff is a concern in streams near greenhouse concentrations. Drinking water supply for some settlements has been intermittently affected. A local researcher based in Odemira is conducting comprehensive water quality monitoring across the municipality — their data will be integrated here as it becomes available.`,
      },
    ],
    mapLayers: ['waterways', 'watersheds'],
  },

  weather: {
    id: 'weather',
    title: 'The Weather',
    subtitle: 'What moves above',
    icon: '&#9925;',
    color: '#E8A317',
    intro: `Odemira has a Mediterranean climate with strong Atlantic influence — the coast stays cooler and foggier than you'd expect for this latitude, while the interior bakes in summer. Winters are mild and wet (most rain falls October through March), summers are hot and dry. The region gets about 500-600mm of rainfall annually, but climate patterns are shifting: droughts are becoming more frequent, fire seasons longer, and extreme rainfall events more intense.`,
    articles: [
      {
        title: 'Coastal vs. interior',
        content: `The coast and interior of Odemira can feel like different climates. Vila Nova de Milfontes might sit in morning fog at 18°C while Odemira town, just 25km inland, reaches 35°C by midday. The Atlantic moderates coastal temperatures year-round — summer highs rarely exceed 28°C on the coast, while the interior regularly hits 38-40°C. Winter frost is rare on the coast but possible inland, especially in valley bottoms.`,
      },
      {
        title: 'Fire season',
        content: `June through September is fire season. The combination of high temperatures, low humidity, and dried vegetation creates conditions where wildfires spread rapidly. The 2003 and 2017 fire seasons were particularly devastating across Portugal, and Odemira was not spared. The eucalyptus plantations that cover significant inland areas are especially flammable. Post-fire, the exposed hillsides become vulnerable to erosion and flooding when the autumn rains arrive.`,
      },
      {
        title: 'Growing seasons',
        content: `The long growing season is one of Odemira's agricultural advantages. Frost-free periods can exceed 300 days on the coast. The main growing calendar: winter crops go in October-November, spring planting begins February-March, and summer crops run through to September-October. Greenhouses, of course, operate year-round. For dryland agriculture, the critical period is May-September when irrigation (or drought tolerance) becomes essential.`,
      },
    ],
    mapLayers: ['weather'],
  },

  biodiversity: {
    id: 'biodiversity',
    title: 'What Lives Here',
    subtitle: 'Biodiversity & ecology',
    icon: '&#127793;',
    color: '#2E8B57',
    intro: `Odemira sits at a biogeographic crossroads — Atlantic and Mediterranean influences meet here, creating exceptional biodiversity. The Vicentine Coast is one of the most species-rich coastal areas in Europe. You'll find cliff-nesting white storks (the only such population in the world), remnant cork oak woodlands full of fungi and insects, and temporary Mediterranean ponds hosting rare amphibians. But this biodiversity is under pressure from greenhouse expansion, water extraction, eucalyptus monoculture, and increasing fire frequency.`,
    articles: [
      {
        title: 'The cliffs and coast',
        content: `The sea cliffs host a remarkable community of endemic plants adapted to salt spray, wind, and thin soils. Several species found here exist nowhere else. The cliff-nesting white stork colony is globally unique — most white storks nest on buildings and trees, but here they've adapted to the coastal cliffs. Peregrine falcons, choughs, and various seabirds also breed along this stretch. The rocky intertidal zone supports diverse marine life, including octopus, goose barnacles (percebes, a local delicacy), and anemones.`,
      },
      {
        title: 'The montado',
        content: `The cork oak woodlands (montado) of the interior are one of Europe's most important habitats. These open, savanna-like forests support an extraordinary web of life: wild boar, red deer, Egyptian mongoose, genet, and the occasional Iberian lynx. Below the trees, a rich understorey of herbs, cistus, and lavender hosts countless insect species. Fungi thrive here too — chanterelles, boletes, and amanitas fruit after autumn rains. The montado is also an agricultural system: cork is harvested from the oaks every nine years.`,
      },
      {
        title: 'What to watch for',
        content: `Bio-indicator species to keep an eye on: barn owl presence suggests healthy rodent populations and low pesticide use. Otter sightings in rivers indicate good water quality. Bee-eaters (colorful summer visitors) signal healthy insect populations. On the concerning side, the spread of the water hyacinth (Eichhornia crassipes) in waterways signals nutrient pollution. Eucalyptus beetle damage indicates the ecological costs of monoculture forestry.`,
      },
    ],
    mapLayers: ['biodiversity', 'protected'],
  },

  agriculture: {
    id: 'agriculture',
    title: 'What Grows Here',
    subtitle: 'Land use & agriculture',
    icon: '&#127806;',
    color: '#6B8E23',
    intro: `Odemira's agricultural story is one of dramatic transformation. Traditional dryland farming — wheat, olives, cork — dominated for centuries. Then, starting around 2010, large-scale greenhouse agriculture arrived, transforming the landscape around São Teotónio and the coastal plains. Today, Odemira produces a significant portion of Portugal's berries (raspberries, blueberries, blackberries) and has become one of the country's most productive agricultural municipalities. This transformation brings economic opportunity but also environmental and social tensions.`,
    articles: [
      {
        title: 'The greenhouse boom',
        content: `Drive around the São Teotónio area and you'll see it immediately: vast stretches of white plastic greenhouse tunnels covering the formerly open landscape. This sector, dominated by large agri-businesses (many internationally owned), produces berries, avocados, tropical fruits, and salad crops for European supermarkets. The industry has brought employment (and a large migrant workforce) but also concerns about water use, pesticide application, plastic waste, and landscape impact.`,
      },
      {
        title: 'Traditional agriculture',
        content: `Beyond the greenhouses, traditional Odemira agriculture persists. Cork oak management (montado) remains economically and ecologically important. Small-scale vegetable gardens, olive groves, and fruit orchards dot the landscape. Some farms are experimenting with agroecological approaches — permaculture, syntropic agriculture, regenerative grazing. The Tamera community, south of Odemira, has been developing water retention landscapes and food forests for over two decades.`,
      },
      {
        title: 'Abandoned land',
        content: `A significant percentage of Odemira's land area is classified as underused or abandoned — a pattern common across rural southern Portugal. Young people have moved to cities, and traditional small farming is often uneconomic. This abandonment creates both risk (fire-prone scrubby regrowth) and opportunity (available land for new agricultural or conservation projects). The exact percentage of abandoned land is something we're working to map through satellite analysis.`,
      },
    ],
    mapLayers: ['landcover', 'agriculture'],
  },

  community: {
    id: 'community',
    title: 'Who\'s Here',
    subtitle: 'People & community',
    icon: '&#128101;',
    color: '#8B4789',
    intro: `Odemira is home to about 26,000 people, but that number fluctuates with the seasons. Summer tourism swells coastal towns, and the agricultural season brings thousands of temporary workers, mostly from South and Southeast Asia. The permanent population skews older — many young people have left for Lisbon, Faro, or abroad. But there's a counterflow: eco-immigrants, back-to-the-landers, and remote workers are trickling in, drawn by cheap land, good climate, and the promise of a different pace of life.`,
    articles: [
      {
        title: 'Towns and villages',
        content: `The municipality spans 13 parishes (freguesias). Odemira town is the administrative center — a quiet riverside settlement with basic services. Vila Nova de Milfontes is the tourism hub, dramatically situated at the Mira's mouth. São Teotónio serves the agricultural interior. Smaller villages like Sabóia, Luzianes, Relíquias, and Santa Clara-a-Velha each have their own character. Many hamlets (montes) are partially or fully abandoned but slowly being rediscovered.`,
      },
      {
        title: 'The agricultural workforce',
        content: `The greenhouse industry has attracted a large immigrant workforce, primarily from Nepal, India, Thailand, and Bangladesh. Working and living conditions have been a significant concern — temporary housing is often inadequate, and labor rights issues have been reported. This demographic shift has changed the social fabric of small towns like São Teotónio, where Asian grocery stores now sit alongside traditional Portuguese cafés. Integration is an ongoing process.`,
      },
      {
        title: 'Intentional communities and newcomers',
        content: `Odemira has become a magnet for people seeking alternative lifestyles. The Tamera Peace Research Village, established in 1995, is the largest and most well-known — a community of about 170 people working on water retention, food autonomy, and social models. Smaller projects dot the landscape: permaculture farms, eco-villages, retreat centers, and individual homesteaders. These newcomers bring energy, skills, and new perspectives — and occasionally friction with traditional ways of doing things.`,
      },
    ],
    mapLayers: ['places', 'infrastructure'],
  },

  history: {
    id: 'history',
    title: 'The Story',
    subtitle: 'History & culture',
    icon: '&#128220;',
    color: '#B8860B',
    intro: `Odemira's story stretches back to the Neolithic. The region has been shaped by Phoenician traders, Roman occupation, Moorish rule (the name "Odemira" likely derives from Arabic), the Christian Reconquista, the Age of Discovery, and centuries of quiet agricultural life. The 20th century brought emigration, the 1974 Revolution, and EU membership. The 21st century is writing a new chapter: greenhouse industrialization, tourism growth, and the arrival of people from around the world seeking a different relationship with land.`,
    articles: [
      {
        title: 'Ancient roots',
        content: `Archaeological sites in the Odemira region include megalithic monuments (menhirs and dolmens) from 4000-3000 BCE, suggesting organized communities here for at least six millennia. The Phoenicians and later the Romans established a presence along the coast — Vila Nova de Milfontes' strategic river-mouth location was likely valued by both. Islamic rule from the 8th century shaped the landscape, introducing sophisticated irrigation systems and new crops (citrus, almonds, rice). The word "Odemira" probably comes from the Arabic "wadi" (river) + "mira" — river of clear water.`,
      },
      {
        title: 'Traditional ways',
        content: `For centuries, life in Odemira followed rhythms that would be recognizable to any rural Mediterranean community: cork harvesting in summer, olive pressing in autumn, grain planting in winter, fishing year-round. The montado system — managing cork oaks as both forest and pasture — is a land management tradition stretching back centuries. Local festivals still mark the agricultural calendar: the chestnut festival in autumn, the sardine festival in summer, various saints' days with processions and music.`,
      },
      {
        title: 'The modern shift',
        content: `The 1974 Carnation Revolution brought land reform to the Alentejo — large estates were collectivized, then gradually re-privatized. EU membership in 1986 brought subsidies that transformed agriculture. But the real transformation came in the 2010s when international agribusiness discovered Odemira's climate and cheap land were perfect for year-round berry production. In less than a decade, the landscape, economy, and demographics of parts of the municipality changed fundamentally. This is the tension that defines Odemira today: between tradition and transformation, conservation and development, local and global.`,
      },
    ],
    mapLayers: ['historic'],
  },

  governance: {
    id: 'governance',
    title: 'The Rules',
    subtitle: 'Governance & planning',
    icon: '&#9878;',
    color: '#4A708B',
    intro: `Understanding how land is governed in Odemira means navigating layers of Portuguese and EU regulation. The municipality has its own planning framework (PDM — Plano Director Municipal), but land use decisions are also shaped by national protections (REN, RAN), EU conservation designations (Natura 2000), and the Natural Park authority. For anyone buying or developing land here, these overlapping jurisdictions are important to understand — what you can build, where you can farm, and how the land is classified all depend on which regulatory layers apply to your specific parcel.`,
    articles: [
      {
        title: 'Municipal planning (PDM)',
        content: `The PDM is Odemira's master plan — it defines what each piece of land in the municipality can be used for. Categories include urban (solo urbano), agricultural (solo rural), forestry, and conservation. The current PDM was revised to address the greenhouse expansion and is a contentious document. Building permits, agricultural conversions, and development projects all need to align with PDM designations. You can consult the PDM at the Câmara Municipal de Odemira.`,
      },
      {
        title: 'REN and RAN',
        content: `Two national-level designations heavily restrict what you can do with land. REN (Reserva Ecológica Nacional) protects ecologically sensitive areas — flood zones, steep slopes, riparian corridors, coastal areas. Building within REN is generally prohibited. RAN (Reserva Agrícola Nacional) protects the best agricultural land from non-agricultural development. Many properties in Odemira overlap with one or both of these designations, which can significantly limit development options.`,
      },
      {
        title: 'Natural Park and Natura 2000',
        content: `The western third of Odemira falls within the Southwest Alentejo and Vicentine Coast Natural Park. Within the park, additional restrictions apply to construction, land clearing, and agricultural practices. The park authority (ICNF) must approve many activities that would otherwise just need municipal permission. Natura 2000 sites add another layer — activities that might harm protected habitats or species require environmental impact assessment. These protections are why the coastline remains so pristine, but they can frustrate landowners who want to develop their property.`,
      },
    ],
    mapLayers: ['governance', 'protected'],
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
  { name: 'Tamera', type: 'community', coords: [37.5833, -8.5167], pop: 170, desc: 'Peace research village. Water retention landscape, food forests.' },
  { name: 'Barragem de Santa Clara', type: 'landmark', coords: [37.4900, -8.4400], desc: 'Major reservoir supplying irrigation and drinking water.' },
  { name: 'Praia de Almograve', type: 'beach', coords: [37.6500, -8.8000], desc: 'Wild beach backed by dramatic schist cliffs.' },
];

export function getSectionById(id) {
  return SECTIONS[id] || null;
}

export function getAllSections() {
  return Object.values(SECTIONS);
}
