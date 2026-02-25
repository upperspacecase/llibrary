/**
 * OpenRouteService — Routing, distances, isochrones
 * Free tier: 2,000 directions, 500 isochrones, 1,000 geocodes/day.
 * https://openrouteservice.org/dev/#/api-docs
 *
 * No key needed for basic matrix queries via the public demo endpoint.
 * For production, get a free API key at https://openrouteservice.org/dev/#/signup
 */

const BASE = 'https://api.openrouteservice.org/v2';
const API_KEY = ''; // Set VITE_ORS_KEY in .env for production

function getKey() {
    return API_KEY || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ORS_KEY) || '';
}

/**
 * Get driving distance and duration from point A to B.
 * @param {number[]} from - [lng, lat]
 * @param {number[]} to - [lng, lat]
 * @param {string} profile - driving-car, cycling-regular, foot-walking
 */
export async function getDirections(from, to, profile = 'driving-car') {
    const key = getKey();
    if (!key) return null;

    const res = await fetch(`${BASE}/directions/${profile}?api_key=${key}&start=${from.join(',')}&end=${to.join(',')}`);
    if (!res.ok) throw new Error(`ORS directions error: ${res.status}`);
    const data = await res.json();

    const seg = data.features?.[0]?.properties?.segments?.[0];
    if (!seg) return null;

    return {
        distanceKm: (seg.distance / 1000).toFixed(1),
        durationMin: Math.round(seg.duration / 60),
        geometry: data.features[0].geometry,
    };
}

/**
 * Get isochrone (reachable area) from a point.
 * @param {number[]} center - [lng, lat]
 * @param {number[]} ranges - time ranges in seconds, e.g. [600, 1200, 1800]
 * @param {string} profile
 */
export async function getIsochrone(center, ranges = [600, 1200, 1800], profile = 'driving-car') {
    const key = getKey();
    if (!key) return null;

    const res = await fetch(`${BASE}/isochrones/${profile}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': key,
        },
        body: JSON.stringify({
            locations: [center],
            range: ranges,
            range_type: 'time',
        }),
    });

    if (!res.ok) throw new Error(`ORS isochrone error: ${res.status}`);
    return res.json();
}

/**
 * Calculate distances from a parcel center to nearby amenities using Overpass results.
 * This is a client-side haversine calculation — no API call needed.
 * @param {number[]} center - [lat, lng]
 * @param {Object[]} amenities - Array of {lat, lng, name, type}
 */
export function calculateDistances(center, amenities) {
    return amenities.map(a => ({
        ...a,
        distanceKm: haversine(center[0], center[1], a.lat, a.lng),
    })).sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Haversine distance in km.
 */
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Categorize amenities by type for display.
 */
export function categorizeAmenities(amenities) {
    const categories = {
        health: { label: 'Health', icon: '🏥', items: [] },
        education: { label: 'Education', icon: '🏫', items: [] },
        shopping: { label: 'Shopping', icon: '🛒', items: [] },
        services: { label: 'Services', icon: '🏛️', items: [] },
        tourism: { label: 'Tourism', icon: '🏕️', items: [] },
        other: { label: 'Other', icon: '📍', items: [] },
    };

    amenities.forEach(a => {
        const type = a.tags?.amenity || a.tags?.shop || a.tags?.tourism || '';
        if (['hospital', 'pharmacy', 'doctors', 'clinic'].includes(type)) {
            categories.health.items.push(a);
        } else if (['school', 'university', 'library', 'kindergarten'].includes(type)) {
            categories.education.items.push(a);
        } else if (['supermarket', 'convenience', 'marketplace'].includes(type)) {
            categories.shopping.items.push(a);
        } else if (['post_office', 'bank', 'community_centre', 'townhall'].includes(type)) {
            categories.services.items.push(a);
        } else if (['hotel', 'guest_house', 'camp_site', 'information'].includes(type)) {
            categories.tourism.items.push(a);
        } else {
            categories.other.items.push(a);
        }
    });

    return Object.values(categories).filter(c => c.items.length > 0);
}
