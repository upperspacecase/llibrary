/**
 * commons.js — Region picker hub for The Commons.
 */

import '../styles/main.css';
import { initI18n } from '../lib/i18n.js';
import { initRegionRequest } from '../lib/region-request.js';

initI18n();
initRegionRequest(document.getElementById('region-request-container'));
