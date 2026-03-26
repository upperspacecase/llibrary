/**
 * Region registry — central index of all available regions.
 * Each region module exports: REGION, SECTIONS, EVENTS_CALENDAR, LANDMARKS
 * and optionally PT translations.
 */

import * as odemira from './odemira.js';
import * as algarve from './algarve.js';

export const REGIONS = {
  odemira: {
    id: 'odemira',
    label: 'Odemira',
    subtitle: 'Southwest Alentejo, Portugal',
    status: 'live',
    ...odemira,
  },
  algarve: {
    id: 'algarve',
    label: 'Algarve',
    subtitle: 'Southern Portugal',
    status: 'live',
    ...algarve,
  },
};

export const DEFAULT_REGION = 'odemira';

export function getRegion(id) {
  return REGIONS[id] || REGIONS[DEFAULT_REGION];
}

export function getAllRegions() {
  return Object.values(REGIONS);
}

export function getLiveRegions() {
  return Object.values(REGIONS).filter(r => r.status === 'live');
}
