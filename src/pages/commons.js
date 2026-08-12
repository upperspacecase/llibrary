/**
 * commons.js — Region picker hub for The Commons.
 */

import '../styles/main.css';
import { initI18n } from '../lib/i18n.js';
import { initRegionRequest } from '../lib/region-request.js';
import { renderRegionPicker } from '../lib/region-cards.js';

initI18n();
renderRegionPicker(document.getElementById('region-picker'));
initRegionRequest(document.getElementById('region-request-container'));
