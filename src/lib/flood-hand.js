// HAND (Height Above Nearest Drainage) flood risk.
// Pure logic; caller supplies distance fn and elevation lookups.

const DRAINAGE_KINDS = new Set(['river', 'stream', 'canal', 'drain', 'ditch']);

export function findNearestDrainage(ways, lat, lng, haversineMeters) {
  let nearest = null;
  for (const w of ways || []) {
    const kind = w?.tags?.waterway;
    if (!kind || !DRAINAGE_KINDS.has(kind)) continue;
    const coords = w.coords;
    if (!Array.isArray(coords) || coords.length === 0) continue;
    for (const [pLat, pLng] of coords) {
      if (typeof pLat !== 'number' || typeof pLng !== 'number') continue;
      const d = haversineMeters(lat, lng, pLat, pLng);
      if (!nearest || d < nearest.distanceM) {
        nearest = { lat: pLat, lng: pLng, distanceM: d, name: w.tags?.name || null, kind };
      }
    }
  }
  if (nearest) nearest.distanceM = Math.round(nearest.distanceM);
  return nearest;
}

// HAND thresholds reflect Open-Meteo DEM ±5–10m vertical accuracy and the
// Nobre et al. (2011) HAND-based floodplain mapping convention.
export function floodRiskFromHAND(hand) {
  if (hand == null || !Number.isFinite(hand)) {
    return { riskScore: null, riskLevel: null };
  }
  if (hand <= 0)  return { riskScore: 5, riskLevel: 'Severe' };
  if (hand <= 5)  return { riskScore: 4, riskLevel: 'High' };
  if (hand <= 15) return { riskScore: 2, riskLevel: 'Moderate' };
  if (hand <= 30) return { riskScore: 1, riskLevel: 'Low' };
  return { riskScore: 0, riskLevel: 'Very Low' };
}
