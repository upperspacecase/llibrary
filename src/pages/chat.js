import '../styles/main.css';
import { initI18n } from '../lib/i18n.js';
import { ODEMIRA, SECTIONS, getAllSections, LANDMARKS, EVENTS_CALENDAR } from '../lib/wiki-data.js';
import { escapeHtml } from '../lib/utils.js';

initI18n();

// ---- Chat State ----
const messages = [];
const messagesEl = document.getElementById('chat-messages');
const inputEl = document.getElementById('chat-input');
const sendBtn = document.getElementById('chat-send');
const suggestionsEl = document.getElementById('chat-suggestions');

// ---- API Configuration ----
// Set your API key here or via environment variable to enable LLM-powered chat.
// Supports Anthropic Claude API format.
const API_CONFIG = {
  provider: 'anthropic', // 'anthropic' | 'openai' | 'local'
  apiKey: '', // Set via UI or config
  model: 'claude-sonnet-4-5-20250929',
  baseUrl: 'https://api.anthropic.com/v1/messages',
  maxTokens: 1024,
};

// System prompt with Odemira context
const SYSTEM_PROMPT = `You are a knowledgeable, friendly guide to the Odemira bioregion in southern Portugal. You speak like a well-informed neighbor explaining things over coffee — warm, specific, and practical.

Key facts about Odemira:
- Largest municipality in Portugal: ${ODEMIRA.area} km²
- Population: ~${ODEMIRA.population} (2021 census)
- Location: Alentejo Litoral, southern Portugal
- Coast: ${ODEMIRA.coastline} of pristine coastline in the Southwest Alentejo and Vicentine Coast Natural Park
- Key towns: Vila Nova de Milfontes, Odemira, São Teotónio, Zambujeira do Mar
- Climate: Mediterranean with Atlantic influence. Hot dry summers, mild wet winters.
- Major issues: Greenhouse agriculture expansion, water stress, fire risk, rural depopulation
- Notable: Tamera Peace Research Village, Festival Sudoeste, cliff-nesting white storks

Wiki sections available: ${getAllSections().map(s => s.title).join(', ')}

Landmarks: ${LANDMARKS.map(l => l.name).join(', ')}

Events: ${EVENTS_CALENDAR.map(e => `${e.name} (${e.month})`).join(', ')}

Keep answers concise (2-4 paragraphs max). If you don't know something specific, say so honestly and suggest where they might find the information. Reference the wiki sections when relevant.`;

// ---- Suggestions ----
const SUGGESTIONS = [
  'What\'s the water situation in Odemira?',
  'Tell me about fire risk in the region',
  'What species are unique to this area?',
  'How has greenhouse agriculture changed things?',
  'What\'s the best time of year for planting?',
  'Tell me about the Vicentine Coast Natural Park',
  'What zoning restrictions should I know about?',
  'What community projects exist here?',
];

function renderSuggestions() {
  suggestionsEl.innerHTML = SUGGESTIONS.map(s =>
    `<button class="chat-suggestion">${escapeHtml(s)}</button>`
  ).join('');

  suggestionsEl.querySelectorAll('.chat-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.textContent;
      handleSend();
    });
  });
}

// ---- Message Rendering ----
function addMessage(role, content) {
  messages.push({ role, content });
  renderMessages();
}

function renderMessages() {
  messagesEl.innerHTML = messages.map(m => {
    const isUser = m.role === 'user';
    return `
      <div class="chat-message">
        <div class="chat-avatar ${isUser ? 'user' : 'assistant'}">${isUser ? '&#9679;' : '&#9733;'}</div>
        <div class="chat-bubble">${formatContent(m.content)}</div>
      </div>
    `;
  }).join('');

  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Hide suggestions after first message
  if (messages.length > 0) {
    suggestionsEl.style.display = 'none';
  }
}

function formatContent(text) {
  // Simple markdown-like formatting
  return text
    .split('\n\n')
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join('');
}

// ---- Chat Logic ----
async function handleSend() {
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = '';
  addMessage('user', text);
  sendBtn.disabled = true;

  try {
    if (API_CONFIG.apiKey) {
      await sendToAPI(text);
    } else {
      await sendLocal(text);
    }
  } catch (err) {
    addMessage('assistant', 'Sorry, I had trouble processing that. Please try again.');
  }

  sendBtn.disabled = false;
  inputEl.focus();
}

// Local fallback — keyword-based responses using wiki data
async function sendLocal(query) {
  const q = query.toLowerCase();
  let response = '';

  // Match against wiki sections
  const sections = getAllSections();
  const matchedSection = sections.find(s =>
    q.includes(s.id) ||
    q.includes(s.title.toLowerCase()) ||
    s.subtitle.toLowerCase().split(' ').some(w => w.length > 3 && q.includes(w))
  );

  if (matchedSection) {
    response = matchedSection.intro;
    if (matchedSection.articles && matchedSection.articles.length > 0) {
      const article = matchedSection.articles[0];
      response += `\n\n${article.title}: ${article.content.substring(0, 300)}...`;
    }
    response += `\n\nYou can read more in the "${matchedSection.title}" section of the wiki.`;
  } else if (q.includes('water') || q.includes('river') || q.includes('mira')) {
    response = SECTIONS.water.intro + '\n\nCheck the "The Water" section of the wiki for detailed information about rivers, groundwater, and water quality in the region.';
  } else if (q.includes('fire') || q.includes('burn') || q.includes('drought')) {
    response = 'Fire risk in Odemira is shaped by Mediterranean summers (hot, dry), eucalyptus monoculture, and proximity to Serra de Monchique. The fire season runs June through September. The 2003, 2017, and 2018 seasons were particularly devastating. Post-fire flooding is an increasing concern as burnt hillsides lose their ability to absorb rainfall.\n\nCheck the "The Weather" section for current conditions and the "The Rules" section for fire prevention regulations.';
  } else if (q.includes('species') || q.includes('bird') || q.includes('animal') || q.includes('plant') || q.includes('biodiversity')) {
    response = SECTIONS.biodiversity.intro + '\n\nVisit the "What Lives Here" section for species lists, conservation status, and biodiversity data from GBIF and iNaturalist.';
  } else if (q.includes('farm') || q.includes('greenhouse') || q.includes('agriculture') || q.includes('grow') || q.includes('plant')) {
    response = SECTIONS.agriculture.intro + '\n\nThe "What Grows Here" section has detailed information about agriculture, land use patterns, and the greenhouse industry.';
  } else if (q.includes('community') || q.includes('people') || q.includes('population') || q.includes('tamera')) {
    response = SECTIONS.community.intro + '\n\nExplore the "Who\'s Here" section to learn about communities, local experts, and infrastructure in the region.';
  } else if (q.includes('history') || q.includes('culture') || q.includes('festival') || q.includes('tradition')) {
    response = SECTIONS.history.intro + '\n\nThe "The Story" section covers the full history from Neolithic times through the Moorish period to today\'s transformations.';
  } else if (q.includes('zone') || q.includes('rule') || q.includes('law') || q.includes('build') || q.includes('plan') || q.includes('permit')) {
    response = SECTIONS.governance.intro + '\n\nThe "The Rules" section explains PDM, REN, RAN, and Natura 2000 designations that affect what you can do with land in Odemira.';
  } else if (q.includes('weather') || q.includes('climate') || q.includes('rain') || q.includes('temperature')) {
    response = SECTIONS.weather.intro + '\n\nVisit the "The Weather" section for live forecast data, historical climate information, and growing season details.';
  } else if (q.includes('landbook') || q.includes('passport') || q.includes('report') || q.includes('parcel')) {
    response = 'A Landbook is your private data vault for a specific land parcel. You draw your boundary on the map, and we generate a comprehensive report pulling from EU open data sources — soil type, elevation, weather, biodiversity, fire risk, zoning. Then you can add your own knowledge on top: what you use the land for, your challenges, your goals.\n\nHead to the "Create Landbook" page to get started. All you need is a location and an estimated boundary.';
  } else {
    // General response
    response = `Odemira is the largest municipality in Portugal — ${ODEMIRA.area} km² stretching from the Atlantic coast to the interior Alentejo. It's a place of dramatic contrasts: pristine coastline and industrial greenhouses, ancient cork oak forests and modern berry farms, tiny villages and a growing international community.\n\nI can help you with questions about the land, water, weather, biodiversity, agriculture, community, history, or governance of the region. Try asking about a specific topic, or browse the wiki sections for detailed information.\n\nSome things I can help with:\n- Water resources and quality\n- Fire and drought risk\n- What species live here\n- Agricultural patterns and greenhouse impact\n- Community and demographics\n- Zoning and building regulations\n- Local history and culture`;
  }

  // Simulate typing delay
  await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
  addMessage('assistant', response);
}

// API-powered chat (when API key is configured)
async function sendToAPI(query) {
  const apiMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  // Add current message
  apiMessages.push({ role: 'user', content: query });

  if (API_CONFIG.provider === 'anthropic') {
    const res = await fetch(API_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_CONFIG.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: API_CONFIG.model,
        max_tokens: API_CONFIG.maxTokens,
        system: SYSTEM_PROMPT,
        messages: apiMessages,
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const content = data.content && data.content[0] ? data.content[0].text : 'No response received.';
    addMessage('assistant', content);
  }
}

// ---- Event Listeners ----
sendBtn.addEventListener('click', handleSend);

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Auto-resize textarea
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
});

// ---- Initialize ----
renderSuggestions();

// Welcome message
addMessage('assistant', 'Welcome to the Odemira wiki chat. I can answer questions about the region — the land, water, weather, biodiversity, agriculture, community, history, and governance. What would you like to know?\n\nTip: You can also browse the wiki directly for detailed articles and live data.');
