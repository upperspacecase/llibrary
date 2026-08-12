/**
 * wiki-chat.js — Floating chat panel for the wiki page.
 * Talks to the same /api/chat RAG endpoint.
 * Persists last 50 messages in localStorage.
 */

import { initI18n, t } from '../lib/i18n.js';
import { escapeHtml } from '../lib/utils.js';
import { getRegion, resolveRegionFromUrl } from '../lib/regions/index.js';

initI18n();

const MAX_MESSAGES = 50;

// Same resolution as wiki.js — ?region= or /wiki/<slug>, default otherwise.
const activeRegion = resolveRegionFromUrl();
const region = getRegion(activeRegion);
const regionName = region.name;

// Regions can opt out of the chat. Remove the trigger and the panel rather
// than leaving a button that opens an empty conversation.
if (region.hasChat === false) {
  document.getElementById('chat-toggle')?.remove();
  document.getElementById('chat-panel')?.remove();
}

// Per-region history — Pinecone namespaces the two regions apart, so their
// conversations should not share a transcript either.
const STORAGE_KEY = `lll-chat-messages-${activeRegion}`;

// DOM
const toggle = document.getElementById('chat-toggle');
const panel = document.getElementById('chat-panel');
const closeBtn = document.getElementById('chat-panel-close');
const messagesEl = document.getElementById('chat-panel-messages');
const inputEl = document.getElementById('chat-panel-input');
const sendBtn = document.getElementById('chat-panel-send');
const suggestionsEl = document.getElementById('chat-panel-suggestions');

// State
let messages = loadMessages();
let isOpen = false;

// ---- Persistence ----
function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMessages() {
  const trimmed = messages.slice(-MAX_MESSAGES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// ---- Suggestions ----
const SUGGESTIONS = [
  'chat.sug.water',
  'chat.sug.fire',
  'chat.sug.species',
  'chat.sug.planting',
];

function renderSuggestions() {
  if (!suggestionsEl) return;
  if (messages.length > 0) {
    suggestionsEl.style.display = 'none';
    return;
  }
  suggestionsEl.style.display = '';
  suggestionsEl.innerHTML = SUGGESTIONS.map(key =>
    `<button class="chat-panel-suggestion">${escapeHtml(t(key, { region: regionName }))}</button>`
  ).join('');
  suggestionsEl.querySelectorAll('.chat-panel-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.textContent;
      handleSend();
    });
  });
}

// ---- Rendering ----
function renderMessages() {
  if (!messagesEl) return;

  if (messages.length === 0) {
    messagesEl.innerHTML = `<div class="chat-panel-welcome">${escapeHtml(t('chat.welcome', { region: regionName }))}</div>`;
    renderSuggestions();
    return;
  }

  messagesEl.innerHTML = messages.map(m => {
    const isUser = m.role === 'user';
    const avatarClass = isUser ? 'user' : 'assistant';
    const avatarLabel = isUser ? 'You' : regionName;
    return `
      <div class="chat-panel-message ${avatarClass}">
        <div class="chat-panel-avatar ${avatarClass}">${escapeHtml(avatarLabel.substring(0, 2).toUpperCase())}</div>
        <div class="chat-panel-bubble">
          <div class="chat-panel-sender">${escapeHtml(avatarLabel)}</div>
          ${formatContent(m.content)}
        </div>
      </div>`;
  }).join('');

  messagesEl.scrollTop = messagesEl.scrollHeight;
  renderSuggestions();
}

function formatContent(text) {
  return text.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');
}

// ---- Chat Logic ----
function addMessage(role, content) {
  messages.push({ role, content });
  if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
  saveMessages();
  renderMessages();
}

async function handleSend() {
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  addMessage('user', text);
  sendBtn.disabled = true;

  try {
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-50)
      .map(m => ({ role: m.role, content: m.content }));

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history,
        region: activeRegion,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `API error: ${res.status}`);
    }

    const data = await res.json();
    addMessage('assistant', data.message);
  } catch (err) {
    console.error('Chat error:', err);
    addMessage('assistant', t('chat.error'));
  }

  sendBtn.disabled = false;
  inputEl.focus();
}

// ---- Toggle ----
function openPanel() {
  isOpen = true;
  panel.classList.add('open');
  toggle.classList.add('active');
  renderMessages();
  setTimeout(() => inputEl.focus(), 100);
}

function closePanel() {
  isOpen = false;
  panel.classList.remove('open');
  toggle.classList.remove('active');
}

toggle?.addEventListener('click', () => {
  if (isOpen) closePanel();
  else openPanel();
});

closeBtn?.addEventListener('click', closePanel);

// ---- Input handlers ----
sendBtn?.addEventListener('click', handleSend);

inputEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

inputEl?.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen) closePanel();
});
