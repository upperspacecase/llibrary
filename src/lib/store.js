/**
 * store.js — Data persistence via MongoDB API routes.
 * All functions are async and return Promises.
 *
 * Language preference (i18n.js) remains in localStorage — it's client-only
 * and doesn't need server persistence.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = '/api';

// ---------------------------------------------------------------------------
// Landbook data factories (unchanged — pure data, no IO)
// ---------------------------------------------------------------------------

export function createAutoData() {
  return {
    elevation: null,
    weather: null,
    climate: null,
    soil: null,
    biodiversity: null,
    water: null,
    fire: null,
    protectedAreas: null,
    lastUpdated: null,
  };
}

export function createUserReported() {
  return {
    primaryUse: '',
    secondaryUse: '',
    challenges: [],
    goals: { oneYear: '', threeYear: '', fiveYear: '' },
    infrastructure: { irrigation: '', energy: '', waterSources: '', buildings: '' },
    sharing: '',
    history: '',
    notes: '',
  };
}

// ---------------------------------------------------------------------------
// Landbook CRUD — via /api/landbooks
// ---------------------------------------------------------------------------

/**
 * Get all landbooks.
 * @returns {Promise<Array>}
 */
export async function getAllLandbooks() {
  const res = await fetch(`${API_BASE}/landbooks`);
  if (!res.ok) throw new Error(`Failed to fetch landbooks: ${res.status}`);
  return res.json();
}

/**
 * Get a single landbook by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getLandbook(id) {
  if (!id) return null;
  try {
    const res = await fetch(`${API_BASE}/landbooks/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch landbook: ${res.status}`);
    return res.json();
  } catch (err) {
    console.error('getLandbook error:', err);
    return null;
  }
}

/**
 * Create a new landbook.
 * @param {object} data - { boundary, center, area, perimeter, address }
 * @returns {Promise<object>} - the saved landbook document
 */
export async function saveLandbook(data) {
  const doc = {
    id: crypto.randomUUID(),
    boundary: data.boundary || [],
    center: data.center || null,
    area: data.area || null,
    perimeter: data.perimeter || null,
    address: data.address || '',
    autoData: createAutoData(),
    userReported: createUserReported(),
    created: new Date().toISOString(),
  };

  const res = await fetch(`${API_BASE}/landbooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });

  if (!res.ok) throw new Error(`Failed to save landbook: ${res.status}`);
  return res.json();
}

/**
 * Update a landbook by ID with partial data.
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateLandbook(id, updates) {
  const res = await fetch(`${API_BASE}/landbooks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) throw new Error(`Failed to update landbook: ${res.status}`);
  return res.json();
}

/**
 * Delete a landbook by ID.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteLandbook(id) {
  const res = await fetch(`${API_BASE}/landbooks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete landbook: ${res.status}`);
}

// ---------------------------------------------------------------------------
// Property CRUD — via /api/properties
// ---------------------------------------------------------------------------

/**
 * Get all properties.
 * @returns {Promise<Array>}
 */
export async function getAllProperties() {
  const res = await fetch(`${API_BASE}/properties`);
  if (!res.ok) throw new Error(`Failed to fetch properties: ${res.status}`);
  return res.json();
}

/**
 * Get a single property by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getProperty(id) {
  if (!id) return null;
  try {
    const res = await fetch(`${API_BASE}/properties/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch property: ${res.status}`);
    return res.json();
  } catch (err) {
    console.error('getProperty error:', err);
    return null;
  }
}

/**
 * Create a new property.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function saveProperty(data) {
  const doc = {
    id: crypto.randomUUID(),
    ...data,
    created: new Date().toISOString(),
  };

  const res = await fetch(`${API_BASE}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });

  if (!res.ok) throw new Error(`Failed to save property: ${res.status}`);
  return res.json();
}

/**
 * Update a property by ID.
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateProperty(id, updates) {
  const res = await fetch(`${API_BASE}/properties/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) throw new Error(`Failed to update property: ${res.status}`);
  return res.json();
}

/**
 * Delete a property by ID.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteProperty(id) {
  const res = await fetch(`${API_BASE}/properties/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete property: ${res.status}`);
}
