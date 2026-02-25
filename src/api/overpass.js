/**
 * Overpass API — OpenStreetMap data queries
 * Free, no API key. Rate limited.
 * https://wiki.openstreetmap.org/wiki/Overpass_API
 */

const BASE = 'https://overpass-api.de/api/interpreter';

export async function query(overpassQL) {
  const res = await fetch(BASE, {
    method: 'POST',
    body: `data=${encodeURIComponent(overpassQL)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  return res.json();
}

function bboxStr(bbox) {
  // bbox: [south, west, north, east]
  return `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
}

export async function getMunicipalityBoundary(name, country = 'Portugal') {
  const q = `
    [out:json][timeout:30];
    area["name"="${country}"]->.country;
    relation["name"="${name}"]["boundary"="administrative"]["admin_level"~"[6-8]"](area.country);
    out body;
    >;
    out skel qt;
  `;
  return query(q);
}

export async function getWaterFeatures(bbox) {
  const b = bboxStr(bbox);
  const q = `
    [out:json][timeout:30];
    (
      way["waterway"="river"](${b});
      way["waterway"="stream"](${b});
      node["natural"="spring"](${b});
      way["natural"="water"](${b});
      relation["natural"="water"](${b});
      way["waterway"="dam"](${b});
      node["man_made"="water_well"](${b});
    );
    out body;
    >;
    out skel qt;
  `;
  return query(q);
}

export async function getRivers(bbox) {
  const b = bboxStr(bbox);
  const q = `
    [out:json][timeout:30];
    (
      way["waterway"="river"](${b});
      relation["waterway"="river"](${b});
    );
    out body;
    >;
    out skel qt;
  `;
  return query(q);
}

export async function getProtectedAreas(bbox) {
  const b = bboxStr(bbox);
  const q = `
    [out:json][timeout:30];
    (
      way["boundary"="protected_area"](${b});
      relation["boundary"="protected_area"](${b});
      way["leisure"="nature_reserve"](${b});
      relation["leisure"="nature_reserve"](${b});
    );
    out body;
    >;
    out skel qt;
  `;
  return query(q);
}

export async function getPlaces(bbox) {
  const b = bboxStr(bbox);
  const q = `
    [out:json][timeout:30];
    (
      node["place"~"city|town|village|hamlet"](${b});
    );
    out body;
  `;
  return query(q);
}

export async function getLandUse(bbox) {
  const b = bboxStr(bbox);
  const q = `
    [out:json][timeout:30];
    (
      way["landuse"](${b});
    );
    out body;
    >;
    out skel qt;
  `;
  return query(q);
}

export async function getBuildings(bbox) {
  const b = bboxStr(bbox);
  const q = `
    [out:json][timeout:30];
    (
      way["building"](${b});
    );
    out count;
  `;
  return query(q);
}

export async function getInfrastructure(bbox) {
  const b = bboxStr(bbox);
  const q = `
    [out:json][timeout:30];
    (
      node["amenity"~"school|hospital|pharmacy|post_office|library|community_centre"](${b});
      node["shop"~"supermarket|convenience"](${b});
      node["tourism"~"hotel|guest_house|camp_site|information"](${b});
    );
    out body;
  `;
  return query(q);
}

export async function getWeatherStations(bbox) {
  const b = bboxStr(bbox);
  const q = `
    [out:json][timeout:30];
    (
      node["man_made"="monitoring_station"]["monitoring:weather"="yes"](${b});
      node["man_made"="weather_station"](${b});
    );
    out body;
  `;
  return query(q);
}

export async function getHistoricFeatures(bbox) {
  const b = bboxStr(bbox);
  const q = `
    [out:json][timeout:30];
    (
      node["historic"](${b});
      way["historic"](${b});
      node["heritage"](${b});
    );
    out body;
    >;
    out skel qt;
  `;
  return query(q);
}

export function extractNodes(overpassData) {
  if (!overpassData || !overpassData.elements) return [];
  return overpassData.elements.filter(e => e.type === 'node' && e.lat && e.lon);
}

export function extractWays(overpassData) {
  if (!overpassData || !overpassData.elements) return [];
  const nodes = {};
  overpassData.elements.forEach(e => {
    if (e.type === 'node') nodes[e.id] = [e.lat, e.lon];
  });
  return overpassData.elements
    .filter(e => e.type === 'way' && e.nodes)
    .map(w => ({
      ...w,
      coords: w.nodes.map(nId => nodes[nId]).filter(Boolean),
    }));
}
