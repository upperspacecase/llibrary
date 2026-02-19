const API_BASE = '/api/properties';

export async function getAllProperties() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getProperty(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveProperty(data) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save property');
  return await res.json();
}
