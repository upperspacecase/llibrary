const STORE_KEY = 'lll-properties';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getAllProperties() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  } catch {
    return [];
  }
}

export function getProperty(id) {
  return getAllProperties().find(p => p.id === id) || null;
}

export function saveProperty(data) {
  const properties = getAllProperties();
  const property = {
    id: generateId(),
    created: new Date().toISOString(),
    ...data
  };
  properties.push(property);
  localStorage.setItem(STORE_KEY, JSON.stringify(properties));
  return property;
}
