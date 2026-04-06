/**
 * SVG Chart Generators for LandBook Report
 * All functions return inline HTML/SVG strings for print-safe rendering.
 */

const COLORS = {
  deepForest: '#1B4332',
  terracotta: '#E07A5F',
  sage: '#8FBC8F',
  sand: '#D4A574',
  sky: '#90E0EF',
  charcoal: '#374151',
  lightGray: '#D1D5DB',
  muted: '#6B7280',
};

const PALETTE = ['#1B4332', '#E07A5F', '#8FBC8F', '#D4A574', '#90E0EF', '#BC6C25'];

// ---------------------------------------------------------------------------
// Horizontal Bar Chart (Natural Capital Dimensions)
// ---------------------------------------------------------------------------

/**
 * @param {Array<{label: string, value: number, avg?: number, suffix?: string}>} items
 * @param {number} width - chart width in px
 */
export function horizontalBarChart(items, width = 600) {
  const barH = 28;
  const labelW = 120;
  const gap = 14;
  const chartW = width - labelW - 100;
  const maxVal = Math.max(...items.map(i => Math.max(i.value, i.avg || 0)), 100);
  const h = items.length * (barH + gap) + 30;

  let svg = `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="${COLORS.charcoal}">Natural Capital Dimensions</text>`;

  items.forEach((item, i) => {
    const y = 30 + i * (barH + gap);
    const barW = (item.value / maxVal) * chartW;
    const avgW = item.avg != null ? (item.avg / maxVal) * chartW : 0;

    // Label
    svg += `<text x="${labelW - 8}" y="${y + barH / 2 + 4}" text-anchor="end" font-family="Inter,sans-serif" font-size="11" fill="${COLORS.charcoal}">${item.label}</text>`;

    // Avg bar (background)
    if (avgW > 0) {
      svg += `<rect x="${labelW}" y="${y + 2}" width="${avgW}" height="${barH - 4}" rx="3" fill="${COLORS.lightGray}" opacity="0.5" />`;
    }

    // Value bar
    svg += `<rect x="${labelW}" y="${y + 2}" width="${barW}" height="${barH - 4}" rx="3" fill="${COLORS.deepForest}" />`;

    // Value text
    svg += `<text x="${labelW + barW + 8}" y="${y + barH / 2 + 4}" font-family="Inter,sans-serif" font-size="11" font-weight="600" fill="${COLORS.charcoal}">${item.value}${item.suffix || ''}</text>`;

    // Above/below avg
    if (item.avg != null) {
      const diff = item.value - item.avg;
      const diffLabel = diff > 0 ? 'Above avg' : diff < 0 ? 'Below avg' : 'Average';
      svg += `<text x="${width - 8}" y="${y + barH / 2 + 4}" text-anchor="end" font-family="Inter,sans-serif" font-size="9" font-style="italic" fill="${COLORS.sage}">${diffLabel}</text>`;
    }
  });

  // Legend
  const ly = h - 4;
  svg += `<rect x="${width - 200}" y="${ly - 10}" width="12" height="8" rx="2" fill="${COLORS.lightGray}" opacity="0.5" />`;
  svg += `<text x="${width - 184}" y="${ly - 3}" font-family="Inter,sans-serif" font-size="9" fill="${COLORS.muted}">Regional Average</text>`;
  svg += `<rect x="${width - 100}" y="${ly - 10}" width="12" height="8" rx="2" fill="${COLORS.deepForest}" />`;
  svg += `<text x="${width - 84}" y="${ly - 3}" font-family="Inter,sans-serif" font-size="9" fill="${COLORS.muted}">This Property</text>`;

  svg += '</svg>';
  return svg;
}

// ---------------------------------------------------------------------------
// Stacked Bar Chart (Ecosystem Services Value)
// ---------------------------------------------------------------------------

/**
 * @param {Array<{label: string, value: number, color?: string}>} segments
 * @param {number} total
 * @param {number} width
 */
export function stackedBarChart(segments, total, width = 600) {
  const barH = 40;
  const h = 100;
  const padL = 10;
  const barW = width - padL - 100;

  let svg = `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="${COLORS.charcoal}">Annual Ecosystem Services Value</text>`;

  // Background
  svg += `<rect x="${padL}" y="30" width="${barW}" height="${barH}" rx="4" fill="#f0f0ed" />`;

  let x = padL;
  segments.forEach((seg, i) => {
    const w = (seg.value / total) * barW;
    if (w > 0) {
      const color = seg.color || PALETTE[i % PALETTE.length];
      svg += `<rect x="${x}" y="30" width="${w}" height="${barH}" ${i === 0 ? 'rx="4"' : ''} ${i === segments.length - 1 ? 'rx="4"' : ''} fill="${color}" />`;
      // Value label inside bar (if wide enough)
      if (w > 45) {
        svg += `<text x="${x + w / 2}" y="55" text-anchor="middle" font-family="Inter,sans-serif" font-size="10" font-weight="500" fill="white">\u20ac${seg.value.toLocaleString()}</text>`;
      }
      x += w;
    }
  });

  // Total
  svg += `<text x="${padL + barW + 8}" y="55" font-family="Inter,sans-serif" font-size="11" font-weight="600" fill="${COLORS.charcoal}">Total: \u20ac${total.toLocaleString()}</text>`;

  // Legend
  let lx = padL;
  segments.forEach((seg, i) => {
    const color = seg.color || PALETTE[i % PALETTE.length];
    svg += `<rect x="${lx}" y="${h - 14}" width="8" height="8" rx="2" fill="${color}" />`;
    svg += `<text x="${lx + 12}" y="${h - 7}" font-family="Inter,sans-serif" font-size="8" fill="${COLORS.muted}">${seg.label}</text>`;
    lx += seg.label.length * 5 + 24;
  });

  svg += '</svg>';
  return svg;
}

// ---------------------------------------------------------------------------
// Radar Chart (Natural Capital Scorecard)
// ---------------------------------------------------------------------------

/**
 * @param {Array<{label: string, score: number, avg: number}>} dims - scores 0-100
 * @param {number} size
 */
export function radarChart(dims, size = 300) {
  const cx = size / 2, cy = size / 2, r = size * 0.35;
  const n = dims.length;
  const angleStep = (2 * Math.PI) / n;
  const levels = [20, 40, 60, 80, 100];

  let svg = `<svg width="${size}" height="${size + 40}" viewBox="0 0 ${size} ${size + 40}" xmlns="http://www.w3.org/2000/svg">`;

  // Grid
  levels.forEach(lev => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i * angleStep - Math.PI / 2;
      pts.push(`${cx + (r * lev / 100) * Math.cos(a)},${cy + (r * lev / 100) * Math.sin(a)}`);
    }
    svg += `<polygon points="${pts.join(' ')}" fill="none" stroke="${COLORS.lightGray}" stroke-width="0.5" />`;
  });

  // Axis lines + labels
  dims.forEach((d, i) => {
    const a = i * angleStep - Math.PI / 2;
    const x2 = cx + r * Math.cos(a), y2 = cy + r * Math.sin(a);
    svg += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="${COLORS.lightGray}" stroke-width="0.5" />`;
    const lx = cx + (r + 20) * Math.cos(a), ly = cy + (r + 20) * Math.sin(a);
    svg += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-family="Inter,sans-serif" font-size="9" font-weight="500" fill="${COLORS.charcoal}">${d.label}</text>`;
  });

  // Average polygon
  const avgPts = dims.map((d, i) => {
    const a = i * angleStep - Math.PI / 2;
    return `${cx + (r * d.avg / 100) * Math.cos(a)},${cy + (r * d.avg / 100) * Math.sin(a)}`;
  });
  svg += `<polygon points="${avgPts.join(' ')}" fill="${COLORS.sand}" fill-opacity="0.15" stroke="${COLORS.sand}" stroke-width="1.5" stroke-dasharray="4,3" />`;

  // Property polygon
  const scorePts = dims.map((d, i) => {
    const a = i * angleStep - Math.PI / 2;
    return `${cx + (r * d.score / 100) * Math.cos(a)},${cy + (r * d.score / 100) * Math.sin(a)}`;
  });
  svg += `<polygon points="${scorePts.join(' ')}" fill="${COLORS.deepForest}" fill-opacity="0.2" stroke="${COLORS.deepForest}" stroke-width="2" />`;

  // Dots
  dims.forEach((d, i) => {
    const a = i * angleStep - Math.PI / 2;
    const x = cx + (r * d.score / 100) * Math.cos(a);
    const y = cy + (r * d.score / 100) * Math.sin(a);
    svg += `<circle cx="${x}" cy="${y}" r="4" fill="${COLORS.deepForest}" />`;
  });

  // Legend
  const ly = size + 20;
  svg += `<line x1="${cx - 60}" y1="${ly}" x2="${cx - 45}" y2="${ly}" stroke="${COLORS.deepForest}" stroke-width="2" />`;
  svg += `<text x="${cx - 40}" y="${ly + 4}" font-family="Inter,sans-serif" font-size="10" fill="${COLORS.charcoal}">This Property</text>`;
  svg += `<line x1="${cx + 30}" y1="${ly}" x2="${cx + 45}" y2="${ly}" stroke="${COLORS.sand}" stroke-width="1.5" stroke-dasharray="4,3" />`;
  svg += `<text x="${cx + 50}" y="${ly + 4}" font-family="Inter,sans-serif" font-size="10" fill="${COLORS.charcoal}">Regional Average</text>`;

  svg += '</svg>';
  return svg;
}

// ---------------------------------------------------------------------------
// Monthly Climate Chart (temp line + rainfall bars)
// ---------------------------------------------------------------------------

/**
 * @param {number[]} temps - 12 monthly average temperatures
 * @param {number[]} rain - 12 monthly average rainfall in mm
 */
export function monthlyClimateChart(temps, rain, w = 600, h = 240) {
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const pad = { l: 45, r: 45, t: 25, b: 35 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const maxT = Math.max(...temps) + 3;
  const minT = Math.min(...temps) - 2;
  const maxR = Math.max(...rain, 10) * 1.1;
  const barW = cw / 12 * 0.45;

  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;

  // Title
  svg += `<text x="${w / 2}" y="14" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="${COLORS.charcoal}">Monthly Rainfall and Temperature</text>`;

  // Rainfall bars
  months.forEach((m, i) => {
    const x = pad.l + (i + 0.5) * (cw / 12);
    const bh = (rain[i] / maxR) * ch;
    svg += `<rect x="${x - barW / 2}" y="${pad.t + ch - bh}" width="${barW}" height="${bh}" fill="${COLORS.sky}" rx="2" opacity="0.7" />`;
  });

  // Temperature line
  const points = months.map((m, i) => {
    const x = pad.l + (i + 0.5) * (cw / 12);
    const y = pad.t + ch - ((temps[i] - minT) / (maxT - minT)) * ch;
    return `${x},${y}`;
  });
  svg += `<polyline points="${points.join(' ')}" fill="none" stroke="${COLORS.terracotta}" stroke-width="2.5" stroke-linejoin="round" />`;
  // Dots
  points.forEach(p => {
    const [px, py] = p.split(',');
    svg += `<circle cx="${px}" cy="${py}" r="3.5" fill="${COLORS.terracotta}" />`;
  });

  // Month labels
  months.forEach((m, i) => {
    const x = pad.l + (i + 0.5) * (cw / 12);
    svg += `<text x="${x}" y="${h - 10}" text-anchor="middle" font-family="Inter,sans-serif" font-size="10" fill="${COLORS.muted}">${m}</text>`;
  });

  // Y-axis labels (temp on left, rain on right)
  [minT, (minT + maxT) / 2, maxT].forEach(v => {
    const y = pad.t + ch - ((v - minT) / (maxT - minT)) * ch;
    svg += `<text x="${pad.l - 8}" y="${y + 3}" text-anchor="end" font-family="Inter,sans-serif" font-size="9" fill="${COLORS.muted}">${Math.round(v)}\u00b0</text>`;
    svg += `<line x1="${pad.l}" y1="${y}" x2="${pad.l + cw}" y2="${y}" stroke="${COLORS.lightGray}" stroke-width="0.3" />`;
  });
  [0, maxR / 2, maxR].forEach(v => {
    const y = pad.t + ch - (v / maxR) * ch;
    svg += `<text x="${w - pad.r + 8}" y="${y + 3}" font-family="Inter,sans-serif" font-size="9" fill="${COLORS.muted}">${Math.round(v)}mm</text>`;
  });

  // Legend
  svg += `<rect x="${w / 2 - 90}" y="${h - 6}" width="10" height="6" rx="2" fill="${COLORS.sky}" opacity="0.7" />`;
  svg += `<text x="${w / 2 - 76}" y="${h - 1}" font-family="Inter,sans-serif" font-size="9" fill="${COLORS.muted}">Rainfall (mm)</text>`;
  svg += `<line x1="${w / 2 + 10}" y1="${h - 3}" x2="${w / 2 + 22}" y2="${h - 3}" stroke="${COLORS.terracotta}" stroke-width="2" />`;
  svg += `<text x="${w / 2 + 26}" y="${h - 1}" font-family="Inter,sans-serif" font-size="9" fill="${COLORS.muted}">Temperature (\u00b0C)</text>`;

  svg += '</svg>';
  return svg;
}

// ---------------------------------------------------------------------------
// Risk Assessment Bar Chart
// ---------------------------------------------------------------------------

/**
 * @param {Array<{label: string, score: number, maxScore: number, color: string}>} risks
 */
export function riskBarChart(risks, width = 500) {
  const barH = 32;
  const labelW = 100;
  const gap = 12;
  const chartW = width - labelW - 60;
  const h = risks.length * (barH + gap) + 30;

  let svg = `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="${COLORS.charcoal}">Risk Assessment</text>`;

  risks.forEach((risk, i) => {
    const y = 30 + i * (barH + gap);
    const pct = (risk.score / risk.maxScore) * 100;
    const barFull = chartW;
    const barVal = (pct / 100) * chartW;

    svg += `<text x="${labelW - 8}" y="${y + barH / 2 + 4}" text-anchor="end" font-family="Inter,sans-serif" font-size="11" fill="${COLORS.charcoal}">${risk.label}</text>`;
    svg += `<rect x="${labelW}" y="${y + 4}" width="${barFull}" height="${barH - 8}" rx="4" fill="#f0f0ed" />`;
    svg += `<rect x="${labelW}" y="${y + 4}" width="${barVal}" height="${barH - 8}" rx="4" fill="${risk.color}" />`;
    svg += `<text x="${labelW + barVal + 8}" y="${y + barH / 2 + 4}" font-family="Inter,sans-serif" font-size="11" font-weight="600" fill="${COLORS.charcoal}">${risk.score}/${risk.maxScore}</text>`;
  });

  svg += '</svg>';
  return svg;
}

// ---------------------------------------------------------------------------
// Species Count Bar Chart (vertical)
// ---------------------------------------------------------------------------

export function speciesBarChart(groups, width = 600) {
  const barH = 24;
  const labelW = 110;
  const gap = 10;
  const chartW = width - labelW - 80;
  const maxVal = Math.max(...groups.map(g => g.count), 1);
  const h = groups.length * (barH + gap) + 30;

  let svg = `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="${COLORS.charcoal}">Species by Taxonomic Group</text>`;

  groups.forEach((g, i) => {
    const y = 30 + i * (barH + gap);
    const barW = (g.count / maxVal) * chartW;

    svg += `<text x="${labelW - 8}" y="${y + barH / 2 + 4}" text-anchor="end" font-family="Inter,sans-serif" font-size="10" fill="${COLORS.charcoal}">${g.group}</text>`;
    svg += `<rect x="${labelW}" y="${y + 2}" width="${barW}" height="${barH - 4}" rx="3" fill="${COLORS.deepForest}" />`;
    svg += `<text x="${labelW + barW + 6}" y="${y + barH / 2 + 4}" font-family="Inter,sans-serif" font-size="10" font-weight="500" fill="${COLORS.charcoal}">${g.count}</text>`;
  });

  svg += '</svg>';
  return svg;
}

// ---------------------------------------------------------------------------
// Percentile Chart (multi-scale context comparison)
// ---------------------------------------------------------------------------

export function percentileChart(dimensions, width = 600) {
  const rowH = 40;
  const labelW = 130;
  const chartW = width - labelW - 30;
  const h = dimensions.length * rowH + 40;

  let svg = `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="${COLORS.charcoal}">Performance vs. Regional Benchmarks</text>`;

  // Scale labels
  [0, 25, 50, 75, 100].forEach(pct => {
    const x = labelW + (pct / 100) * chartW;
    svg += `<text x="${x}" y="32" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" fill="${COLORS.muted}">${pct}th</text>`;
    svg += `<line x1="${x}" y1="36" x2="${x}" y2="${h - 4}" stroke="${COLORS.lightGray}" stroke-width="0.5" stroke-dasharray="2,2" />`;
  });

  dimensions.forEach((dim, i) => {
    const y = 40 + i * rowH;
    const x = labelW + (dim.percentile / 100) * chartW;

    svg += `<text x="${labelW - 8}" y="${y + 14}" text-anchor="end" font-family="Inter,sans-serif" font-size="10" fill="${COLORS.charcoal}">${dim.label}</text>`;
    svg += `<line x1="${labelW}" y1="${y + 10}" x2="${labelW + chartW}" y2="${y + 10}" stroke="${COLORS.lightGray}" stroke-width="1" />`;
    svg += `<circle cx="${x}" cy="${y + 10}" r="6" fill="${COLORS.deepForest}" />`;
    svg += `<text x="${x}" y="${y + 28}" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" font-weight="600" fill="${COLORS.deepForest}">${dim.percentile}th</text>`;
  });

  svg += '</svg>';
  return svg;
}

// ---------------------------------------------------------------------------
// Energy Potential Chart
// ---------------------------------------------------------------------------

export function energyBarChart(sources, width = 500) {
  const barH = 28;
  const labelW = 100;
  const gap = 12;
  const chartW = width - labelW - 30;
  const h = sources.length * (barH + gap) + 30;
  const maxVal = Math.max(...sources.map(s => s.potential), 1);

  let svg = `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="${COLORS.charcoal}">Energy Independence Potential</text>`;

  const barColors = [COLORS.sand, COLORS.sage, COLORS.sky, COLORS.terracotta];
  sources.forEach((src, i) => {
    const y = 30 + i * (barH + gap);
    const barW = (src.potential / maxVal) * chartW;
    svg += `<text x="${labelW - 8}" y="${y + barH / 2 + 4}" text-anchor="end" font-family="Inter,sans-serif" font-size="10" fill="${COLORS.charcoal}">${src.label}</text>`;
    svg += `<rect x="${labelW}" y="${y + 2}" width="${barW}" height="${barH - 4}" rx="3" fill="${barColors[i % barColors.length]}" />`;
  });

  svg += '</svg>';
  return svg;
}
