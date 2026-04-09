import '../styles/main.css';

// ---- State ----
let data = {};
let reportVersions = []; // keyed by submission_id string
let activeTab = 'submissions';
let pipelineResults = null;
let pipelineTesting = false;

// ---- Column configs per collection ----
const columns = {
    submissions: [
        { key: '_who', label: 'Who', format: (_, row) => row.name || row.email || row.contact || '-' },
        { key: '_location', label: 'Location', format: (_, row) => row.address || row.postcode || '-' },
        { key: '_report', label: 'Report', format: (_, row) => `__REPORT__${row._id || row.id || ''}` },
        { key: 'area', label: 'Area', format: v => v ? `${(v / 10000).toFixed(2)} ha` : '-' },
        { key: 'files', label: 'Files', format: formatFiles },
        { key: '_date', label: 'Date', format: formatDate },
        { key: 'contact', label: 'Contact', format: (v, row) => row.email || v || '-' },
        { key: '_type', label: 'Type' },
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

    if (activeTab === 'pipeline') {
        tableView.style.display = 'none';
        pipelineView.style.display = 'block';
        if (!pipelineResults) renderPipelineEmpty();
    } else {
        tableView.style.display = 'block';
        pipelineView.style.display = 'none';
        renderTable();
    }
});

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
            if (str.startsWith('__REPORT__')) {
                const subId = str.slice(10);
                if (!subId) return '<td class="admin-muted">—</td>';
                if (row._type === 'landbook') {
                    const hasData = !!row.data;
                    return `<td class="admin-report-cell"><button class="admin-landbook-v3-btn" data-landbook-id="${escapeHtml(subId)}" title="Open LandBook">LandBook</button><button class="admin-pipeline-run-btn" data-landbook-id="${escapeHtml(subId)}" title="${hasData ? 'Re-run data pipeline' : 'Run data pipeline'}">${hasData ? '↻ Refresh' : '▶ Run Pipeline'}</button></td>`;
                }
                if (row._type !== 'submission') return '<td class="admin-muted">—</td>';
                const subHasData = !!row.data;
                return `<td class="admin-report-cell"><button class="admin-landbook-v3-btn" data-landbook-id="${escapeHtml(row.id || '')}" title="Open LandBook">LandBook</button><button class="admin-pipeline-run-btn" data-landbook-id="${escapeHtml(row.id || '')}" title="${subHasData ? 'Re-run data pipeline' : 'Run data pipeline'}">${subHasData ? '↻ Refresh' : '▶ Run Pipeline'}</button></td>`;
            }
            if (str === '__REGION_ACTIONS__') {
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
        return `<tr>${cells}</tr>`;
    }).join('');

    // Bind download click handlers
    body.querySelectorAll('.admin-file-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            downloadFile(btn.dataset.url, btn.dataset.name);
        });
    });

    // Bind landbook V3 (Next.js) click handlers
    const LANDBOOK_V3_BASE = window.__LANDBOOK_V3_URL || 'https://landbook.landlibrary.co';
    body.querySelectorAll('.admin-landbook-v3-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.open(`${LANDBOOK_V3_BASE}/${btn.dataset.landbookId}`, '_blank');
        });
    });

    // Bind pipeline run button handlers
    body.querySelectorAll('.admin-pipeline-run-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const landbookId = btn.dataset.landbookId;
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Running...';
            btn.classList.add('running');

            // Remove any existing results panel for this row
            const row = btn.closest('tr');
            const existingPanel = row.nextElementSibling;
            if (existingPanel?.classList.contains('admin-pipeline-results-row')) {
                existingPanel.remove();
            }

            try {
                const res = await fetch(`/api/landbooks/${landbookId}/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                const result = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(result.error || 'Pipeline failed');
                }

                btn.textContent = '✓ Done';
                btn.classList.remove('running');
                btn.classList.add('done');

                // Show detailed results panel
                showPipelineResults(row, result);

                // Reload data after delay so button updates to "Refresh"
                setTimeout(() => loadData(), 5000);
            } catch (err) {
                btn.textContent = '✗ Failed';
                btn.classList.remove('running');
                btn.classList.add('failed');
                btn.title = err.message;

                // Show error panel
                showPipelineError(row, err.message);

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('failed');
                    btn.disabled = false;
                }, 5000);
            }
        });
    });

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

// ---- Pipeline Results Panel ----

function showPipelineResults(row, result) {
    const sources = result.sources || {};
    const layers = result.layers || {};
    const scores = result.scores || {};
    const meta = result.meta || {};

    const sourceKeys = Object.keys(sources);
    const okCount = sourceKeys.filter(k => sources[k].ok).length;
    const failCount = sourceKeys.length - okCount;

    // Build source chips
    const sourceChips = sourceKeys.map(key => {
        const s = sources[key];
        const cls = s.ok ? 'pr-src-ok' : 'pr-src-fail';
        const tip = s.ok ? key : `${key}: ${s.error}`;
        return `<span class="${cls}" title="${escapeHtml(tip)}">${escapeHtml(key)}</span>`;
    }).join('');

    // Layer status
    const layerItems = [
        { name: 'Observations', data: layers.observations, detail: layers.observations?.ok ? `${layers.observations.count} saved` : layers.observations?.error },
        { name: 'Facts', data: layers.facts, detail: layers.facts?.ok ? 'rebuilt' : layers.facts?.error },
        { name: 'Report', data: layers.report, detail: layers.report?.ok ? `v${layers.report.version}` : layers.report?.error },
    ];
    const layerHtml = layerItems.map(l => {
        const ok = l.data?.ok;
        return `<span class="pr-layer ${ok ? 'pr-layer-ok' : 'pr-layer-fail'}">${l.name}: ${l.detail || (ok ? '✓' : '✗')}</span>`;
    }).join('');

    // Scores
    const scoreHtml = scores.naturalCapital != null
        ? `<span class="pr-score">NC ${scores.naturalCapital}</span>` +
          `<span class="pr-score">C ${scores.carbon ?? '—'}</span>` +
          `<span class="pr-score">B ${scores.biodiversity ?? '—'}</span>` +
          `<span class="pr-score">W ${scores.water ?? '—'}</span>` +
          `<span class="pr-score">S ${scores.soil ?? '—'}</span>`
        : '<span class="pr-muted">No scores</span>';

    // Narratives
    const narKeys = result.narrativeKeys || [];
    const narHtml = narKeys.length > 0
        ? `<span class="pr-nar">${narKeys.length} narratives</span>`
        : '<span class="pr-muted">No narratives</span>';

    // Uncertainty
    const unc = meta.uncertainty;
    const uncHtml = unc ? `<span class="pr-unc">${unc.label} (${unc.completeness}% complete)</span>` : '';

    const colSpan = row.children.length;
    const panelRow = document.createElement('tr');
    panelRow.className = 'admin-pipeline-results-row';
    panelRow.innerHTML = `<td colspan="${colSpan}">
        <div class="pr-panel">
            <div class="pr-section">
                <div class="pr-heading">Sources <span class="pr-count">${okCount}/${sourceKeys.length} ok${failCount ? `, ${failCount} failed` : ''}</span></div>
                <div class="pr-chips">${sourceChips}</div>
            </div>
            <div class="pr-section">
                <div class="pr-heading">Storage Layers</div>
                <div class="pr-chips">${layerHtml}</div>
            </div>
            <div class="pr-section">
                <div class="pr-heading">Scores</div>
                <div class="pr-chips">${scoreHtml}</div>
            </div>
            <div class="pr-row-flex">
                <div class="pr-section">
                    <div class="pr-heading">Narratives</div>
                    <div class="pr-chips">${narHtml}</div>
                </div>
                <div class="pr-section">
                    <div class="pr-heading">Confidence</div>
                    <div class="pr-chips">${uncHtml}</div>
                </div>
            </div>
            <button class="pr-close" onclick="this.closest('.admin-pipeline-results-row').remove()">Dismiss</button>
        </div>
    </td>`;
    row.after(panelRow);
}

function showPipelineError(row, message) {
    const colSpan = row.children.length;
    const panelRow = document.createElement('tr');
    panelRow.className = 'admin-pipeline-results-row';
    panelRow.innerHTML = `<td colspan="${colSpan}">
        <div class="pr-panel pr-panel-error">
            <div class="pr-heading" style="color:var(--coral,#e74c3c)">Pipeline Failed</div>
            <div class="pr-error-msg">${escapeHtml(message)}</div>
            <button class="pr-close" onclick="this.closest('.admin-pipeline-results-row').remove()">Dismiss</button>
        </div>
    </td>`;
    row.after(panelRow);
}

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

    /* Report generation controls */
    .admin-report-cell {
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
    }
    .admin-version-select {
        padding: 4px 8px;
        font-size: 12px;
        font-family: inherit;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--white);
        cursor: pointer;
        max-width: 180px;
    }
    .admin-version-select:focus {
        outline: none;
        border-color: var(--black);
    }
    .admin-landbook-v3-btn {
        padding: 4px 10px;
        font-size: 12px;
        font-family: inherit;
        font-weight: 500;
        background: #1B3A2F;
        border: 1px solid #1B3A2F;
        border-radius: 4px;
        cursor: pointer;
        color: #F5F1E8;
        transition: background 0.15s;
        white-space: nowrap;
    }
    .admin-landbook-v3-btn:hover {
        background: #274e3d;
    }
    .admin-pipeline-run-btn {
        padding: 4px 10px;
        font-size: 12px;
        font-family: inherit;
        font-weight: 500;
        background: var(--white, #fff);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        color: var(--muted);
        transition: all 0.15s;
        white-space: nowrap;
    }
    .admin-pipeline-run-btn:hover {
        color: var(--black);
        border-color: var(--black);
    }
    .admin-pipeline-run-btn:disabled {
        opacity: 0.7;
        cursor: default;
    }
    .admin-pipeline-run-btn.running {
        background: #fff3cd;
        border-color: #856404;
        color: #856404;
    }
    .admin-pipeline-run-btn.done {
        background: #d4edda;
        border-color: #1b5e20;
        color: #1b5e20;
    }
    .admin-pipeline-run-btn.failed {
        background: #fde8e8;
        border-color: #c62828;
        color: #c62828;
    }

    /* Pipeline results panel (inline below row) */
    .admin-pipeline-results-row td {
        padding: 0 !important;
        border-bottom: 2px solid var(--border);
    }
    .pr-panel {
        background: #fafaf8;
        border-left: 3px solid #2d6a4f;
        padding: 16px 20px;
        margin: 0;
    }
    .pr-panel-error {
        border-left-color: var(--coral, #e74c3c);
    }
    .pr-section {
        margin-bottom: 12px;
    }
    .pr-section:last-of-type {
        margin-bottom: 8px;
    }
    .pr-heading {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--muted);
        margin-bottom: 6px;
    }
    .pr-count {
        font-weight: 400;
        text-transform: none;
        letter-spacing: 0;
    }
    .pr-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
    }
    .pr-row-flex {
        display: flex;
        gap: 32px;
    }
    .pr-src-ok {
        display: inline-block;
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 500;
        font-family: 'SF Mono', 'Fira Code', monospace;
        border-radius: 3px;
        background: #d4edda;
        color: #1b5e20;
        white-space: nowrap;
    }
    .pr-src-fail {
        display: inline-block;
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 500;
        font-family: 'SF Mono', 'Fira Code', monospace;
        border-radius: 3px;
        background: #fde8e8;
        color: #c62828;
        white-space: nowrap;
        cursor: help;
    }
    .pr-layer {
        display: inline-block;
        padding: 3px 10px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 10px;
        white-space: nowrap;
    }
    .pr-layer-ok {
        background: #d4edda;
        color: #1b5e20;
    }
    .pr-layer-fail {
        background: #fde8e8;
        color: #c62828;
    }
    .pr-score {
        display: inline-block;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 600;
        font-family: 'SF Mono', 'Fira Code', monospace;
        background: #e8f0fe;
        color: #1a56db;
        border-radius: 3px;
        white-space: nowrap;
    }
    .pr-nar {
        display: inline-block;
        padding: 3px 10px;
        font-size: 11px;
        font-weight: 600;
        background: #f3e8ff;
        color: #7c3aed;
        border-radius: 10px;
    }
    .pr-unc {
        display: inline-block;
        padding: 3px 10px;
        font-size: 11px;
        font-weight: 500;
        background: var(--cream, #f5f0eb);
        color: var(--muted);
        border-radius: 10px;
    }
    .pr-muted {
        font-size: 11px;
        color: var(--muted);
        font-style: italic;
    }
    .pr-error-msg {
        font-size: 13px;
        color: var(--coral, #e74c3c);
        margin: 8px 0;
        font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .pr-close {
        margin-top: 8px;
        padding: 3px 12px;
        font-size: 11px;
        font-family: inherit;
        font-weight: 500;
        background: none;
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        color: var(--muted);
    }
    .pr-close:hover {
        color: var(--black);
        border-color: var(--black);
    }
`;
document.head.appendChild(style);
