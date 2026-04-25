import '../styles/main.css';

// ---- State ----
let data = {};
let reportVersions = []; // keyed by submission_id string
let pipelineStatusIndex = {}; // 3-layer status per landbookId from server
let activeTab = 'submissions';
let pipelineResults = null;
let pipelineTesting = false;
/** Tracks which submission rows are expanded */
const expandedRows = new Set();

// ---- Column configs per collection ----
const columns = {
    submissions: [
        { key: '_who', label: 'Who', format: (_, row) => row.name || row.email || row.contact || '-' },
        { key: '_location', label: 'Location', format: (_, row) => row.address || row.postcode || '-' },
        { key: 'area', label: 'Area', format: v => v ? `${(v / 10000).toFixed(2)} ha` : '-' },
        { key: '_date', label: 'Date', format: formatDate },
        { key: '_type', label: 'Type' },
        { key: '_expand', label: '', format: (_, row) => {
            const id = row.id || row._id || '';
            if (!id) return '';
            return `__EXPAND__${id}`;
        }},
    ],
    contributions: [
        { key: 'section', label: 'Section' },
        { key: 'type', label: 'Type' },
        { key: 'title', label: 'Title' },
        { key: 'author', label: 'Author' },
        { key: 'created', label: 'Created', format: formatDate },
    ],
    resources: [
        { key: 'section', label: 'Section' },
        { key: 'title', label: 'Title' },
        { key: 'author', label: 'Author' },
        { key: 'fileType', label: 'Type' },
        { key: 'created', label: 'Created', format: formatDate },
    ],
    regions: [
        { key: 'name', label: 'Region' },
        { key: 'votes', label: 'Votes' },
        { key: 'status', label: 'Status', format: v => v || 'unknown' },
        { key: '_actions', label: 'Actions', format: () => '__REGION_ACTIONS__' },
    ],
};

function formatTimeAgo(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
}

function formatDateShort(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
           d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(v) {
    if (!v) return '-';
    const d = new Date(v);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFiles(files) {
    if (!files || !files.length) return '-';
    return `__FILES__${JSON.stringify(files)}`;
}

async function downloadFile(url, filename) {
    try {
        const res = await fetch('/api/admin/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ url, filename }),
        });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error('Download error:', err);
        alert('Failed to download file.');
    }
}

// ---- Auth ----
const GOOGLE_CLIENT_ID = '739273675321-9sltiakr741rl881k8ebfhm1eh1e0qui.apps.googleusercontent.com';

async function handleGoogleCredential(credential) {
    const error = document.getElementById('login-error');
    try {
        const res = await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ credential }),
        });

        if (res.status === 403) {
            error.textContent = 'This Google account is not authorized.';
            return;
        }
        if (!res.ok) {
            error.textContent = 'Sign-in failed.';
            return;
        }

        error.textContent = '';
        await loadData();
    } catch {
        error.textContent = 'Connection error.';
    }
}

function initGoogleOneTap() {
    if (!window.google?.accounts?.id) {
        // GSI library not loaded yet, retry
        setTimeout(initGoogleOneTap, 200);
        return;
    }
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => handleGoogleCredential(response.credential),
    });
    google.accounts.id.renderButton(document.getElementById('google-btn'), {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: 300,
    });
    google.accounts.id.prompt();
}

// Auto-login: check for existing session, otherwise show Google sign-in
(async function init() {
    try {
        const res = await fetch('/api/admin/auth', { credentials: 'include' });
        if (res.ok) {
            await loadData();
            return;
        }
    } catch { /* no session */ }
    initGoogleOneTap();
})();

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/admin/auth', { method: 'DELETE', credentials: 'include' });
    google.accounts.id.disableAutoSelect();
    window.location.reload();
});

async function loadData() {
    const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });

    if (!res.ok) return;

    const raw = await res.json();

    // Store report versions indexed by submission_id
    reportVersions = (raw.reportVersions || []);
    pipelineStatusIndex = raw.pipelineStatus || {};

    // Merge waitlist, landbooks, submissions into one unified list
    const merged = [
        ...(raw.waitlist || []).map(r => ({ ...r, _type: 'waitlist', _date: r.createdAt || r.created })),
        ...(raw.landbooks || []).map(r => ({ ...r, _type: 'landbook', _date: r.created })),
        ...(raw.submissions || []).map(r => ({ ...r, _type: 'submission', _date: r.created })),
    ];
    merged.sort((a, b) => new Date(b._date) - new Date(a._date));

    data = {
        submissions: merged,
        contributions: raw.contributions || [],
        resources: raw.resources || [],
    };

    // Aggregate region requests from waitlist
    const regionMap = new Map();
    for (const entry of (raw.waitlist || [])) {
        if (entry.type !== 'region-request' || !entry.address) continue;
        const key = entry.address.toLowerCase();
        if (!regionMap.has(key)) {
            regionMap.set(key, { name: entry.address, votes: 0, status: entry.status || 'unknown' });
        }
        regionMap.get(key).votes++;
        // Use the most recent status for display
        if (entry.status) regionMap.get(key).status = entry.status;
    }
    data.regions = Array.from(regionMap.values()).sort((a, b) => b.votes - a.votes);

    document.getElementById('login-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    document.getElementById('logout-btn').style.display = 'inline-block';
    renderStats();
    renderTable();
}

// ---- Stats ----
function renderStats() {
    const stats = [
        { label: 'Submissions', count: data.submissions?.length || 0 },
        { label: 'Contributions', count: data.contributions?.length || 0 },
        { label: 'Resources', count: data.resources?.length || 0 },
        { label: 'Regions', count: data.regions?.length || 0 },
    ];

    document.getElementById('stats-row').innerHTML = stats.map(s => `
        <div class="admin-stat-card">
            <div class="admin-stat-count">${s.count}</div>
            <div class="admin-stat-label">${s.label}</div>
        </div>
    `).join('');
}

// ---- Tabs ----
document.querySelector('.admin-tabs').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;

    const tableView = document.getElementById('table-view');
    const pipelineView = document.getElementById('pipeline-view');
    const runsView = document.getElementById('runs-view');

    tableView.style.display = 'none';
    pipelineView.style.display = 'none';
    if (runsView) runsView.style.display = 'none';

    if (activeTab === 'pipeline') {
        pipelineView.style.display = 'block';
        if (!pipelineResults) renderPipelineEmpty();
    } else if (activeTab === 'runs') {
        runsView.style.display = 'block';
        loadRuns();
    } else {
        tableView.style.display = 'block';
        renderTable();
    }
});

// ---- Pipeline runs ----
async function loadRuns() {
    const tbody = document.getElementById('runs-tbody');
    const empty = document.getElementById('runs-empty-msg');
    const summary = document.getElementById('runs-summary');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="admin-muted" style="text-align:center; padding:24px;">Loading…</td></tr>';

    try {
        const res = await fetch('/api/admin/pipeline-runs?limit=50');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { runs } = await res.json();

        if (!runs || runs.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            summary.textContent = '';
            return;
        }
        empty.style.display = 'none';
        const okCount = runs.filter(r => r.status === 'ok').length;
        const partialCount = runs.filter(r => r.status === 'partial').length;
        const failedCount = runs.filter(r => r.status === 'failed').length;
        summary.textContent = `${runs.length} runs · ${okCount} ok · ${partialCount} partial · ${failedCount} failed`;

        const fmt = (d) => d ? new Date(d).toLocaleString() : '—';
        const fmtDur = (ms) => ms == null ? '—' : ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`;
        const statusDot = (s) => {
            const color = s === 'ok' ? '#16a34a' : s === 'partial' ? '#d97706' : s === 'failed' ? '#dc2626' : '#999';
            return `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color};" title="${s}"></span>`;
        };

        tbody.innerHTML = runs.map(r => `
            <tr data-runid="${r.runId}" style="cursor:pointer;">
                <td>${statusDot(r.status)} ${r.status}</td>
                <td>${fmt(r.startedAt)}</td>
                <td>${fmtDur(r.durationMs)}</td>
                <td style="font-family:monospace; font-size:11px;">${r.landbookId || '—'}</td>
                <td>${r.trigger || '—'}</td>
                <td>${r.totals?.ok ?? 0} / ${r.totals?.failed ?? 0}</td>
                <td>${r.schemaValidation?.ok === false ? `${r.schemaValidation.issueCount} issues` : (r.schemaValidation?.ok ? 'ok' : '—')}</td>
                <td style="font-family:monospace; font-size:11px;">${r.runId}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('tr[data-runid]').forEach(tr => {
            tr.addEventListener('click', () => loadRunDetail(tr.dataset.runid));
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" class="admin-muted" style="text-align:center; padding:24px; color:#dc2626;">Failed to load runs: ${err.message}</td></tr>`;
    }
}

async function loadRunDetail(runId) {
    const detail = document.getElementById('run-detail');
    const title = document.getElementById('run-detail-title');
    const body = document.getElementById('run-detail-body');
    detail.style.display = 'block';
    title.textContent = `Run ${runId}`;
    body.textContent = 'Loading…';
    try {
        const res = await fetch(`/api/admin/pipeline-runs?runId=${encodeURIComponent(runId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        body.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        body.textContent = `Failed: ${err.message}`;
    }
}

const refreshBtn = document.getElementById('runs-refresh-btn');
if (refreshBtn) refreshBtn.addEventListener('click', loadRuns);

// ---- Table ----
function renderTable() {
    const rows = data[activeTab] || [];
    const cols = columns[activeTab] || [];
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    const empty = document.getElementById('empty-msg');

    head.innerHTML = `<tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>`;

    if (!rows.length) {
        body.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    body.innerHTML = rows.map(row => {
        const rowId = row.id || row._id || '';
        const cells = cols.map(c => {
            const raw = row[c.key];
            const val = c.format ? c.format(raw, row) : (raw ?? '-');
            const str = String(val);
            if (str.startsWith('__FILES__')) {
                try {
                    const files = JSON.parse(str.slice(9));
                    const links = files.map(f =>
                        `<button class="admin-file-btn" data-url="${escapeHtml(f.url)}" data-name="${escapeHtml(f.name)}">${escapeHtml(f.name)}</button>`
                    ).join(' ');
                    return `<td class="admin-files-cell">${links}</td>`;
                } catch { return `<td>-</td>`; }
            }
            if (str.startsWith('__EXPAND__')) {
                const id = str.slice(10);
                const isExpanded = expandedRows.has(id);
                return `<td><button class="admin-expand-btn ${isExpanded ? 'expanded' : ''}" data-landbook-id="${escapeHtml(id)}" title="Expand">${isExpanded ? '▾' : '▸'}</button></td>`;
            }
            if (str.startsWith('__REGION_ACTIONS__')) {
                const name = escapeHtml(row.name);
                const status = row.status;
                if (status === 'approved') {
                    return `<td><span class="admin-status-badge approved">Approved</span></td>`;
                }
                if (status === 'rejected') {
                    return `<td><span class="admin-status-badge rejected">Rejected</span></td>`;
                }
                return `<td class="admin-region-actions">
                    <button class="admin-region-btn approve" data-region="${name}" data-action="approved">Approve</button>
                    <button class="admin-region-btn reject" data-region="${name}" data-action="rejected">Reject</button>
                </td>`;
            }
            return `<td>${escapeHtml(str)}</td>`;
        }).join('');

        let html = `<tr class="admin-submission-row" data-row-id="${escapeHtml(rowId)}">${cells}</tr>`;

        // If expanded, render the detail panel
        if (expandedRows.has(rowId) && rowId) {
            html += renderDetailPanel(rowId, row, cols.length);
        }

        return html;
    }).join('');

    // Bind download click handlers
    body.querySelectorAll('.admin-file-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            downloadFile(btn.dataset.url, btn.dataset.name);
        });
    });

    // Bind expand toggle buttons
    body.querySelectorAll('.admin-expand-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.landbookId;
            if (expandedRows.has(id)) {
                expandedRows.delete(id);
            } else {
                expandedRows.add(id);
            }
            renderTable();
        });
    });

    // Bind detail panel action buttons
    bindDetailPanelActions(body);

    // Bind region approve/reject handlers
    body.querySelectorAll('.admin-region-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const region = btn.dataset.region;
            const status = btn.dataset.action;
            btn.disabled = true;
            btn.textContent = '...';
            try {
                const res = await fetch('/api/regions', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ region, status }),
                });
                if (!res.ok) throw new Error('Failed');
                // Update local data and re-render
                const entry = data.regions.find(r => r.name === region);
                if (entry) entry.status = status;
                renderTable();
            } catch {
                btn.disabled = false;
                btn.textContent = status === 'approved' ? 'Approve' : 'Reject';
                alert('Failed to update region status.');
            }
        });
    });
}

// ---- Expandable Detail Panel ----

// Per-source status list. Persistent — derived from server data on every render.
function renderSourceList(obs) {
    if (!obs || !Array.isArray(obs.sources) || obs.sources.length === 0) {
        return '';
    }
    const rows = obs.sources.map(s => {
        const ok = s.status === 'ok';
        const cls = ok ? 'detail-source-ok' : 'detail-source-fail';
        const icon = ok ? '✓' : '⚠';
        const errText = !ok && s.error ? ` <span class="detail-source-err">${escapeHtml(s.error)}</span>` : '';
        const group = s.group ? ` <span class="detail-source-group">${escapeHtml(s.group)}</span>` : '';
        return `<li class="${cls}"><span class="detail-source-icon">${icon}</span><span class="detail-source-label">${escapeHtml(s.label)}</span>${group}${errText}</li>`;
    }).join('');
    return `
        <details class="detail-breakdown">
            <summary>Per-source breakdown (${obs.ok}/${obs.total})</summary>
            <ul class="detail-source-list">${rows}</ul>
        </details>`;
}

// Per-section narrative status with expand-to-preview.
function renderNarrativeList(report) {
    if (!report || !report.sections || Object.keys(report.sections).length === 0) {
        return '';
    }
    const entries = Object.entries(report.sections);
    let totalFilled = 0, totalSlots = 0;
    const sections = entries.map(([key, sec]) => {
        totalFilled += sec.filled;
        totalSlots += sec.total;
        const complete = sec.filled === sec.total && sec.total > 0;
        const cls = complete ? 'detail-section-ok' : (sec.filled === 0 ? 'detail-section-empty' : 'detail-section-partial');
        const icon = complete ? '✓' : (sec.filled === 0 ? '✗' : '⚠');
        const slots = Object.entries(sec.slots).map(([slotKey, slot]) => {
            if (!slot.filled) {
                return `<div class="detail-slot detail-slot-empty"><span class="detail-slot-key">${escapeHtml(slotKey)}</span><span class="detail-slot-meta">empty</span></div>`;
            }
            return `<div class="detail-slot"><span class="detail-slot-key">${escapeHtml(slotKey)}</span><span class="detail-slot-meta">${slot.words}w</span><div class="detail-slot-text">${escapeHtml(slot.text)}</div></div>`;
        }).join('');
        return `
            <details class="detail-section ${cls}">
                <summary><span class="detail-section-icon">${icon}</span><span class="detail-section-key">${escapeHtml(key)}</span><span class="detail-section-count">${sec.filled}/${sec.total}</span></summary>
                <div class="detail-section-body">${slots}</div>
            </details>`;
    }).join('');
    return `
        <details class="detail-breakdown" open>
            <summary>Per-section breakdown (${totalFilled}/${totalSlots} slots filled)</summary>
            <div class="detail-section-list">${sections}</div>
        </details>`;
}

function renderDetailPanel(landbookId, row, colSpan) {
    const ps = pipelineStatusIndex[landbookId] || {};
    const obs = ps.observations;
    const fct = ps.facts;
    const rep = ps.report;
    const hasData = !!row.data;
    const LANDBOOK_V3_BASE = window.__LANDBOOK_V3_URL || 'https://landbook.landlibrary.co';

    // Data fetch status
    let dataStatus = 'Never run';
    let dataStatusCls = 'detail-status-none';
    if (obs) {
        const failCount = obs.failed || 0;
        if (failCount > 0) {
            dataStatus = `${obs.ok}/${obs.total} sources OK, ${failCount} failed`;
            dataStatusCls = 'detail-status-warn';
        } else {
            dataStatus = `${obs.ok}/${obs.total} sources OK`;
            dataStatusCls = 'detail-status-ok';
        }
    }
    const dataTime = obs?.lastFetched ? formatDateShort(obs.lastFetched) : '—';

    // Facts status
    let factsStatus = 'Not generated';
    let factsStatusCls = 'detail-status-none';
    if (fct) {
        factsStatus = `v${fct.version || '?'}`;
        factsStatusCls = 'detail-status-ok';
    }
    const factsTime = fct?.updatedAt ? formatDateShort(fct.updatedAt) : '—';

    // Narratives status
    let narStatus = 'Not generated';
    let narStatusCls = 'detail-status-none';
    if (rep) {
        narStatus = `v${rep.version}, ${rep.totalVersions} version${rep.totalVersions !== 1 ? 's' : ''}`;
        narStatusCls = 'detail-status-ok';
    }
    const narTime = rep?.generatedAt ? formatDateShort(rep.generatedAt) : '—';
    const narModel = rep?.model || '—';

    return `<tr class="admin-detail-row"><td colspan="${colSpan}">
        <div class="detail-panel">
            <div class="detail-header">
                <a href="${LANDBOOK_V3_BASE}/dashboard/${escapeHtml(landbookId)}" target="_blank" class="detail-landbook-link detail-dashboard-link">Open Dashboard ↗</a>
                <a href="${LANDBOOK_V3_BASE}/${escapeHtml(landbookId)}" target="_blank" class="detail-landbook-link">Open LandBook ↗</a>
            </div>
            <div class="detail-grid">
                <!-- Fetch Data -->
                <div class="detail-card">
                    <div class="detail-card-header">
                        <span class="detail-card-title">Fetch Data</span>
                        <span class="detail-card-badge ${dataStatusCls}">${escapeHtml(dataStatus)}</span>
                    </div>
                    <div class="detail-card-meta">
                        <span class="detail-meta-label">Last run:</span>
                        <span class="detail-meta-value">${dataTime}</span>
                    </div>
                    <p class="detail-card-desc">Pulls from 22+ APIs (climate, soil, species, water, risk, etc.) and saves raw observations + processed facts.</p>
                    <button class="detail-action-btn" data-action="fetch-data" data-landbook-id="${escapeHtml(landbookId)}">
                        ${hasData ? '↻ Re-fetch Data' : '▶ Fetch Data'}
                    </button>
                    <div class="detail-action-result" id="result-fetch-${escapeHtml(landbookId)}"></div>
                    ${renderSourceList(obs)}
                </div>
                <!-- Generate Narratives -->
                <div class="detail-card">
                    <div class="detail-card-header">
                        <span class="detail-card-title">Generate Narratives</span>
                        <span class="detail-card-badge ${narStatusCls}">${escapeHtml(narStatus)}</span>
                    </div>
                    <div class="detail-card-meta">
                        <span class="detail-meta-label">Last run:</span>
                        <span class="detail-meta-value">${narTime}</span>
                    </div>
                    <div class="detail-card-meta">
                        <span class="detail-meta-label">Model:</span>
                        <span class="detail-meta-value">${escapeHtml(narModel)}</span>
                    </div>
                    <p class="detail-card-desc">Generates AI intro + callout text for each section using existing data. Does not re-fetch APIs.</p>
                    <button class="detail-action-btn" data-action="generate-narratives" data-landbook-id="${escapeHtml(landbookId)}" ${!hasData && !fct ? 'disabled title="Fetch data first"' : ''}>
                        ${rep ? '↻ Regenerate Narratives' : '▶ Generate Narratives'}
                    </button>
                    <div class="detail-action-result" id="result-nar-${escapeHtml(landbookId)}"></div>
                    ${renderNarrativeList(rep)}
                </div>
                <!-- Facts Summary -->
                <div class="detail-card">
                    <div class="detail-card-header">
                        <span class="detail-card-title">Facts</span>
                        <span class="detail-card-badge ${factsStatusCls}">${escapeHtml(factsStatus)}</span>
                    </div>
                    <div class="detail-card-meta">
                        <span class="detail-meta-label">Last updated:</span>
                        <span class="detail-meta-value">${factsTime}</span>
                    </div>
                    <p class="detail-card-desc">Processed data layer. Automatically rebuilt when data is fetched.</p>
                </div>
            </div>
        </div>
    </td></tr>`;
}

function bindDetailPanelActions(container) {
    container.querySelectorAll('.detail-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.action;
            const landbookId = btn.dataset.landbookId;
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Running...';
            btn.classList.add('running');

            const resultEl = action === 'fetch-data'
                ? document.getElementById(`result-fetch-${landbookId}`)
                : document.getElementById(`result-nar-${landbookId}`);

            if (resultEl) resultEl.innerHTML = '';

            try {
                let res, result;
                if (action === 'fetch-data') {
                    res = await fetch(`/api/landbooks/${landbookId}/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                    });
                    result = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(result.error || 'Pipeline failed');

                    // Show source summary
                    if (resultEl) {
                        const sources = result.sources || {};
                        const keys = Object.keys(sources);
                        const okCount = keys.filter(k => sources[k].ok).length;
                        const failCount = keys.length - okCount;
                        const layers = result.layers || {};

                        let html = `<div class="detail-result-ok">✓ ${okCount}/${keys.length} sources fetched`;
                        if (failCount) html += `, <span class="detail-result-warn">${failCount} failed</span>`;
                        html += `</div>`;

                        // Layer results
                        const layerItems = [
                            { name: 'Observations', l: layers.observations },
                            { name: 'Facts', l: layers.facts },
                            { name: 'Report', l: layers.report },
                        ];
                        html += '<div class="detail-result-layers">' + layerItems.map(li => {
                            const ok = li.l?.ok;
                            return `<span class="detail-result-layer ${ok ? 'ok' : 'fail'}">${li.name} ${ok ? '✓' : '✗'}</span>`;
                        }).join('') + '</div>';

                        // Narrative keys + error
                        const narKeys = result.narrativeKeys || [];
                        if (result.narrativeError) {
                            html += `<div class="detail-result-fail">⚠ Narratives failed: ${result.narrativeError}</div>`;
                        } else if (narKeys.length) {
                            html += `<div class="detail-result-nar">${narKeys.length} narrative sections generated</div>`;
                        }

                        resultEl.innerHTML = html;
                    }
                } else if (action === 'generate-narratives') {
                    res = await fetch(`/api/landbooks/${landbookId}/regenerate-narratives`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({}),
                    });
                    result = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(result.error || 'Narrative generation failed');

                    if (resultEl) {
                        const narKeys = result.narrativeKeys || [];
                        let html;
                        if (result.narrativeError) {
                            html = `<div class="detail-result-fail">⚠ Narratives failed: ${result.narrativeError}</div>`;
                        } else {
                            html = `<div class="detail-result-ok">✓ ${narKeys.length} narrative sections generated (v${result.version})</div>`;
                        }
                        if (result.cost) {
                            html += `<div class="detail-result-meta">${result.cost.inputTokens + result.cost.outputTokens} tokens · ~$${result.cost.estimatedUSD?.toFixed(4) || '?'}</div>`;
                        }
                        resultEl.innerHTML = html;
                    }
                }

                btn.textContent = originalText.replace('▶', '↻').replace('Fetch Data', 'Re-fetch Data').replace('Generate', 'Regenerate');
                btn.classList.remove('running');
                btn.classList.add('done');
                btn.disabled = false;

                // Reload server data so status updates persist
                setTimeout(() => loadData(), 1500);

            } catch (err) {
                btn.textContent = '✗ Failed';
                btn.classList.remove('running');
                btn.classList.add('failed');
                btn.disabled = false;

                if (resultEl) {
                    resultEl.innerHTML = `<div class="detail-result-error">${escapeHtml(err.message)}</div>`;
                }

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('failed');
                }, 3000);
            }
        });
    });
}

// ---- Data Pipeline ----
function renderPipelineEmpty() {
    document.getElementById('pipeline-tbody').innerHTML =
        '<tr><td colspan="8" class="admin-muted" style="text-align:center; padding:40px 0;">Click <strong>Test All</strong> to check every data source.</td></tr>';
    document.getElementById('pipeline-summary').textContent = '';
}

function getStatusInfo(s) {
    if (s.error === 'Retired (domain offline)') return { cls: 'retired', label: 'Retired' };
    if (s.ok) return { cls: 'ok', label: 'Healthy' };
    if (s.error?.startsWith('Partial:')) return { cls: 'partial', label: 'Partial' };
    if (s.needsKey && s.error?.includes('No API key')) return { cls: 'nokey', label: 'No Key' };
    if (s.error === 'Timeout') return { cls: 'timeout', label: 'Timeout' };
    return { cls: 'fail', label: 'Failing' };
}

function formatScope(scope) {
    const map = { global: 'Global', portugal: 'PT only', europe: 'Europe' };
    return map[scope] || scope || '—';
}

function formatAuth(auth) {
    const map = { open: 'Open', env: 'Env key', 'api-key': 'API key' };
    return map[auth] || auth || '—';
}

function updatePipelineSummary(sources) {
    const summary = document.getElementById('pipeline-summary');
    const ok = sources.filter(s => s.ok).length;
    const partial = sources.filter(s => !s.ok && s.error?.startsWith('Partial:')).length;
    const fail = sources.filter(s => !s.ok && !s.needsKey && s.error !== 'Retired (domain offline)' && s.error !== 'Timeout' && !s.error?.startsWith('Partial:')).length;
    const timeout = sources.filter(s => !s.ok && s.error === 'Timeout').length;
    const noKey = sources.filter(s => !s.ok && s.needsKey && s.error?.includes('No API key')).length;
    const retired = sources.filter(s => s.error === 'Retired (domain offline)').length;
    let parts = [`<strong>${ok}</strong> healthy`];
    if (partial) parts.push(`<strong style="color:#b8860b">${partial}</strong> partial`);
    if (fail) parts.push(`<strong style="color:var(--coral)">${fail}</strong> failing`);
    if (timeout) parts.push(`<strong style="color:#b8860b">${timeout}</strong> timeout`);
    if (noKey) parts.push(`<strong style="color:var(--muted)">${noKey}</strong> need key`);
    if (retired) parts.push(`<strong style="color:var(--muted)">${retired}</strong> retired`);
    summary.innerHTML = parts.join(' &nbsp;&middot;&nbsp; ');
}

function renderPipeline(sources) {
    const tbody = document.getElementById('pipeline-tbody');
    updatePipelineSummary(sources);

    tbody.innerHTML = sources.map(s => {
        const { cls, label } = getStatusInfo(s);
        const httpCode = s.status ? s.status : '—';
        const responseTime = s.ms ? `${s.ms}ms` : '—';
        const errorMsg = (!s.ok && s.error && s.error !== 'Timeout' && !s.error.includes('No API key') && s.error !== 'Retired (domain offline)' && !s.error.startsWith('Partial:')) ? `<div class="admin-pipeline-error">${escapeHtml(s.error)}</div>` : '';
        const notesHtml = s.notes ? `<div class="admin-pipeline-note">${escapeHtml(s.notes)}</div>` : '';

        // Sub-query breakdown for sources like Overpass
        let subHtml = '';
        if (s.subResults?.length) {
            subHtml = '<div class="admin-pipeline-subs">' + s.subResults.map(sq => {
                const sqCls = sq.ok ? 'ok' : 'fail';
                return `<span class="admin-pipeline-sub ${sqCls}">${escapeHtml(sq.name)} ${sq.status || '—'} ${sq.ms}ms</span>`;
            }).join('') + '</div>';
        } else if (s.subQueries?.length) {
            subHtml = '<div class="admin-pipeline-subs">' + s.subQueries.map(name =>
                `<span class="admin-pipeline-sub pending">${escapeHtml(name)}</span>`
            ).join('') + '</div>';
        }

        return `
        <tr class="admin-pipeline-row ${cls}" data-source-id="${s.id}">
            <td><span class="admin-pipeline-badge ${cls}">${label}</span></td>
            <td class="admin-pipeline-name">${escapeHtml(s.name)}${errorMsg}${notesHtml}${subHtml}</td>
            <td class="admin-pipeline-mono">${httpCode}</td>
            <td class="admin-pipeline-mono">${responseTime}</td>
            <td class="admin-pipeline-feeds-cell">${s.feeds.map(f => `<span class="admin-pipeline-feed">${escapeHtml(f)}</span>`).join('')}</td>
            <td><span class="admin-pipeline-scope ${s.scope || ''}">${formatScope(s.scope)}</span></td>
            <td><span class="admin-pipeline-auth ${s.auth || ''}">${formatAuth(s.auth)}</span></td>
            <td><button class="admin-pipeline-test-btn" data-source="${s.id}" title="Test this source">Re-test</button></td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.admin-pipeline-test-btn').forEach(btn => {
        btn.addEventListener('click', () => testSingleSource(btn.dataset.source));
    });
}

async function testAllSources() {
    if (pipelineTesting) return;
    pipelineTesting = true;
    const btn = document.getElementById('test-all-btn');
    btn.textContent = 'Testing...';
    btn.disabled = true;
    document.getElementById('pipeline-tbody').innerHTML =
        '<tr><td colspan="8" class="admin-muted" style="text-align:center; padding:40px 0;">Testing all sources... this may take a few seconds.</td></tr>';

    try {
        const res = await fetch('/api/admin/pipeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Pipeline test failed');
        const result = await res.json();
        pipelineResults = result.sources;
        renderPipeline(pipelineResults);
    } catch (err) {
        document.getElementById('pipeline-tbody').innerHTML =
            `<tr><td colspan="8" class="admin-muted" style="text-align:center; padding:40px 0; color:var(--coral)">Error: ${escapeHtml(err.message)}</td></tr>`;
    } finally {
        btn.textContent = 'Test All';
        btn.disabled = false;
        pipelineTesting = false;
    }
}

async function testSingleSource(sourceId) {
    const row = document.querySelector(`tr[data-source-id="${sourceId}"]`);
    const btn = row.querySelector('.admin-pipeline-test-btn');
    const badge = row.querySelector('.admin-pipeline-badge');
    btn.textContent = '...';
    btn.disabled = true;
    row.classList.remove('ok', 'fail', 'nokey', 'timeout', 'retired');
    row.classList.add('testing');
    badge.className = 'admin-pipeline-badge testing';
    badge.textContent = 'Testing';

    try {
        const res = await fetch('/api/admin/pipeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ source: sourceId }),
        });
        if (!res.ok) throw new Error('Test failed');
        const result = await res.json();

        if (pipelineResults) {
            const idx = pipelineResults.findIndex(s => s.id === sourceId);
            if (idx >= 0) pipelineResults[idx] = result;
        }

        renderPipeline(pipelineResults || [result]);
    } catch {
        btn.textContent = 'Re-test';
        btn.disabled = false;
        row.classList.remove('testing');
        row.classList.add('fail');
        badge.className = 'admin-pipeline-badge fail';
        badge.textContent = 'Error';
    }
}

document.getElementById('test-all-btn').addEventListener('click', testAllSources);

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

// ---- Inline styles (scoped to admin page) ----
const style = document.createElement('style');
style.textContent = `
    .admin-login {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: calc(100vh - 60px);
        padding: 20px;
    }
    .admin-login-card {
        width: 100%;
        max-width: 360px;
        text-align: center;
    }
    .admin-login-card h2 {
        margin-bottom: 8px;
    }
    .admin-btn {
        width: 100%;
        padding: 12px;
        margin-top: 12px;
        background: var(--black);
        color: var(--white);
        border: none;
        border-radius: var(--radius);
        font-size: 15px;
        font-family: inherit;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .admin-btn:hover { opacity: 0.8; }
    .admin-muted { color: var(--muted); font-size: 14px; margin-top: 4px; }
    .admin-error { color: var(--coral); font-size: 14px; margin-top: 12px; min-height: 20px; }

    .admin-container {
        max-width: 1300px;
        margin: 0 auto;
        padding: 32px 24px 60px;
    }
    .admin-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
    }
    .admin-stat-card {
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        text-align: center;
    }
    .admin-stat-count {
        font-family: 'DM Serif Display', serif;
        font-size: 32px;
        line-height: 1;
        margin-bottom: 4px;
    }
    .admin-stat-label {
        font-size: 13px;
        color: var(--muted);
        font-weight: 500;
    }
    .admin-tabs {
        display: flex;
        gap: 4px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 24px;
        overflow-x: auto;
    }
    .admin-tab {
        padding: 10px 18px;
        border: none;
        background: none;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        color: var(--muted);
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        transition: color 0.2s, border-color 0.2s;
    }
    .admin-tab:hover { color: var(--black); }
    .admin-tab.active {
        color: var(--black);
        border-bottom-color: var(--black);
    }
    .admin-table-wrap {
        overflow-x: auto;
    }
    .admin-table {
        border-collapse: collapse;
        font-size: 14px;
        width: 100%;
        table-layout: auto;
    }
    .admin-table th {
        text-align: left;
        padding: 10px 14px;
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--muted);
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
    }
    .admin-table td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .admin-table tr:hover td {
        background: rgba(0,0,0,0.02);
    }
    .admin-files-cell {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        max-width: 400px;
        white-space: normal;
    }
    .admin-file-btn {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        font-size: 12px;
        font-family: inherit;
        font-weight: 500;
        background: var(--cream, #f5f0eb);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        color: var(--black);
        transition: background 0.15s;
        white-space: nowrap;
    }
    .admin-file-btn:hover {
        background: var(--border);
    }
    .admin-region-actions {
        display: flex;
        gap: 6px;
        white-space: nowrap;
    }
    .admin-region-btn {
        padding: 4px 12px;
        font-size: 12px;
        font-family: inherit;
        font-weight: 600;
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        transition: opacity 0.15s;
    }
    .admin-region-btn:hover { opacity: 0.8; }
    .admin-region-btn:disabled { opacity: 0.5; cursor: default; }
    .admin-region-btn.approve {
        background: #2d6a4f;
        color: #fff;
        border-color: #2d6a4f;
    }
    .admin-region-btn.reject {
        background: var(--white, #fff);
        color: var(--coral, #e74c3c);
        border-color: var(--coral, #e74c3c);
    }
    .admin-status-badge {
        display: inline-block;
        padding: 3px 10px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 12px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }
    .admin-status-badge.approved {
        background: #d4edda;
        color: #2d6a4f;
    }
    .admin-status-badge.rejected {
        background: #fde8e8;
        color: #c0392b;
    }

    /* Expand button */
    .admin-expand-btn {
        padding: 4px 10px;
        font-size: 14px;
        font-family: inherit;
        background: none;
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        color: var(--muted);
        transition: all 0.15s;
        line-height: 1;
    }
    .admin-expand-btn:hover {
        color: var(--black);
        border-color: var(--black);
    }
    .admin-expand-btn.expanded {
        color: var(--black);
        background: var(--cream, #f5f0eb);
    }

    /* Detail panel (expandable row) */
    .admin-detail-row td {
        padding: 0 !important;
        border-bottom: 2px solid var(--border);
        max-width: none !important;
        overflow: visible !important;
        white-space: normal !important;
    }
    .detail-panel {
        background: #fafaf8;
        border-left: 3px solid #2d6a4f;
        padding: 20px 24px;
    }
    .detail-header {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-bottom: 16px;
    }
    .detail-dashboard-link {
        color: #C4705A !important;
        border-color: #C4705A !important;
    }
    .detail-dashboard-link:hover {
        background: #C4705A !important;
        color: #F5F1E8 !important;
    }
    .detail-landbook-link {
        font-size: 13px;
        font-weight: 600;
        color: #1B3A2F;
        text-decoration: none;
        padding: 4px 12px;
        border: 1px solid #1B3A2F;
        border-radius: 4px;
        transition: background 0.15s;
    }
    .detail-landbook-link:hover {
        background: #1B3A2F;
        color: #F5F1E8;
    }
    .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 16px;
        min-width: 0;
    }
    @media (max-width: 900px) {
        .detail-grid {
            grid-template-columns: 1fr 1fr;
        }
    }
    @media (max-width: 600px) {
        .detail-grid {
            grid-template-columns: 1fr;
        }
    }
    .detail-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 16px;
    }
    .detail-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
        gap: 8px;
    }
    .detail-card-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--black);
    }
    .detail-card-badge {
        display: inline-block;
        padding: 2px 8px;
        font-size: 10px;
        font-weight: 600;
        border-radius: 10px;
        white-space: nowrap;
        flex-shrink: 0;
    }
    .detail-status-ok {
        background: #d4edda;
        color: #1b5e20;
    }
    .detail-status-warn {
        background: #fff3cd;
        color: #856404;
    }
    .detail-status-none {
        background: #e9ecef;
        color: #6c757d;
    }
    .detail-card-meta {
        font-size: 11px;
        color: var(--muted);
        margin-bottom: 4px;
    }
    .detail-meta-label {
        font-weight: 600;
    }
    .detail-meta-value {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 10px;
    }
    .detail-card-desc {
        font-size: 11px;
        color: var(--muted);
        line-height: 1.4;
        margin: 8px 0 12px;
    }
    .detail-action-btn {
        width: 100%;
        padding: 6px 12px;
        font-size: 12px;
        font-family: inherit;
        font-weight: 600;
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        color: var(--black);
        transition: all 0.15s;
    }
    .detail-action-btn:hover {
        border-color: var(--black);
    }
    .detail-action-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .detail-action-btn.running {
        background: #fff3cd;
        border-color: #856404;
        color: #856404;
    }
    .detail-action-btn.done {
        background: #d4edda;
        border-color: #1b5e20;
        color: #1b5e20;
    }
    .detail-action-btn.failed {
        background: #fde8e8;
        border-color: #c62828;
        color: #c62828;
    }
    .detail-action-result {
        margin-top: 8px;
        font-size: 11px;
    }
    .detail-result-ok {
        color: #1b5e20;
        font-weight: 600;
    }
    .detail-result-warn {
        color: #856404;
    }
    .detail-result-error, .detail-result-fail {
        color: #c62828;
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 11px;
        font-weight: 600;
    }
    .detail-result-layers {
        display: flex;
        gap: 4px;
        margin-top: 4px;
    }
    .detail-result-layer {
        display: inline-block;
        padding: 1px 6px;
        font-size: 10px;
        font-weight: 600;
        border-radius: 3px;
    }
    .detail-result-layer.ok {
        background: #d4edda;
        color: #1b5e20;
    }
    .detail-result-layer.fail {
        background: #fde8e8;
        color: #c62828;
    }
    .detail-result-nar {
        color: #7c3aed;
        font-weight: 600;
        margin-top: 4px;
    }
    .detail-breakdown {
        margin-top: 10px;
        border-top: 1px solid var(--border);
        padding-top: 8px;
    }
    .detail-breakdown > summary {
        font-size: 11px;
        font-weight: 600;
        color: var(--muted);
        cursor: pointer;
        padding: 4px 0;
        list-style: none;
        user-select: none;
    }
    .detail-breakdown > summary::-webkit-details-marker { display: none; }
    .detail-breakdown > summary::before {
        content: "▸ ";
        display: inline-block;
        transition: transform 0.15s;
        color: var(--muted);
    }
    .detail-breakdown[open] > summary::before {
        transform: rotate(90deg);
    }
    .detail-source-list {
        list-style: none;
        margin: 6px 0 0;
        padding: 0;
        font-size: 11px;
    }
    .detail-source-list li {
        display: flex;
        align-items: baseline;
        gap: 6px;
        padding: 3px 0;
        border-bottom: 1px dotted var(--border);
        line-height: 1.4;
    }
    .detail-source-list li:last-child { border-bottom: none; }
    .detail-source-icon {
        font-weight: 600;
        width: 12px;
        flex-shrink: 0;
    }
    .detail-source-ok .detail-source-icon { color: #1b5e20; }
    .detail-source-fail .detail-source-icon { color: #c62828; }
    .detail-source-label {
        font-weight: 500;
        color: var(--black);
    }
    .detail-source-group {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--muted);
        background: var(--cream);
        padding: 1px 5px;
        border-radius: 2px;
    }
    .detail-source-err {
        color: #c62828;
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 10px;
        margin-left: auto;
    }
    .detail-section-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 6px;
    }
    .detail-section {
        border: 1px solid var(--border);
        border-radius: 3px;
        background: #fff;
    }
    .detail-section > summary {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        font-size: 11px;
        cursor: pointer;
        list-style: none;
        user-select: none;
    }
    .detail-section > summary::-webkit-details-marker { display: none; }
    .detail-section-icon {
        width: 14px;
        text-align: center;
        font-weight: 600;
    }
    .detail-section-ok .detail-section-icon { color: #1b5e20; }
    .detail-section-partial .detail-section-icon { color: #b8860b; }
    .detail-section-empty .detail-section-icon { color: #c62828; }
    .detail-section-key {
        font-weight: 600;
        color: var(--black);
        flex: 1;
    }
    .detail-section-count {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 10px;
        color: var(--muted);
    }
    .detail-section-body {
        padding: 4px 10px 10px;
        border-top: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .detail-slot {
        padding: 6px 0 0;
    }
    .detail-slot-key {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 10px;
        color: var(--muted);
        margin-right: 6px;
    }
    .detail-slot-meta {
        font-size: 10px;
        color: var(--muted);
    }
    .detail-slot-text {
        font-size: 12px;
        color: var(--black);
        margin-top: 2px;
        line-height: 1.45;
    }
    .detail-slot-empty .detail-slot-key {
        color: #c62828;
    }
    .detail-slot-empty .detail-slot-meta {
        color: #c62828;
        font-style: italic;
    }
    .detail-result-meta {
        color: var(--muted);
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 10px;
        margin-top: 2px;
    }

    /* Pipeline table */
    .admin-pipeline-table {
        width: 100%;
        border-collapse: collapse;
    }
    .admin-pipeline-table th {
        text-align: left;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--muted);
        padding: 8px 12px;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
    }
    .admin-pipeline-table td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--border);
        font-size: 13px;
        vertical-align: middle;
    }
    .admin-pipeline-row:hover {
        background: var(--cream, #f5f0eb);
    }
    .admin-pipeline-row.testing {
        opacity: 0.6;
    }

    /* Status badges */
    .admin-pipeline-badge {
        display: inline-block;
        padding: 3px 10px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 10px;
        white-space: nowrap;
    }
    .admin-pipeline-badge.ok {
        background: #d4edda;
        color: #1b5e20;
    }
    .admin-pipeline-badge.fail {
        background: #fde8e8;
        color: #c62828;
    }
    .admin-pipeline-badge.timeout {
        background: #fff3cd;
        color: #856404;
    }
    .admin-pipeline-badge.nokey {
        background: #e9ecef;
        color: #6c757d;
    }
    .admin-pipeline-badge.retired {
        background: #e9ecef;
        color: #999;
    }
    .admin-pipeline-badge.partial {
        background: #fff3cd;
        color: #856404;
    }
    .admin-pipeline-badge.testing {
        background: #fff3cd;
        color: #856404;
    }

    /* Row cells */
    .admin-pipeline-name {
        font-weight: 600;
        font-size: 13px;
        white-space: normal;
    }
    .admin-pipeline-row.retired .admin-pipeline-name {
        text-decoration: line-through;
        opacity: 0.6;
    }
    .admin-pipeline-error {
        font-size: 11px;
        color: var(--coral, #e74c3c);
        margin-top: 2px;
        font-weight: 400;
    }
    .admin-pipeline-note {
        font-size: 11px;
        color: var(--muted);
        font-weight: 400;
        margin-top: 2px;
        font-style: italic;
    }
    .admin-pipeline-subs {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        margin-top: 4px;
    }
    .admin-pipeline-sub {
        display: inline-block;
        padding: 1px 6px;
        font-size: 10px;
        font-weight: 500;
        border-radius: 3px;
        white-space: nowrap;
        font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .admin-pipeline-sub.ok {
        background: #d4edda;
        color: #1b5e20;
    }
    .admin-pipeline-sub.fail {
        background: #fde8e8;
        color: #c62828;
    }
    .admin-pipeline-sub.pending {
        background: #e9ecef;
        color: #6c757d;
    }
    .admin-pipeline-scope, .admin-pipeline-auth {
        display: inline-block;
        padding: 2px 8px;
        font-size: 11px;
        border-radius: 3px;
        white-space: nowrap;
        font-weight: 500;
    }
    .admin-pipeline-scope {
        background: var(--cream, #f5f0eb);
        color: var(--muted);
    }
    .admin-pipeline-scope.portugal {
        background: #e8f0fe;
        color: #1a56db;
    }
    .admin-pipeline-scope.europe {
        background: #e8f0fe;
        color: #5b7fa6;
    }
    .admin-pipeline-auth {
        background: var(--cream, #f5f0eb);
        color: var(--muted);
    }
    .admin-pipeline-auth.env, .admin-pipeline-auth.api-key {
        background: #fff3cd;
        color: #856404;
    }
    .admin-pipeline-mono {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 12px;
        color: var(--muted);
    }
    .admin-pipeline-feeds-cell {
        max-width: 280px;
    }
    .admin-pipeline-feed {
        display: inline-block;
        padding: 2px 8px;
        font-size: 11px;
        background: var(--cream, #f5f0eb);
        border-radius: 3px;
        color: var(--muted);
        white-space: nowrap;
        margin: 1px 2px;
    }
    .admin-pipeline-test-btn {
        padding: 3px 10px;
        font-size: 11px;
        font-family: inherit;
        font-weight: 600;
        background: var(--cream, #f5f0eb);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        color: var(--muted);
        transition: all 0.15s;
        white-space: nowrap;
    }
    .admin-pipeline-test-btn:hover {
        color: var(--black);
        border-color: var(--black);
    }
    .admin-pipeline-test-btn:disabled {
        opacity: 0.5;
        cursor: default;
    }

    /* Pipeline status column */
    .pip-cell {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        white-space: normal;
        max-width: 260px;
    }
    .pip-chip {
        display: inline-block;
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 600;
        border-radius: 3px;
        white-space: nowrap;
    }
    .pip-ok {
        background: #d4edda;
        color: #1b5e20;
    }
    .pip-warn {
        background: #fff3cd;
        color: #856404;
    }
    .pip-time {
        font-size: 10px;
        color: var(--muted);
        white-space: nowrap;
    }
    .pip-empty {
        font-size: 11px;
    }
`;
document.head.appendChild(style);
