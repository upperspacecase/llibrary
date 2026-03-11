import '../styles/main.css';
import { initI18n, t } from '../lib/i18n.js';
import { getAllSections, LANDMARKS, EVENTS_CALENDAR } from '../lib/wiki-data.js';
import { escapeHtml } from '../lib/utils.js';

initI18n();

// ---- Chat State ----
const messages = [];
let activeLandbookId = null;
const messagesEl = document.getElementById('chat-messages');
const inputEl = document.getElementById('chat-input');
const sendBtn = document.getElementById('chat-send');
const suggestionsEl = document.getElementById('chat-suggestions');

// ---- Suggestions ----
const SUGGESTIONS = [
  'chat.sug.water',
  'chat.sug.fire',
  'chat.sug.species',
  'chat.sug.greenhouse',
  'chat.sug.planting',
  'chat.sug.park',
  'chat.sug.zoning',
  'chat.sug.community',
];

function renderSuggestions() {
  if (!suggestionsEl) return;
  suggestionsEl.innerHTML = SUGGESTIONS.map(key =>
    `<button class="chat-suggestion">${escapeHtml(t(key))}</button>`
  ).join('');

  suggestionsEl.querySelectorAll('.chat-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.textContent;
      handleSend();
    });
  });
}

// ---- Message Rendering ----
function addMessage(role, content, sources) {
  messages.push({ role, content, sources });
  renderMessages();
}

function renderMessages() {
  if (!messagesEl) return;
  messagesEl.innerHTML = messages.map(m => {
    const isUser = m.role === 'user';
    let html = `
      <div class="chat-message">
        <div class="chat-avatar ${isUser ? 'user' : 'assistant'}">${isUser ? '&#9679;' : '&#9733;'}</div>
        <div class="chat-bubble">${formatContent(m.content)}</div>
      </div>
    `;
    return html;
  }).join('');

  messagesEl.scrollTop = messagesEl.scrollHeight;

  if (messages.length > 0 && suggestionsEl) {
    suggestionsEl.style.display = 'none';
  }
}

function formatContent(text) {
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
    await sendToBackend(text);
  } catch (err) {
    console.error('Chat error:', err);
    addMessage('assistant', t('chat.error'));
  }

  sendBtn.disabled = false;
  inputEl.focus();
}

// Calls the serverside RAG endpoint
async function sendToBackend(query) {
  const history = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content }));

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: query,
      history,
      landbookId: activeLandbookId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${res.status}`);
  }

  const data = await res.json();
  addMessage('assistant', data.message, data.sources);
}

// Allow setting active landbook from URL params
function initFromParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('landbook')) {
    activeLandbookId = params.get('landbook');
  }
}

// ---- Event Listeners ----
if (sendBtn) {
  sendBtn.addEventListener('click', handleSend);
}

if (inputEl) {
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
  });
}

// ---- Initialize ----
initFromParams();
renderSuggestions();

if (messagesEl) {
  addMessage('assistant', t('chat.welcome'));
}
