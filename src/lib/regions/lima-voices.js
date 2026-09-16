/**
 * Bacia do Lima — community voices collected during Milestone 3 (2026).
 *
 * Three kinds of material, kept in the contributors' own words:
 *
 *   VOICE_CONTRIBUTIONS  — messages left on the phone-based recording
 *                          installation at four regional festivals and at
 *                          Kind Family Festival. Transcribed as given; names
 *                          removed.
 *   SURVEY_TALLIES       — the Ermida paper survey, counts per option.
 *   LEARN_AND_SHARE      — free-text answers from the same survey.
 *   FACILITATOR_SUMMARY  — the facilitators' summary and insights, which
 *                          interpret the material and are labelled as such.
 *
 * Not in the retrieval index yet. scripts/seed-community-voices.mjs embeds
 * this module into a region's Pinecone namespace when run.
 */

export const REGIONAL_QUESTION = 'If you could ask for a wish for your region, what would it be?';
export const FESTIVAL_QUESTION = 'What is your wish and prayer for the future?';

export const VOICE_CONTRIBUTIONS = [
  // Ermida
  { location: 'Ermida', question: REGIONAL_QUESTION, text: 'Health, love and peace for all' },
  { location: 'Ermida', question: REGIONAL_QUESTION, text: 'I would like to see reforestation, and a lot of people involved in adding something to the region rather than destroying it' },
  { location: 'Ermida', question: REGIONAL_QUESTION, text: 'A good year for all, and a great time at the Festivals' },

  // Ponte da Barca
  { location: 'Ponte da Barca', question: REGIONAL_QUESTION, speaker: 'firefighter', text: 'It would be good if everyone was familiar with the land and collaborated at times when there are wildfires in the mountain. I have been a firefighter for very long, and would like to know the reason why we don’t have better access in the region. Would like to have better access paths and for our people to be well received.' },
  { location: 'Ponte da Barca', question: REGIONAL_QUESTION, text: 'More fields to play sports' },
  { location: 'Ponte da Barca', question: REGIONAL_QUESTION, text: 'For government to take good care of the region, not just of the forest but also of the towns. The years pass by and not a lot is being done for the region. It is very rich both in terms of forests, in farming, in industries, and the governments are neglecting this Northern region, where a lot of our natural wealth can be found.' },
  { location: 'Ponte da Barca', question: REGIONAL_QUESTION, text: 'That more people would be able to make a living from forest-related work, make impactful interventions and see a bright and very green future for our forests. People who would keep nurseries, coordinate planting actions between villages and municipalities, forest rangers, people who do interventions at the local schools for a more holistic education, more connected to the land and territory. And that there would be pride in the region and this long term vision and work.' },
  { location: 'Ponte da Barca', question: REGIONAL_QUESTION, text: 'This area is too calm yet, hope that tonight it should be more lively.' },
  { location: 'Ponte da Barca', question: REGIONAL_QUESTION, text: 'More forest rangers and land clearing' },
  { location: 'Ponte da Barca', question: REGIONAL_QUESTION, text: 'That landowners would clear their land on time and according to regulations, that would help prevent a lot of fires' },
  { location: 'Ponte da Barca', question: REGIONAL_QUESTION, text: 'I would like to plant hazelnut trees (and my mom would also be able to make homemade Nutella!)' },
  { location: 'Ponte da Barca', question: REGIONAL_QUESTION, speaker: 'Portuguese emigrant, over 50 years in the US', text: 'I’m Portuguese but have been in the US for over 50 years, and my wishes are very simple: more clearing, more forest rangers, and for those who are caught starting fires to get the harshest possible punishment. It breaks my heart to see these fires in the news every year.' },
  { location: 'Ponte da Barca', question: REGIONAL_QUESTION, text: 'I wish people cared more about the forests and stopped planting eucalyptus' },

  // Mosteirô-Paradamonte
  { location: 'Mosteirô-Paradamonte', question: REGIONAL_QUESTION, text: 'Firebreaks and access to the villages. The way these are being done currently, fire will only stop when it reaches the houses. In Spain, on the other side of Serra Amarela, it was common to find natural firebreaks, which were made every year, it should be done here as well' },
  { location: 'Mosteirô-Paradamonte', question: REGIONAL_QUESTION, text: 'I really love the forest of Lindoso!' },
  { location: 'Mosteirô-Paradamonte', question: REGIONAL_QUESTION, text: 'For Vila Praia de Âncora and Lindoso to be very well connected so you could travel very fast between the two (and for the noise to stop, I would like everything to be quiet!)' },

  // Kind Family Festival — numbering as recorded (13 and 45 are absent in the source)
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 1, text: 'To establish my community in South Portugal. To create my village around me, and to feel belonging, grounded within myself and within the place I\'ve chosen to live.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 2, text: 'To bring more love and abundance to my surroundings not for myself, but for all the people I share life with: friends, family, kids, parents, brothers, all my close relations.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 3, text: 'To keep working on allowing what needs to come to me and releasing what isn\'t for me to get better at releasing.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 4, text: 'A full, healthy life to come through me in September [childbirth].' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 5, speaker: '73, Italy', text: 'To include more of this quality in my own life to continue, on a smaller scale at home, this contribution to beautiful living on our planet.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 6, text: 'To keep making choices in alignment with who I am the deepest expression of my creativity, essence, and passions.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 7, text: 'To not have wishes to just love what is. Wishing would be stepping away from the perfectness.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 8, speaker: 'man', text: 'Be healthy, have a healthy family, much love, and so on.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 9, speaker: 'child', text: 'I want to be the chant [unclear]!' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 10, speaker: 'man', text: 'To visit more festivals like this next year, two cycles, maybe three if possible.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 11, text: 'That the sun doesn\'t eat the Earth too soon before we get to do all the cool stuff we can still do.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 12, text: 'A world where we can drink pure water, and children learn and grow without a schedule following their own rhythm, inspired by strong, responsible, playful modelling adults in touch with themselves, others, and the land. A culture that brings the Earth to the centre. A world without war, torture, bombs, killing.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 14, text: 'That people talk to each other, sit together, listen to each other, and work out what they need to do in their local area with all the beings that live there councils like this all over the world.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 15, text: 'Safety and joy, for both me and all. (These were the words that came while making a prayer flag.)' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 16, text: 'Families coming together, forming villages regenerative villages.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 17, text: 'That me and my family live a happy and fulfilled life.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 18, text: 'A continuation of abundance flowing to me and everyone I\'m connected with and for the whole festival community to benefit from it.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 19, text: 'That what has been coming through me from beyond finally manifests and materialises in the world.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 20, text: 'That this experience being in a family-centred, supportive environment for children, parents, and elders becomes part of conventional narrative life, so the world can experience what it feels like to be in tribe and supported.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 21, text: 'That my family and humankind find a way to live in harmony with the Earth to coexist instead of consuming without replenishing so all children, and their children\'s children, have a bright future.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 22, text: 'A future with kind families.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 23, text: 'To live a long life, healthy and happy, for all my family and everyone.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 24, text: 'More kindness all over.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 25, text: 'A world that is compassionate towards each other and towards all other conscious beings.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 26, text: 'Kindness and awareness. We live in a world not very aware led by consumption, greed, comparison. That every individual could see their true selves, because I believe in the good and if most of us return to the good, it will have a good impact long term.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 27, text: 'That all the energy of this festival love, connection, togetherness, family, tribe is encapsulated and ripples out into the collective, wider and wider, to all the places that need this medicine, this way of being.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 28, text: 'To create abundance for everyone, not just ourselves there\'s plenty in the world, enough for everyone. And all children at peace and under safety.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 29, text: 'Safety for all the children in the world. Peace for every mother and father. That we support each other the way we want others to be there for us no judgement, no comparison, no competition, just togetherness, abundance for everyone, more light and love, peace and to give back to the Earth instead of taking from her. She\'s tired.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 30, text: 'That people live, speak, and act more from the heart again.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 31, text: 'Community love. A colourful future for our future generations. Peace.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 32, text: 'To get closer together as humans to be more kind and loving to each other.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 33, text: 'A world where community is a reality where people don\'t feel they need to do it all by themselves. Connection.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 34, text: 'To find a home. A nice home for the family to land in.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 35, text: 'Discipline.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 36, text: 'A world where we feel connected to each other. A world where children can eat and feel safe. Where we can look each other in the eyes and smile, cry, or laugh like children who just play together within minutes of meeting. A world where we can hear the birds singing.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 37, text: 'To bring more community to my life and to the people around me.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 38, text: 'That we create more spaces where children can feel this free and liberated, and parents feel supported in a space of non-judgement. For the return of the village.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 39, text: 'A world with peace and equity sharing resources in a more fair way.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 40, text: 'For this Mother Earth, for humanity, for my life, my children, future generations, my family: good health, abundance, creativity, and love. May water always run pure, and may there be good fruits for all of us.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 41, text: 'To grow surrounded by loving, conscious, transformational people.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 42, speaker: 'child', text: 'To have lots of fun!' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 43, text: 'To live on a beautiful piece of land with beautiful people, animals, and plants incredible buildings, places to play and explore, and a beautiful fireplace you can dance around and hold councils at. To be with the land, in community.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 44, text: 'Peace on Earth. And to live in true village community.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 46, text: 'To live in the highest frequency, the highest timeline.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 47, text: 'That we could take this little bubble with us and spread the festival energy to our neighbours, family, and everybody who surrounds us out there.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 48, text: 'For my little boy to have a super happy, healthy, long life that I share as much as I can with.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 49, text: 'The healing of humanity and the planet, for the sake of our future generations.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 50, text: 'A creative living where many people come together lush, green, bright, blue spreading zone by zone until the whole planet is covered with biodiverse living places where people practise their devotion, creativity, and love of Earth and sky and self. Where we have the choice to be free and live as we need and want, following the calling of each of our souls.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 51, text: 'That we get to live in community again, like we were meant to be and no one has to experience loneliness and isolation.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 52, text: '[For the festival to grow into] a community of one thousand parents for my grandchild a context where collective parenting is real.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 53, text: 'To find Tara Sangha and build a community of people to live there and to witness people showing up for themselves, their partners, their families, in a very kind way.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 54, text: 'To find a place to stay a nice house, a nice place with my family and other people around me. And to get out of the system and continue this journey with my family and other families together.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 55, text: 'That we normalise grief and death and with that, live a more connected life and that we all remember who we are and what we came here for, instead of walking around lost and forgotten from ourselves.' },
  { location: 'Kind Family Festival', question: FESTIVAL_QUESTION, n: 56, text: 'A world where people move from the heart and move with an embodied frequency of [love/unity].' },
];

export const SURVEY_TALLIES = [
  {
    question: 'Which regional challenges are you most concerned about?',
    options: [
      { label: 'Water safety', count: 14 },
      { label: 'Soil health', count: 9 },
      { label: 'Biodiversity loss', count: 18 },
      { label: 'Fire risk', count: 22 },
      { label: 'Climate change', count: 12 },
      { label: 'Job opportunities', count: 11 },
      { label: 'Cost of living', count: 9 },
    ],
  },
  {
    question: 'Which fire management strategies do you find most adequate for this region?',
    options: [
      { label: 'Native plant rings', count: 18 },
      { label: 'Community training sessions', count: 11 },
      { label: 'Post-fire emergency response plan focused on what the community can do', count: 14 },
      { label: 'Collaboration with other villages to coordinate actions', count: 6 },
      { label: 'Seed banks and free plants for post-fire restoration', count: 12 },
      { label: 'More efficient and flexible collaboration with authorities (city council, ICNF, etc.)', count: 17 },
    ],
  },
  {
    question: 'What community infrastructure would you like to see in the region?',
    options: [
      { label: 'Community gardens or food forests', count: 7 },
      { label: 'Water storage and irrigation/firefighting systems', count: 18 },
      { label: 'Renewable energy facilities (e.g., solar panels, wind turbines)', count: 3 },
      { label: 'Composting facilities and wood chippers for wood chip production', count: 7 },
      { label: 'Shared greenhouses/forest nurseries', count: 12 },
      { label: 'Reforestation or native habitat restoration projects', count: 19 },
      { label: 'Shared workshops (shared workspaces with shared tools)', count: 5 },
      { label: 'Tool repair and maintenance stations', count: 5 },
    ],
    other: ['Cooperative biomass central', 'Local civil protection units'],
  },
  {
    question: 'What tools would be most useful to have access to for day-to-day use at Ermida?',
    options: [
      { label: 'Soil and agricultural tools', count: 12 },
      { label: 'Compost management tools', count: 7 },
      { label: 'Water management and conservation tools', count: 9 },
      { label: 'Testing and measurement equipment — soil, water, biodiversity', count: 5 },
      { label: 'Surveying and planning tools', count: 6 },
      { label: 'Construction tools', count: 4 },
    ],
  },
  {
    question: 'What kind of knowledge would be most useful to have access to?',
    options: [
      { label: 'Biodiversity and ecosystem health indicators', count: 10 },
      { label: 'Wildlife migration patterns', count: 4 },
      { label: 'Seeds and planting', count: 14 },
      { label: 'Energy production and consumption data', count: 4 },
      { label: 'Environmental impact assessments', count: 8 },
      { label: 'Soil health and agricultural productivity metrics', count: 1 },
      { label: 'Weather and climate', count: 1 },
      { label: 'Data on water quality and availability', count: 9 },
      { label: 'Local services', count: 3 },
      { label: 'Tourism trends and visitor patterns', count: 6 },
      { label: 'Community resource use patterns', count: 9 },
    ],
  },
];

export const LEARN_AND_SHARE = {
  question: 'What would you most like to learn from others in your community? What knowledge, skills, or resources would you be willing to share with others in your community?',
  answers: [
    'Local traditional paractices',
    'Would like to share time and knowledge',
    'Would like to re-learn local customs. I\'m available to help set up projects/applications to implement actions in the territory',
    'Get to know the territory, civil protection',
    'Would like to learn knowledge that is transferred between generations and gets lost through memories. I\'m very motivated to create/participate in the cration of a communication plan for crisis prevention',
    'Ancestral knowledge',
  ],
};

export const FACILITATOR_SUMMARY = {
  introduction: 'Across the eight deployments, a simple phone-based recording interface invited visitors to leave a voice message in response to a guiding question. The phone proved to be the single most effective participation tool of the milestone, collecting 104 contributions. More than all other input methods combined. Its success lay in its low barrier to entry: no forms, no typing, no commitment. Just speak. Two guiding questions were used, reflecting the two distinct audiences engaged: "If you could ask for a wish for your region, what would it be?" asked at the four regional festivals in the Bacia do Lima area (Ermida, Ponte da Barca, Mosteirô-Paradamonte); "What is your wish and prayer for the future?" asked at Kind Family Festival, the more nationally/internationally attended event where the installation was first refined.',
  regional: 'Regional contributions (Ermida, Ponte da Barca, Mosteirô-Paradamonte) were overwhelmingly practical, place-based, and fire-centric. Wishes centred on: better forest access and firebreaks, the return of forest rangers and land-clearing employment, landowners fulfilling their clearing obligations, harsher punishment for fire-starters, and frustration with governmental neglect of the region\'s natural wealth. Several contributors spoke from direct experience: a veteran firefighter asking why access paths remain poor, a Portuguese emigrant of 50 years in the US whose heart breaks watching the fires on the news each year, a resident pointing across the border to Spain\'s Serra Amarela where natural firebreaks were maintained annually. Alongside the serious themes sat lighter, personal notes: a wish to plant hazelnut trees so a mother could make homemade Nutella, and hopes for love, health, and a good festival.',
  festival: 'Kind Festival contributions were of a different nature entirely spiritual, aspirational, and oriented toward community and belonging rather than policy. Recurring themes included: the return of "the village" and collective parenting, living in harmony with the Earth, kindness and heart-centred living as antidotes to consumption and comparison, children\'s safety and freedom, and the hope that festival energy could "ripple out" into wider society. Many wishes were for the contributors\' own lives (home, family, health, creative expression), revealing the phone as a space for personal reflection as much as civic input.',
  insights: [
    'The method matched the audience. The phone worked precisely because it was informal and optional. Regional participants many elderly, some intimidated by forms or digital interfaces contributed candidly and at length. A survey would not have captured the firefighter\'s frustration or the emigrant\'s grief. This validates voice as a core methodology for the LLN going forward.',
    'Regional wishes strongly validate the project\'s direction. The most repeated demands: forest ranger employment, land clearing, firebreaks and access paths, cross-border learning (Spain), collaboration between landowners and official agencies align almost exactly with the findings of the original Citizens Assembly survey. This consistency across three separate festival locations, including the neighbouring union of municipalities, confirms these are shared regional priorities rather than isolated views, and strengthens the case for bioregional-scale work.',
    'Emotion and identity are as important as infrastructure. Beneath the practical wishes runs a current of care and identity: love for specific forests ("I really love the forest of Lindoso!"), pride in a neglected but wealthy region, heartbreak at distance. Fire here is not an abstract risk, it is personal. Communication and engagement strategies should speak to this emotional register, not only to technical fire management.',
    'The two question sets reveal a bridging opportunity. The regional population voices concrete, fire-management-focused wishes; the festival/alternative community voices connection, village, and land-harmony wishes. These are not contradictory they are two halves of the same longing (to live well on cared-for land). Future engagements could deliberately convene these groups together, using wishes as a shared language.',
    'Wishes are a door to collaboration. Specific contributions already point to partners and pathways: the veteran firefighter (access and reception of firefighters), National Park Forestry Agents, landowner associations, and cross-border firebreak knowledge from Spain. Each passionate voice left on the phone is a potential participant in the next phase.',
  ],
};
