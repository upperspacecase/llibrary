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
    email: data.email || '',
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
// Submissions — via /api/submissions
// ---------------------------------------------------------------------------

/**
 * Create a new submission with optional file uploads.
 * Files are uploaded client-side directly to Vercel Blob (bypasses serverless size limits),
 * then the submission with blob URLs is saved via the API.
 * @param {object} data - { boundary, center, area, perimeter, address, email, notes }
 * @param {File[]} files - array of File objects to upload
 * @returns {Promise<object>} - the saved submission document
 */
export async function saveSubmission(data, files = []) {
  const submissionId = crypto.randomUUID();
  const uploadedFiles = [];

  // Upload files to Vercel Blob via streaming endpoint
  for (const file of files) {
    const res = await fetch(`${API_BASE}/submissions/upload?filename=submissions/${submissionId}/${file.name}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.status);
      throw new Error(`File upload failed (${file.name}): ${err}`);
    }
    const blob = await res.json();
    uploadedFiles.push({
      name: file.name,
      size: file.size,
      type: file.type,
      url: blob.url,
    });
  }

  // Save submission with blob URLs
  const doc = {
    id: submissionId,
    boundary: data.boundary || [],
    center: data.center || null,
    area: data.area || null,
    perimeter: data.perimeter || null,
    postcode: data.postcode || '',
    name: data.name || '',
    contactMethod: data.contactMethod || 'email',
    contact: data.contact || '',
    files: uploadedFiles,
  };

  const res = await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });

  if (!res.ok) throw new Error(`Failed to save submission: ${res.status}`);
  return res.json();
}

export async function updateSubmission(id, data) {
  const res = await fetch(`${API_BASE}/submissions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error(`Failed to update submission: ${res.status}`);
  return res.json();
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
