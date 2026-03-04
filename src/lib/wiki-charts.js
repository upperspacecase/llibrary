/**
 * wiki-charts.js — Lightweight canvas chart renderers + HTML component generators
 * for the wiki dashboard panels.
 *
 * All chart functions draw onto a <canvas> element.
 * All HTML generators insert into a container <div>.
 */

// ─── Color Helpers ──────────────────────────────────────────────────────────

const CHART_PALETTE = [
    '#2d5a3d', '#8b9a46', '#d4a574', '#4a90a4', '#8b7355',
    '#c4b5a0', '#6B8E23', '#8B4513', '#2B7BB9', '#CC6633',
    '#8B4789', '#B8860B', '#E8A317', '#2E8B57',
];

function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Canvas Utilities ───────────────────────────────────────────────────────

function setupCanvas(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
}

// ─── Stat Cards ─────────────────────────────────────────────────────────────

/**
 * Render a row of stat cards.
 * @param {HTMLElement} container
 * @param {Array<{label:string, value:string, sublabel?:string, color?:string}>} cards
 */
export function renderStatCards(container, cards) {
    const row = document.createElement('div');
    row.className = 'wiki-stat-row';
    cards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'wiki-stat-card';
        el.innerHTML = `
      <span class="wiki-stat-label">${card.label}</span>
      <span class="wiki-stat-value" ${card.color ? `style="color:${card.color}"` : ''}>${card.value}</span>
      ${card.sublabel ? `<span class="wiki-stat-sublabel">${card.sublabel}</span>` : ''}
    `;
        row.appendChild(el);
    });
    container.appendChild(row);
}

// ─── Pie / Donut Chart ──────────────────────────────────────────────────────

/**
 * Draw a donut chart with color legend.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{name:string, value:number, color?:string}>} data
 * @param {{title?:string, width?:number, height?:number}} opts
 */
export function drawPieChart(canvas, data, opts = {}) {
    const W = opts.width || 500;
    const H = opts.height || 280;
    const ctx = setupCanvas(canvas, W, H);

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return;

    const cx = W * 0.35;
    const cy = H * 0.5;
    const outerR = Math.min(cx, cy) - 20;
    const innerR = outerR * 0.55;

    let startAngle = -Math.PI / 2;

    data.forEach((d, i) => {
        const slice = (d.value / total) * Math.PI * 2;
        const color = d.color || CHART_PALETTE[i % CHART_PALETTE.length];

        ctx.beginPath();
        ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle));
        ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
        ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Percentage label
        const midAngle = startAngle + slice / 2;
        const labelR = outerR + 14;
        const lx = cx + labelR * Math.cos(midAngle);
        const ly = cy + labelR * Math.sin(midAngle);
        const pct = ((d.value / total) * 100).toFixed(1);
        ctx.fillStyle = '#374151';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pct, lx, ly);

        startAngle += slice;
    });

    // Legend
    const legendX = W * 0.68;
    let legendY = 24;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    data.forEach((d, i) => {
        const color = d.color || CHART_PALETTE[i % CHART_PALETTE.length];
        ctx.fillStyle = color;
        ctx.fillRect(legendX, legendY - 5, 12, 12);
        ctx.fillStyle = '#374151';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(d.name, legendX + 18, legendY + 1);
        legendY += 22;
    });
}

// ─── Horizontal Bar Chart ───────────────────────────────────────────────────

/**
 * Draw a horizontal bar chart.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{name:string, value:number, color?:string}>} data
 * @param {{title?:string, width?:number, height?:number, barColor?:string}} opts
 */
export function drawBarChart(canvas, data, opts = {}) {
    const W = opts.width || 600;
    const rowH = 36;
    const padTop = 10;
    const padBottom = 30;
    const padLeft = 120;
    const padRight = 30;
    const H = opts.height || (padTop + data.length * rowH + padBottom);
    const ctx = setupCanvas(canvas, W, H);

    const maxVal = Math.max(...data.map(d => d.value));
    const chartW = W - padLeft - padRight;

    // Grid lines
    const gridSteps = 5;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSteps; i++) {
        const x = padLeft + (chartW / gridSteps) * i;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, H - padBottom);
        ctx.stroke();

        // Axis label
        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round((maxVal / gridSteps) * i), x, H - padBottom + 16);
    }

    // Bars
    const barH = rowH * 0.55;
    data.forEach((d, i) => {
        const y = padTop + i * rowH;
        const barW = (d.value / maxVal) * chartW;
        const color = d.color || opts.barColor || CHART_PALETTE[0];

        ctx.fillStyle = color;
        ctx.beginPath();
        const r = 3;
        ctx.roundRect(padLeft, y + (rowH - barH) / 2, barW, barH, [0, r, r, 0]);
        ctx.fill();

        // Category label
        ctx.fillStyle = '#374151';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.name, padLeft - 8, y + rowH / 2);
    });
}

// ─── Dual-Axis Area Chart ───────────────────────────────────────────────────

/**
 * Draw a dual-axis temperature+precipitation area chart.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} data — { labels:string[], datasets:[{label, values[], color, fillOpacity?}] }
 * @param {{width?:number, height?:number}} opts
 */
export function drawAreaChart(canvas, data, opts = {}) {
    const W = opts.width || 600;
    const H = opts.height || 300;
    const ctx = setupCanvas(canvas, W, H);

    const padTop = 20;
    const padBottom = 50;
    const padLeft = 45;
    const padRight = 50;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;

    const labels = data.labels;
    const n = labels.length;

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(W - padRight, y);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // X-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((l, i) => {
        const x = padLeft + (chartW / (n - 1)) * i;
        ctx.fillText(l, x, H - padBottom + 18);
    });

    // Draw each dataset
    data.datasets.forEach((ds, dsIdx) => {
        const vals = ds.values;
        const maxVal = Math.max(...vals) * 1.15;
        const points = vals.map((v, i) => ({
            x: padLeft + (chartW / (n - 1)) * i,
            y: padTop + chartH - (v / maxVal) * chartH,
        }));

        // Area fill
        ctx.beginPath();
        ctx.moveTo(points[0].x, padTop + chartH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, padTop + chartH);
        ctx.closePath();
        ctx.fillStyle = hexToRgba(ds.color, ds.fillOpacity || 0.25);
        ctx.fill();

        // Line
        ctx.beginPath();
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Y-axis (left for first, right for second)
        const side = dsIdx === 0 ? 'left' : 'right';
        ctx.fillStyle = ds.color;
        ctx.font = '11px system-ui, sans-serif';
        for (let i = 0; i <= 4; i++) {
            const v = Math.round((maxVal / 4) * (4 - i));
            const y = padTop + (chartH / 4) * i;
            if (side === 'left') {
                ctx.textAlign = 'right';
                ctx.fillText(v, padLeft - 8, y + 4);
            } else {
                ctx.textAlign = 'left';
                ctx.fillText(v, W - padRight + 8, y + 4);
            }
        }
    });

    // Legend at bottom
    let lx = W / 2 - 120;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    data.datasets.forEach(ds => {
        ctx.fillStyle = ds.color;
        ctx.fillRect(lx, H - 14, 20, 3);
        ctx.beginPath();
        ctx.arc(lx + 10, H - 13, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#374151';
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(ds.label, lx + 26, H - 12);
        lx += 140;
    });
}

// ─── Radar Chart ────────────────────────────────────────────────────────────

/**
 * Draw a radar / spider chart.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{axis:string, value:number, max?:number}>} data
 * @param {{width?:number, height?:number, color?:string}} opts
 */
export function drawRadarChart(canvas, data, opts = {}) {
    const W = opts.width || 320;
    const H = opts.height || 280;
    const ctx = setupCanvas(canvas, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.min(cx, cy) - 40;
    const n = data.length;
    const color = opts.color || '#dc2626';
    const rings = 4;

    // Angle helper
    const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

    // Grid rings
    for (let r = 1; r <= rings; r++) {
        const radius = (maxR / rings) * r;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
            const a = angle(i % n);
            const x = cx + radius * Math.cos(a);
            const y = cy + radius * Math.sin(a);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Spokes
    for (let i = 0; i < n; i++) {
        const a = angle(i);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + maxR * Math.cos(a), cy + maxR * Math.sin(a));
        ctx.strokeStyle = '#e5e7eb';
        ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    data.forEach((d, i) => {
        const a = angle(i);
        const labelR = maxR + 22;
        const x = cx + labelR * Math.cos(a);
        const y = cy + labelR * Math.sin(a);
        ctx.fillText(d.axis, x, y);
    });

    // Data polygon
    ctx.beginPath();
    data.forEach((d, i) => {
        const max = d.max || 100;
        const r = (d.value / max) * maxR;
        const a = angle(i);
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, 0.25);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Value dots
    data.forEach((d, i) => {
        const max = d.max || 100;
        const r = (d.value / max) * maxR;
        const a = angle(i);
        ctx.beginPath();
        ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    });

    // Legend label
    ctx.fillStyle = color;
    ctx.fillRect(W / 2 - 50, H - 16, 12, 12);
    ctx.fillStyle = '#374151';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(opts.legendLabel || 'Risk Score', W / 2 - 34, H - 10);
}

// ─── HTML Component: Info Grid ──────────────────────────────────────────────

/**
 * Render a key-value info table.
 * @param {HTMLElement} container
 * @param {Array<{label:string, value:string, sublabel?:string}>} rows
 */
export function renderInfoGrid(container, rows) {
    const table = document.createElement('div');
    table.className = 'wiki-info-table';
    rows.forEach(r => {
        table.innerHTML += `
      <div class="wiki-info-row">
        <span class="wiki-info-label">${r.label}</span>
        <span class="wiki-info-value">${r.value}</span>
      </div>
    `;
    });
    container.appendChild(table);
}

// ─── HTML Component: Texture Bar ────────────────────────────────────────────

/**
 * Render a stacked horizontal bar (e.g. soil texture).
 * @param {HTMLElement} container
 * @param {Array<{label:string, percent:number, color:string}>} segments
 */
export function renderTextureBar(container, segments) {
    const wrap = document.createElement('div');
    wrap.className = 'wiki-texture-bar';
    segments.forEach(s => {
        const seg = document.createElement('div');
        seg.className = 'wiki-texture-segment';
        seg.style.width = s.percent + '%';
        seg.style.backgroundColor = s.color;
        seg.textContent = `${s.label} ${s.percent}%`;
        wrap.appendChild(seg);
    });
    container.appendChild(wrap);
}

// ─── HTML Component: Alert Rows ─────────────────────────────────────────────

/**
 * Render color-coded risk/alert indicator rows.
 * @param {HTMLElement} container
 * @param {Array<{icon:string, label:string, value:string, score?:string, bgColor:string, textColor:string, iconColor:string}>} rows
 */
export function renderAlertRows(container, rows) {
    const wrap = document.createElement('div');
    wrap.className = 'wiki-alert-rows';
    rows.forEach(r => {
        wrap.innerHTML += `
      <div class="wiki-alert-row" style="background:${r.bgColor};">
        <div class="wiki-alert-left">
          <span class="wiki-alert-icon" style="color:${r.iconColor}">${r.icon}</span>
          <span class="wiki-alert-label">${r.label}</span>
        </div>
        <div class="wiki-alert-right">
          <span class="wiki-alert-value" style="color:${r.textColor}">${r.value}</span>
          ${r.score ? `<span class="wiki-alert-score">(${r.score})</span>` : ''}
        </div>
      </div>
    `;
    });
    container.appendChild(wrap);
}

// ─── HTML Component: Bullet List ────────────────────────────────────────────

/**
 * Render a styled chevron bullet list.
 * @param {HTMLElement} container
 * @param {string[]} items
 * @param {string} [accentColor='#d97706']
 */
export function renderBulletList(container, items, accentColor = '#d97706') {
    const ul = document.createElement('ul');
    ul.className = 'wiki-bullet-list';
    items.forEach(item => {
        ul.innerHTML += `
      <li class="wiki-bullet-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        <span>${item}</span>
      </li>
    `;
    });
    container.appendChild(ul);
}

// ─── SVG Diagram: Watershed ─────────────────────────────────────────────────

/**
 * Render an illustrative SVG watershed diagram (like the reference).
 * @param {HTMLElement} container
 */
export function renderWatershedSvg(container) {
    const wrap = document.createElement('div');
    wrap.className = 'wiki-watershed-svg';
    wrap.innerHTML = `
    <svg viewBox="0 0 400 300" style="width:100%;height:auto;">
      <!-- Watershed boundary -->
      <path d="M50,150 Q100,50 200,80 Q300,50 350,150 Q300,250 200,220 Q100,250 50,150 Z"
            fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
      <!-- Main river -->
      <path d="M200,80 Q210,120 200,150 Q190,180 200,220"
            fill="none" stroke="#0369a1" stroke-width="4"/>
      <!-- Tributaries -->
      <path d="M150,120 Q175,135 200,140" fill="none" stroke="#0ea5e9" stroke-width="2"/>
      <path d="M250,110 Q225,130 200,135" fill="none" stroke="#0ea5e9" stroke-width="2"/>
      <path d="M120,180 Q160,170 190,165" fill="none" stroke="#0ea5e9" stroke-width="2"/>
      <path d="M280,190 Q240,175 210,170" fill="none" stroke="#0ea5e9" stroke-width="2"/>
      <!-- Wetlands -->
      <ellipse cx="150" cy="200" rx="25" ry="15" fill="#86efac" opacity="0.6"/>
      <ellipse cx="280" cy="160" rx="20" ry="12" fill="#86efac" opacity="0.6"/>
      <!-- Labels -->
      <text x="200" y="40" text-anchor="middle" style="font-size:12px;fill:#475569;font-weight:600;">Mira River Basin</text>
      <text x="200" y="260" text-anchor="middle" style="font-size:11px;fill:#64748b;">→ Atlantic Ocean</text>
      <text x="150" y="205" text-anchor="middle" style="font-size:10px;fill:#15803d;">Wetlands</text>
      <!-- Legend -->
      <rect x="280" y="240" width="105" height="52" fill="white" stroke="#cbd5e1" rx="4"/>
      <rect x="290" y="250" width="12" height="8" fill="#e0f2fe" stroke="#0284c7"/>
      <text x="308" y="257" style="font-size:10px;fill:#475569;">Watershed</text>
      <rect x="290" y="265" width="12" height="4" fill="#0369a1"/>
      <text x="308" y="272" style="font-size:10px;fill:#475569;">River</text>
      <ellipse cx="296" cy="280" rx="6" ry="4" fill="#86efac"/>
      <text x="308" y="283" style="font-size:10px;fill:#475569;">Wetland</text>
    </svg>
    <p class="wiki-watershed-caption">Watershed map (illustrative)</p>
  `;
    container.appendChild(wrap);
}

// ─── Chart Card Wrapper ─────────────────────────────────────────────────────

/**
 * Create a titled card containing a canvas element, append to container, return the canvas.
 * @param {HTMLElement} container
 * @param {string} title
 * @param {{width?:number, height?:number, id?:string}} opts
 * @returns {HTMLCanvasElement}
 */
export function createChartCard(container, title, opts = {}) {
    const card = document.createElement('div');
    card.className = 'wiki-chart-card';
    const header = document.createElement('h3');
    header.className = 'wiki-chart-title';
    header.textContent = title;
    const canvas = document.createElement('canvas');
    if (opts.id) canvas.id = opts.id;
    card.appendChild(header);
    card.appendChild(canvas);
    container.appendChild(card);
    return canvas;
}

/**
 * Create a titled card containing arbitrary HTML content.
 * @param {HTMLElement} container
 * @param {string} title
 * @returns {HTMLElement} — the card body to append content into
 */
export function createContentCard(container, title) {
    const card = document.createElement('div');
    card.className = 'wiki-chart-card';
    const header = document.createElement('h3');
    header.className = 'wiki-chart-title';
    header.textContent = title;
    const body = document.createElement('div');
    body.className = 'wiki-chart-body';
    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
    return body;
}
