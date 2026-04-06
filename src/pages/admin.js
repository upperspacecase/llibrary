import '../styles/main.css';

// ---- State ----
let data = {};
let activeTab = 'waitlist';
let password = '';

// ---- Column configs per collection ----
const columns = {
    waitlist: [
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Address' },
        { key: 'files', label: 'Attachments', format: formatFiles },
        { key: 'createdAt', label: 'Signed up', format: formatDate },
    ],
    properties: [
        { key: 'id', label: 'ID' },
        { key: 'created', label: 'Created', format: formatDate },
    ],
    landbooks: [
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Address' },
        { key: 'area', label: 'Area', format: v => v ? `${Number(v).toLocaleString()} m2` : '-' },
        { key: 'created', label: 'Created', format: formatDate },
    ],
    submissions: [
        { key: 'name', label: 'Name' },
        { key: 'contact', label: 'Contact' },
        { key: 'contactMethod', label: 'Via' },
        { key: 'postcode', label: 'Postcode' },
        { key: 'area', label: 'Area', format: v => v ? `${(v / 10000).toFixed(2)} ha` : '-' },
        { key: 'landCondition', label: 'Condition', format: v => Array.isArray(v) && v.length ? v.join(', ') : '-' },
        { key: 'landGoals', label: 'Goals', format: v => Array.isArray(v) && v.length ? v.join(', ') : '-' },
        { key: 'waterReliability', label: 'Water' },
        { key: 'challenges', label: 'Challenges', format: v => Array.isArray(v) && v.length ? v.join(', ') : '-' },
        { key: 'notes', label: 'Notes' },
        { key: 'files', label: 'Files', format: formatFiles },
        { key: 'created', label: 'Date', format: formatDate },
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
            body: JSON.stringify({ password, url, filename }),
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
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('password-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
});

async function login() {
    const input = document.getElementById('password-input');
    const error = document.getElementById('login-error');
    password = input.value.trim();

    if (!password) { error.textContent = 'Enter a password.'; return; }

    try {
        const res = await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        if (!res.ok) {
            error.textContent = 'Wrong password.';
            return;
        }

        error.textContent = '';
        await loadData();
    } catch {
        error.textContent = 'Connection error.';
    }
}

async function loadData() {
    const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });

    if (!res.ok) return;

    data = await res.json();

    // Merge submission attachments into waitlist rows by email
    if (data.submissions?.length && data.waitlist?.length) {
        const filesByEmail = {};
        for (const sub of data.submissions) {
            if (sub.email && sub.files?.length) {
                if (!filesByEmail[sub.email]) filesByEmail[sub.email] = [];
                filesByEmail[sub.email].push(...sub.files);
            }
        }
        for (const entry of data.waitlist) {
            if (entry.email && filesByEmail[entry.email]) {
                entry.files = filesByEmail[entry.email];
            }
        }
    }

    // Aggregate region requests from waitlist
    const regionMap = new Map();
    for (const entry of (data.waitlist || [])) {
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
    renderStats();
    renderTable();
}

// ---- Stats ----
function renderStats() {
    const stats = [
        { label: 'Waitlist', count: data.waitlist?.length || 0 },
        { label: 'Submissions', count: data.submissions?.length || 0 },
        { label: 'Properties', count: data.properties?.length || 0 },
        { label: 'Landbooks', count: data.landbooks?.length || 0 },
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
    renderTable();
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
            const val = c.format ? c.format(raw) : (raw ?? '-');
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
                    body: JSON.stringify({ password, region, status }),
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
    .admin-login-card input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-size: 15px;
        font-family: inherit;
        background: var(--white);
        margin-top: 24px;
    }
    .admin-login-card input:focus {
        outline: none;
        border-color: var(--black);
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
        max-width: 1100px;
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
        width: 100%;
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
`;
document.head.appendChild(style);
