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
    submissions: [
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Address' },
        { key: 'notes', label: 'Notes' },
        { key: 'files', label: 'Attachments', format: formatFiles },
        { key: 'created', label: 'Submitted', format: formatDate },
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
            body: JSON.stringify({ password, url }),
        });
        if (!res.ok) throw new Error('Download failed');
        const { downloadUrl } = await res.json();
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
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
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    renderStats();
    renderTable();
}

// ---- Stats ----
function renderStats() {
    const stats = [
        { label: 'Waitlist', count: data.waitlist?.length || 0 },
        { label: 'Properties', count: data.properties?.length || 0 },
        { label: 'Landbooks', count: data.landbooks?.length || 0 },
        { label: 'Contributions', count: data.contributions?.length || 0 },
        { label: 'Resources', count: data.resources?.length || 0 },
        { label: 'Submissions', count: data.submissions?.length || 0 },
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
`;
document.head.appendChild(style);
