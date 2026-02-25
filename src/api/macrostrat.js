/**
 * Macrostrat — Global geology data
 * Free, no API key. CC-BY 4.0.
 * https://macrostrat.org/api/v2/
 */

const BASE = 'https://macrostrat.org/api/v2';

/**
 * Get geologic units at a coordinate.
 * Returns lithology, age, environment, and stratigraphic context.
 * @param {number} lat
 * @param {number} lng
 */
export async function getGeology(lat, lng) {
    const res = await fetch(`${BASE}/geologic_units/map?lat=${lat}&lng=${lng}&response=long`);
    if (!res.ok) throw new Error(`Macrostrat error: ${res.status}`);
    return res.json();
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
        lithology: unit.lith ? unit.lith.map(l => l.lith || l.name).filter(Boolean).join(', ') : 'Unknown',
        environment: unit.environ ? unit.environ.map(e => e.environ || e.name).filter(Boolean).join(', ') : 'Unknown',
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
