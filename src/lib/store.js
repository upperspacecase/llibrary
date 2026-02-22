/**
 * Data persistence — localStorage-based store for landbooks.
 * Updated for new data model: polygon boundaries, auto-data, user-reported data.
 */

const LANDBOOK_KEY = 'libraries-landbooks';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- Landbook CRUD ----

export function getAllLandbooks() {
  try {
    return JSON.parse(localStorage.getItem(LANDBOOK_KEY)) || [];
  } catch {
    return [];
  }
}

export function getLandbook(id) {
  return getAllLandbooks().find(lb => lb.id === id) || null;
}

export function saveLandbook(data) {
  const landbooks = getAllLandbooks();
  const landbook = {
    id: generateId(),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    // Core identity
    boundary: data.boundary || [],     // Array of [lat, lng] pairs
    center: data.center || null,       // [lat, lng] centroid
    area: data.area || null,           // square meters
    perimeter: data.perimeter || null, // meters
    address: data.address || '',       // reverse-geocoded address
    // Auto-populated data (filled after creation)
    autoData: data.autoData || null,
    // User-reported data (filled by landowner)
    userReported: data.userReported || null,
    // Title deed
    titleDeed: data.titleDeed || null, // { status: 'pending' | 'uploaded', fileName?: string }
  };
  landbooks.push(landbook);
  localStorage.setItem(LANDBOOK_KEY, JSON.stringify(landbooks));
  return landbook;
}

export function updateLandbook(id, updates) {
  const landbooks = getAllLandbooks();
  const idx = landbooks.findIndex(lb => lb.id === id);
  if (idx === -1) return null;
  landbooks[idx] = {
    ...landbooks[idx],
    ...updates,
    updated: new Date().toISOString(),
  };
  localStorage.setItem(LANDBOOK_KEY, JSON.stringify(landbooks));
  return landbooks[idx];
}

export function deleteLandbook(id) {
  const landbooks = getAllLandbooks().filter(lb => lb.id !== id);
  localStorage.setItem(LANDBOOK_KEY, JSON.stringify(landbooks));
}

// ---- Auto-data structure ----

export function createAutoData() {
  return {
    elevation: null,
    soil: null,
    soilClassification: null,
    weather: null,
    climate: null,
    biodiversity: null,
    landCover: null,
    fireRisk: null,
    protectedAreas: null,
    waterFeatures: null,
    zoning: null,
    fetchedAt: null,
  };
}

// ---- User-reported data structure ----

export function createUserReported() {
  return {
    primaryUse: '',
    secondaryUse: '',
    challenges: [],
    goals: {
      oneYear: '',
      threeYear: '',
      fiveYear: '',
    },
    infrastructure: {
      irrigation: '',
      energy: '',
      waterSources: '',
      buildings: '',
    },
    sharing: '',
    history: '',
    documents: [],
    notes: '',
  };
}

// ---- Backward-compatible property access (for old data) ----

export function getAllProperties() {
  try {
    return JSON.parse(localStorage.getItem('lll-properties')) || [];
  } catch {
    return [];
  }
}

export function getProperty(id) {
  return getAllProperties().find(p => p.id === id) || null;
}

export function saveProperty(data) {
  const props = getAllProperties();
  const prop = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), created: new Date().toISOString(), ...data };
  props.push(prop);
  localStorage.setItem('lll-properties', JSON.stringify(props));
  return prop;
}
