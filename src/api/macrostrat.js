/**
 * Macrostrat — Global geology data
 * Free, no API key. CC-BY 4.0.
 * https://macrostrat.org/api/v2/
 */

import { fetchWithPolicy } from '../lib/fetch-policy.js';

const BASE = 'https://macrostrat.org/api/v2';

/**
 * Get geologic units at a coordinate.
 * Returns lithology, age, environment, and stratigraphic context.
 * @param {number} lat
 * @param {number} lng
 */
export async function getGeology(lat, lng) {
    const res = await fetchWithPolicy(`${BASE}/geologic_units/map?lat=${lat}&lng=${lng}&response=long`, {}, {
      source: 'macrostrat-geology', timeoutMs: 8000, accept: 'application/json',
    });
    if (!res.ok) throw new Error(`Macrostrat error: ${res.status}`);
    return res.json();
}

/**
 * Multi-point dominant-lithology sampler. Macrostrat's API has no bbox or
 * polygon query, so we sample N points across the boundary, fetch each,
 * and return a synthetic `success.data` ordered by frequency so the
 * existing parseGeology() reads the dominant unit as `primary`.
 *
 * @param {Array<[number, number]>} boundary - [[lat, lng], ...] polygon
 * @param {[number, number]} center - [lat, lng]
 * @param {number} n - sample count (default 8 boundary points + 1 center)
 */
export async function getGeologyBbox(boundary, center, n = 8) {
    const points = [];
    if (Array.isArray(boundary) && boundary.length >= 3) {
        const step = Math.max(1, Math.floor(boundary.length / n));
        for (let i = 0; i < boundary.length && points.length < n; i += step) {
            const p = boundary[i];
            if (Array.isArray(p) && p.length === 2) points.push(p);
        }
    }
    if (Array.isArray(center) && center.length === 2) points.push(center);
    if (!points.length) throw new Error('Macrostrat bbox: no sample points');

    const settled = await Promise.allSettled(points.map(([la, ln]) => getGeology(la, ln)));
    const units = [];
    for (const r of settled) {
        if (r.status !== 'fulfilled') continue;
        const data = r.value?.success?.data;
        if (Array.isArray(data) && data.length) units.push(data[0]);
    }
    if (!units.length) throw new Error('Macrostrat bbox: no valid samples');

    const litLabel = (u) => Array.isArray(u.lith)
        ? u.lith.map(l => l.lith || l.name).filter(Boolean).join(', ')
        : (typeof u.lith === 'string' ? u.lith : 'Unknown');
    const counts = new Map();
    const examples = new Map();
    for (const u of units) {
        const key = litLabel(u);
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!examples.has(key)) examples.set(key, u);
    }
    const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    // Synthetic Macrostrat envelope — parseGeology reads .success.data[0] as
    // primary, so the dominant lithology lands first.
    return {
        success: {
            v: 2,
            data: ordered.map(([key, count]) => {
                const base = examples.get(key) || {};
                return { ...base, _sampleCount: count, _sampleTotal: units.length };
            }),
            _sampledFrom: points.length,
        },
    };
}

/**
 * Parse Macrostrat response into a display-friendly format.
 */
export function parseGeology(data) {
    if (!data || !data.success || !data.success.data || data.success.data.length === 0) {
        return null;
    }

    const units = data.success.data.map(unit => ({
        name: unit.strat_name_long || unit.strat_name || unit.unit_name || 'Unknown',
        age: formatAge(unit),
        lithology: Array.isArray(unit.lith) ? unit.lith.map(l => l.lith || l.name).filter(Boolean).join(', ') : (typeof unit.lith === 'string' ? unit.lith : 'Unknown'),
        environment: Array.isArray(unit.environ) ? unit.environ.map(e => e.environ || e.name).filter(Boolean).join(', ') : (typeof unit.environ === 'string' ? unit.environ : 'Unknown'),
        description: unit.descrip || '',
        period: unit.t_int_name || unit.Tseries || '',
        ageTop: unit.t_int_age,
        ageBottom: unit.b_int_age,
        color: unit.color || '#888',
        source: unit.ref ? (unit.ref.author || '') : '',
    }));

    return {
        units,
        primary: units[0],
        count: units.length,
    };
}

/**
 * Format age range as human-readable string.
 */
function formatAge(unit) {
    const top = unit.t_int_name || '';
    const bottom = unit.b_int_name || '';
    const topAge = unit.t_int_age;
    const bottomAge = unit.b_int_age;

    if (top && bottom && top !== bottom) {
        return `${bottom} – ${top}`;
    }
    if (top) {
        if (topAge != null && bottomAge != null) {
            return `${top} (${bottomAge.toFixed(0)}–${topAge.toFixed(0)} Ma)`;
        }
        return top;
    }
    if (bottomAge != null && topAge != null) {
        return `${bottomAge.toFixed(0)}–${topAge.toFixed(0)} Ma`;
    }
    return 'Unknown age';
}

/**
 * Get a description suitable for display.
 */
export function getGeologyDescription(geology) {
    if (!geology || !geology.primary) {
        return 'No geological data available for this location.';
    }

    const p = geology.primary;
    const parts = [];

    if (p.lithology && p.lithology !== 'Unknown') {
        parts.push(`The underlying rock is ${p.lithology.toLowerCase()}`);
    }
    if (p.age) {
        parts.push(`dating from the ${p.age}`);
    }
    if (p.environment && p.environment !== 'Unknown') {
        parts.push(`deposited in a ${p.environment.toLowerCase()} environment`);
    }

    return parts.length > 0
        ? parts.join(', ') + '.'
        : 'Geological unit identified but details are limited.';
}
