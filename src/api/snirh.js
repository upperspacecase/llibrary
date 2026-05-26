/**
 * SNIRH — Sistema Nacional de Informação de Recursos Hídricos.
 * https://snirh.apambiente.pt/
 *
 * Reverse-engineered crawler over the (undocumented) form-driven PHP portal.
 * Six endpoints, session-cookie state, HTML/XML parsing with cheerio.
 *
 *   1. GET  /index.php?idMain=2&idItem=1                                  — bootstrap session
 *   2. POST /index.php?idMain=2&idItem=1   { f_redes_seleccao[]=NET }     — pin filter
 *   3. GET  /snirh/_dadosbase/site/xml/xml_listaestacoes.php              — station list (XML)
 *   4. GET  /snirh/_dadosbase/site/janela.php?obj_janela=INFO_ESTACOES&estacao=UID — station detail
 *   5. GET  /snirh/_dadosbase/site/_ajax_listaparscomdados.php?sites=UID  — parameter list
 *   6. GET  /snirh/_dadosbase/site/janela_verdados.php?sites=&pars=&tmin=&tmax= — timeseries
 *
 * IMPORTANT: SNIRH network UIDs are 9-digit numbers (e.g. 100290946 for
 * Piezometria), NOT the 1-8 single digits the 2022 reference suggested.
 * Verified live 2026-05-26 — list with scripts/snirh-discover.mjs --list-networks.
 *
 * Known network UIDs for Odemira-relevant data:
 *   920123705  Hidrométrica            — river level & flow
 *   100290946  Piezometria             — groundwater levels (~1100 stations)
 *   100290943  Nascentes               — springs
 *   100290952  Qualidade águas subt.   — groundwater quality
 *   920123704  Meteorológica           — historical met
 *
 * Known parameter UIDs (network 100290946 / piezometria):
 *   100290981  Nível piezométrico       — water table elevation
 *   2277       Profundidade Nível Água  — depth to water (standard well metric)
 *
 * Date format on every endpoint is DD/MM/YYYY (Portuguese).
 * Values come back with a quality-flag prefix like "(V) 1.23"; strip it.
 */

import { load as cheerioLoad } from 'cheerio';
import { fetchWithPolicy } from '../lib/fetch-policy.js';

const BASE = 'https://snirh.apambiente.pt';
const UA   = 'Mozilla/5.0 (LandBook research; +https://landlibrary.co)';

// ── Cookie jar ─────────────────────────────────────────────
//
// PHP session state lives in PHPSESSID cookie set by the index page.
// We need to parse Set-Cookie back into a single Cookie header for every
// subsequent request. Tiny manual jar — adding tough-cookie would pull
// in another dep we don't otherwise need.

function parseSetCookies(setCookieHeaders) {
  const jar = {};
  for (const sc of setCookieHeaders) {
    const [pair] = sc.split(';');
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function mergeJar(target, incoming) {
  return { ...target, ...incoming };
}

/**
 * Pull Set-Cookie out of a Headers / Map / plain object. Node fetch's
 * `headers.getSetCookie()` returns an array; older runtimes need the
 * fallback path.
 */
function readSetCookies(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    return res.headers.getSetCookie() || [];
  }
  const raw = res.headers.get('set-cookie');
  return raw ? [raw] : [];
}

// ── Session ───────────────────────────────────────────────

/**
 * Bootstrap a SNIRH session and pin a network filter.
 * @param {string|number} networkUid
 * @returns {Promise<{ jar: object, networkUid: string }>}
 */
export async function snirhSession(networkUid) {
  // Step 1: GET the data page to receive PHPSESSID
  const r1 = await fetchWithPolicy(`${BASE}/index.php?idMain=2&idItem=1`, {
    headers: { 'user-agent': UA, accept: 'text/html' },
  }, { source: 'snirh-session-bootstrap', timeoutMs: 30000 });
  if (!r1.ok) throw new Error(`SNIRH session bootstrap HTTP ${r1.status}`);
  let jar = parseSetCookies(readSetCookies(r1));

  // Step 2: POST the network filter
  const body = new URLSearchParams();
  body.append('f_redes_seleccao[]', String(networkUid));
  body.append('aplicar_filtro', '1');
  const r2 = await fetchWithPolicy(`${BASE}/index.php?idMain=2&idItem=1`, {
    method: 'POST',
    headers: {
      'user-agent': UA,
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookieHeader(jar),
      referer: `${BASE}/index.php?idMain=2&idItem=1`,
    },
    body: body.toString(),
    redirect: 'manual',
  }, { source: 'snirh-session-filter', timeoutMs: 30000 });
  // Status will be 200 or 302. We don't care; the server-side filter is set.
  jar = mergeJar(jar, parseSetCookies(readSetCookies(r2)));

  return { jar, networkUid: String(networkUid) };
}

// ── Networks ───────────────────────────────────────────────

/**
 * List all top-level networks visible on the data page.
 * @returns {Promise<Array<{uid: string, name: string}>>}
 */
export async function listNetworks() {
  const r = await fetchWithPolicy(`${BASE}/index.php?idMain=2&idItem=1`, {
    headers: { 'user-agent': UA, accept: 'text/html' },
  }, { source: 'snirh-networks', timeoutMs: 30000 });
  if (!r.ok) throw new Error(`SNIRH networks HTTP ${r.status}`);
  const $ = cheerioLoad(await r.text());
  const out = [];
  $('select[name="f_redes_todas[]"] option, select[name="f_redes[]"] option')
    .each((_, el) => {
      const uid = ($(el).attr('value') || '').trim();
      const name = ($(el).text() || '').trim();
      if (uid) out.push({ uid, name });
    });
  return out;
}

// ── Stations ──────────────────────────────────────────────

/**
 * List stations under the network pinned in the session.
 *
 * Each `<marker>` carries lat/lng/cover/redenome attributes directly, so
 * one call is enough to bbox-filter — no per-station detail fetch needed.
 *
 * @param {{jar: object}} session
 * @returns {Promise<Array<{uid: string, label: string, code: string, lat: number|null, lng: number|null, redenome: string}>>}
 */
export async function listStations(session) {
  const r = await fetchWithPolicy(
    `${BASE}/snirh/_dadosbase/site/xml/xml_listaestacoes.php`,
    {
      headers: {
        'user-agent': UA,
        accept: 'application/xml',
        cookie: cookieHeader(session.jar),
        referer: `${BASE}/index.php?idMain=2&idItem=1`,
      },
    },
    { source: 'snirh-stations', timeoutMs: 30000 },
  );
  if (!r.ok) throw new Error(`SNIRH stations HTTP ${r.status}`);
  const xml = await r.text();

  // Cheerio's XML mode mis-counts these self-closing markers when the
  // start tag spans multiple lines and contains `&amp;`-escaped sub-HTML.
  // Regex against the start tag is more robust here.
  const out = [];
  const tagRegex = /<marker\s+([^>]+?)\/?>/g;
  let m;
  while ((m = tagRegex.exec(xml)) !== null) {
    const attrText = m[1];
    const attrs = {};
    const aRegex = /(\w+)\s*=\s*"([^"]*)"/g;
    let a;
    while ((a = aRegex.exec(attrText)) !== null) attrs[a[1]] = a[2];

    const uid = (attrs.site || '').trim();
    if (!uid) continue;
    const label = (attrs.estacao || '').replace(/&#?\w+;?/g, '').trim();
    const codeMatch = label.match(/\b([0-9A-Z]+\/[0-9A-Z]+)\b/) || label.match(/\(([^)]+)\)\s*$/);
    const code = codeMatch ? codeMatch[1] : '';
    out.push({
      uid,
      label,
      code,
      lat: attrs.lat ? parseFloat(attrs.lat) : null,
      lng: attrs.lng ? parseFloat(attrs.lng) : null,
      redenome: (attrs.redenome || '').trim(),
    });
  }
  return out;
}

/**
 * Fetch the static metadata pane for one station (lat/lng, basin, install
 * dates, telemetry flag). Returns whatever k/v pairs the HTML table holds.
 *
 * @param {{jar: object}} session
 * @param {string} stationUid
 */
export async function stationDetail(session, stationUid) {
  const r = await fetchWithPolicy(
    `${BASE}/snirh/_dadosbase/site/janela.php?obj_janela=INFO_ESTACOES&estacao=${encodeURIComponent(stationUid)}`,
    {
      headers: {
        'user-agent': UA,
        accept: 'text/html',
        cookie: cookieHeader(session.jar),
        referer: `${BASE}/index.php?idMain=2&idItem=1`,
      },
    },
    { source: 'snirh-station-detail', timeoutMs: 30000 },
  );
  if (!r.ok) throw new Error(`SNIRH station detail HTTP ${r.status}`);
  const $ = cheerioLoad(await r.text());
  const fields = {};
  $('tr').each((_, tr) => {
    const cells = $(tr).find('td');
    if (cells.length >= 2) {
      const k = $(cells[0]).text().replace(/[:\s]+$/, '').trim().toLowerCase();
      const v = $(cells[1]).text().trim();
      if (k && v) fields[k] = v;
    }
  });
  // Normalise the fields LandBook actually cares about — Portuguese keys are
  // brittle, so map a few of the canonical ones here.
  return {
    raw: fields,
    name:        fields['nome da estação'] || fields['estação'] || null,
    lat:         parseFloat(fields['latitude (graus)']         || fields['latitude']  || '') || null,
    lng:         parseFloat(fields['longitude (graus)']        || fields['longitude'] || '') || null,
    elevation:   parseFloat(fields['altitude (m)']             || '') || null,
    basin:       fields['bacia hidrográfica']  || fields['bacia']  || null,
    district:    fields['distrito']            || null,
    telemetric:  /sim|yes|true/i.test(fields['telemetria'] || ''),
    activeUntil: fields['data de fim']         || null,
    activeFrom:  fields['data de início']      || null,
    status:      fields['estado']              || null,
  };
}

// ── Parameters ────────────────────────────────────────────

/**
 * List parameter UIDs available at a station (river level, flow rate,
 * piezometric head, etc.).
 *
 * @param {{jar: object}} session
 * @param {string} stationUid
 * @returns {Promise<Array<{uid: string, name: string}>>}
 */
export async function listParameters(session, stationUid) {
  const r = await fetchWithPolicy(
    `${BASE}/snirh/_dadosbase/site/_ajax_listaparscomdados.php?sites=${encodeURIComponent(stationUid)}`,
    {
      headers: {
        'user-agent': UA,
        accept: 'text/html',
        cookie: cookieHeader(session.jar),
        referer: `${BASE}/index.php?idMain=2&idItem=1`,
      },
    },
    { source: 'snirh-parameters', timeoutMs: 30000 },
  );
  if (!r.ok) throw new Error(`SNIRH parameters HTTP ${r.status}`);
  const $ = cheerioLoad(await r.text());
  const out = [];
  $('option').each((_, el) => {
    const uid = ($(el).attr('value') || '').trim();
    if (!uid) return;
    const name = $(el).text().replace(/■/g, '').trim();
    out.push({ uid, name });
  });
  return out;
}

// ── Time series ───────────────────────────────────────────

function formatDateBR(d) {
  // SNIRH wants DD/MM/YYYY
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/**
 * Pull a parameter's time series at a station over the date range.
 * Returns `[{timestamp: Date, value: number}]`.
 *
 * @param {{jar: object}} session
 * @param {string} stationUid
 * @param {string} parameterUid
 * @param {Date} tmin
 * @param {Date} tmax
 */
export async function fetchTimeseries(session, stationUid, parameterUid, tmin, tmax) {
  const url = `${BASE}/snirh/_dadosbase/site/janela_verdados.php`
    + `?sites=${encodeURIComponent(stationUid)}`
    + `&pars=${encodeURIComponent(parameterUid)}`
    + `&tmin=${encodeURIComponent(formatDateBR(tmin))}`
    + `&tmax=${encodeURIComponent(formatDateBR(tmax))}`;
  const r = await fetchWithPolicy(url, {
    headers: {
      'user-agent': UA,
      accept: 'text/html',
      cookie: cookieHeader(session.jar),
      referer: `${BASE}/index.php?idMain=2&idItem=1`,
    },
  }, { source: 'snirh-timeseries', timeoutMs: 60000 });
  if (!r.ok) throw new Error(`SNIRH timeseries HTTP ${r.status}`);
  const html = await r.text();
  const $ = cheerioLoad(html);

  // Strategy mirrors the Python `pd.read_html(...)[-1]` + iloc[2:] move:
  // grab the last table on the page and skip the first two rows (which
  // are the station and parameter labels rather than data).
  const tables = $('table').toArray();
  if (!tables.length) return [];
  const $table = $(tables[tables.length - 1]);
  const rows = $table.find('tr').toArray();
  const out = [];
  for (let i = 2; i < rows.length; i++) {
    const cells = $(rows[i]).find('td').toArray();
    if (cells.length < 2) continue;
    const tsRaw = $(cells[0]).text().trim();
    const vRaw  = $(cells[1]).text().trim();
    if (!tsRaw || vRaw === '-' || vRaw === '') continue;

    // Quality-flag stripping: "(V) 1.23" → 1.23
    const cleaned = vRaw.replace(/^\([A-Z]\)\s*/, '').replace(/[,\s]+/g, '');
    const value = parseFloat(cleaned);
    if (!Number.isFinite(value)) continue;

    // Timestamps come in two flavours: "DD/MM/YYYY" and "DD/MM/YYYY HH:MM"
    const m = tsRaw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
    if (!m) continue;
    const [, dd, mm, yyyy, hh = '00', mi = '00'] = m;
    const timestamp = new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi));
    if (Number.isNaN(timestamp.getTime())) continue;

    out.push({ timestamp, value });
  }
  return out;
}

// ── Convenience: stations within a bbox ───────────────────

/**
 * Filter a station list to those whose station detail places them inside
 * the provided lat/lng bbox. Performs N station-detail fetches in series
 * (one per station) — keep N small or batch this offline.
 *
 * bbox: { swLat, swLng, neLat, neLng }
 */
export async function filterStationsByBbox(session, stations, bbox, opts = {}) {
  const { limit = stations.length, delayMs = 200 } = opts;
  const out = [];
  for (const s of stations.slice(0, limit)) {
    try {
      const d = await stationDetail(session, s.uid);
      if (d.lat != null && d.lng != null
          && d.lat >= bbox.swLat && d.lat <= bbox.neLat
          && d.lng >= bbox.swLng && d.lng <= bbox.neLng) {
        out.push({ ...s, ...d });
      }
    } catch (e) {
      // Don't fail the whole batch on one bad station.
      console.warn(`[snirh] station ${s.uid} detail failed:`, e.message);
    }
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
  }
  return out;
}
