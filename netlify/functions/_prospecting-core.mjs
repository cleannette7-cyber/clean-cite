import { createHash, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { getStore } from '@netlify/blobs';
import { extractEmail, getConnection, gmailFetch, headerMap, sendGmailMail } from './_gmail-common.mjs';

const DAY = 86_400_000;
const THREE_YEARS = 3 * 365 * DAY;
const SITE_ORIGIN = String(process.env.PROSPECTING_PUBLIC_URL || 'https://clean-cite.org').replace(/\/$/, '');
const COMPANY = {
  name: 'Clean-Cité',
  address: '149 rue de Paris, 93000 Bobigny',
  phone: '07 66 53 61 54',
  email: 'cleannette7@gmail.com',
};

export const DEFAULT_PROSPECTING_SETTINGS = {
  version: 1,
  keyword: 'conciergerie Airbnb',
  defaultLocation: 'Île-de-France',
  searchLimit: 20,
  dailySendLimit: 20,
  autoFollowup: true,
  initialSubject: 'Partenariat nettoyage Airbnb à {{ville}} — Clean-Cité',
  initialBody: `Bonjour,

Je me permets de vous contacter car votre activité concerne la gestion de locations courte durée à {{ville}}.

Clean-Cité, entreprise de nettoyage professionnel basée à Bobigny, accompagne les conciergeries et propriétaires Airbnb en Île-de-France pour le nettoyage entre deux séjours, ponctuellement ou régulièrement.

Avez-vous actuellement besoin d’un partenaire de nettoyage fiable pour certaines rotations ? Nous serions ravis d’échanger avec vous afin de vous proposer une organisation adaptée.

Bien cordialement,
L’équipe Clean-Cité
07 66 53 61 54
https://clean-cite.org`,
  followupBody: `Bonjour,

Je me permets de revenir vers vous au sujet de notre proposition de nettoyage pour vos locations courte durée à {{ville}}.

Si vous recherchez encore un partenaire pour certaines rotations, nous pouvons échanger rapidement sur vos besoins et vos zones d’intervention.

Bien cordialement,
L’équipe Clean-Cité
07 66 53 61 54
https://clean-cite.org`,
};

const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const nowIso = () => new Date().toISOString();
const emailHash = (email) => createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex');
const prospectId = (value) => `p-${createHash('sha256').update(String(value)).digest('hex').slice(0, 32)}`;

export function prospectStore() {
  return getStore({ name: 'clean-cite-airbnb-prospects', consistency: 'strong' });
}

export function expectedProspectingSender() {
  return normalizeEmail(process.env.PROSPECTING_SENDER_EMAIL || COMPANY.email);
}

export function normalizeEmail(value) {
  return extractEmail(value).trim().toLowerCase();
}

const GENERIC_PREFIXES = new Set([
  'accueil', 'admin', 'bonjour', 'booking', 'commercial', 'conciergerie', 'contact',
  'direction', 'equipe', 'hello', 'info', 'office', 'reservation', 'reservations',
  'service', 'team',
]);
const REJECTED_PREFIXES = /^(abuse|dpo|example|hostmaster|mailer-daemon|no-?reply|privacy|rgpd|webmaster)$/i;
const REJECTED_DOMAINS = /(^|\.)(example\.(com|org|net)|sentry\.io|wixpress\.com|cloudflare\.com|schema\.org)$/i;

export function isGenericBusinessEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return false;
  return GENERIC_PREFIXES.has(email.split('@')[0].replace(/[._-].*$/, ''));
}

function decodeEmailText(html) {
  return String(html || '')
    .replace(/&#0*64;|&#x0*40;|&commat;/gi, '@')
    .replace(/&#0*46;|&#x0*2e;|&period;/gi, '.')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s*(?:\[|\(|\{)\s*at\s*(?:\]|\)|\})\s*/gi, '@')
    .replace(/\s*(?:\[|\(|\{)\s*dot\s*(?:\]|\)|\})\s*/gi, '.');
}

export function extractPublicEmails(html, sourceUrl = '') {
  const decoded = decodeEmailText(html);
  const found = new Map();
  const add = (raw, method) => {
    const email = normalizeEmail(String(raw || '').replace(/^mailto:/i, '').split('?')[0]);
    if (!email) return;
    const [local, domain] = email.split('@');
    if (REJECTED_PREFIXES.test(local) || REJECTED_DOMAINS.test(domain)) return;
    if (/\.(avif|css|gif|jpe?g|js|png|svg|webp)$/i.test(email)) return;
    const generic = isGenericBusinessEmail(email);
    const current = found.get(email);
    const candidate = { email, sourceUrl: clean(sourceUrl, 1000), generic, method };
    if (!current || method === 'mailto') found.set(email, candidate);
  };
  for (const match of decoded.matchAll(/mailto:([^"'<>\s]+)/gi)) add(match[1], 'mailto');
  for (const match of decoded.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi)) add(match[0], 'text');
  return [...found.values()];
}

function safePublicUrl(value, base) {
  let url;
  try { url = new URL(value, base); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || isIP(host) || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  if (url.port && !['80', '443'].includes(url.port)) return null;
  url.hash = '';
  return url;
}

const verifiedPublicHosts = new Set();
function isPrivateAddress(address) {
  const value = String(address || '').toLowerCase();
  if (value.includes(':')) {
    if (value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) return true;
    const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    return mapped ? isPrivateAddress(mapped) : false;
  }
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
}

async function assertPublicHost(hostname) {
  if (verifiedPublicHosts.has(hostname)) return;
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error('Le site pointe vers une adresse réseau non autorisée.');
  verifiedPublicHosts.add(hostname);
}

async function readTextLimited(response, maxBytes = 800_000) {
  if (!response.body?.getReader) return (await response.text()).slice(0, maxBytes);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function fetchHtml(input, redirects = 0) {
  const url = safePublicUrl(input);
  if (!url) throw new Error('Adresse du site non autorisée.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    await assertPublicHost(url.hostname);
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2',
        'User-Agent': 'Clean-Cite-Prospection/1.0 (+https://clean-cite.org/confidentialite.html)',
      },
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location') && redirects < 3) {
      const next = safePublicUrl(response.headers.get('location'), url);
      if (!next) throw new Error('Redirection non autorisée.');
      return fetchHtml(next.href, redirects + 1);
    }
    if (!response.ok) throw new Error(`Site indisponible (${response.status}).`);
    const type = String(response.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('text/html') && !type.includes('application/xhtml')) throw new Error('La page n’est pas au format HTML.');
    const length = Number(response.headers.get('content-length') || 0);
    if (length > 2_000_000) throw new Error('Page trop volumineuse.');
    return { html: await readTextLimited(response), url: safePublicUrl(response.url || url.href)?.href || url.href };
  } finally {
    clearTimeout(timer);
  }
}

function stripTags(value) {
  return clean(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), 180);
}

function metaValue(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = String(html || '').match(pattern);
    if (match?.[1]) return stripTags(match[1]);
  }
  return '';
}

function siteName(html, url) {
  const og = metaValue(html, 'og:site_name');
  if (og) return og;
  const title = stripTags(String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  if (title) return clean(title.split(/\s+[|–—-]\s+/)[0], 160);
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Conciergerie'; }
}

function contactLinks(html, pageUrl) {
  const base = safePublicUrl(pageUrl);
  if (!base) return [];
  const links = [];
  for (const match of String(html || '').matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = decodeEmailText(match[1]).replace(/&amp;/gi, '&');
    if (!/(contact|nous-contacter|mentions|legal|about|a-propos|qui-sommes)/i.test(href)) continue;
    const url = safePublicUrl(href, base);
    if (!url || url.origin !== base.origin || url.href === base.href) continue;
    if (!links.includes(url.href)) links.push(url.href);
    if (links.length >= 3) break;
  }
  return links;
}

function rankEmail(candidate, websiteHost) {
  const domain = candidate.email.split('@')[1];
  const sameDomain = domain === websiteHost || websiteHost.endsWith(`.${domain}`) || domain.endsWith(`.${websiteHost}`);
  return (candidate.generic ? 100 : 20) + (sameDomain ? 35 : 0) + (candidate.method === 'mailto' ? 15 : 0) + (/contact|mention|legal/i.test(candidate.sourceUrl) ? 10 : 0);
}

export async function discoverWebsite(website) {
  const home = await fetchHtml(website);
  const originHost = new URL(home.url).hostname.replace(/^www\./, '').toLowerCase();
  const candidates = extractPublicEmails(home.html, home.url);
  for (const link of contactLinks(home.html, home.url)) {
    try {
      const page = await fetchHtml(link);
      candidates.push(...extractPublicEmails(page.html, page.url));
    } catch {}
  }
  const unique = new Map();
  for (const item of candidates) {
    const old = unique.get(item.email);
    if (!old || rankEmail(item, originHost) > rankEmail(old, originHost)) unique.set(item.email, item);
  }
  const emails = [...unique.values()].sort((a, b) => rankEmail(b, originHost) - rankEmail(a, originHost)).slice(0, 10);
  return {
    website: home.url,
    companyName: siteName(home.html, home.url),
    emails,
  };
}

export function renderProspectTemplate(template, prospect) {
  const replacements = {
    entreprise: prospect.companyName || 'votre conciergerie',
    ville: prospect.location || 'votre secteur',
    site: prospect.website || '',
    source: prospect.emailSourceUrl || prospect.website || '',
  };
  return String(template || '').replace(/{{\s*(entreprise|ville|site|source)\s*}}/gi, (_, key) => replacements[key.toLowerCase()] || '');
}

function complianceFooter(prospect) {
  const unsubscribe = `${SITE_ORIGIN}/.netlify/functions/prospecting-unsubscribe?id=${encodeURIComponent(prospect.id)}&token=${encodeURIComponent(prospect.unsubscribeToken)}`;
  return `\n\n—\nPourquoi cet e-mail ? Vos coordonnées professionnelles ont été trouvées sur une source publique liée à votre activité (${prospect.emailSourceUrl || prospect.website || 'site professionnel'}). Clean-Cité les utilise pour vous présenter une prestation en lien avec votre activité, sur la base de son intérêt légitime. Pour ne plus recevoir de sollicitations : ${unsubscribe}\nPolitique de confidentialité : ${SITE_ORIGIN}/confidentialite.html`;
}

function normalizeSettings(input = {}) {
  return {
    version: 1,
    keyword: clean(input.keyword || DEFAULT_PROSPECTING_SETTINGS.keyword, 120),
    defaultLocation: clean(input.defaultLocation || DEFAULT_PROSPECTING_SETTINGS.defaultLocation, 160),
    searchLimit: Math.max(1, Math.min(40, Number(input.searchLimit) || DEFAULT_PROSPECTING_SETTINGS.searchLimit)),
    dailySendLimit: Math.max(1, Math.min(50, Number(input.dailySendLimit) || DEFAULT_PROSPECTING_SETTINGS.dailySendLimit)),
    autoFollowup: input.autoFollowup !== false,
    initialSubject: clean(input.initialSubject || DEFAULT_PROSPECTING_SETTINGS.initialSubject, 240),
    initialBody: clean(input.initialBody || DEFAULT_PROSPECTING_SETTINGS.initialBody, 8_000),
    followupBody: clean(input.followupBody || DEFAULT_PROSPECTING_SETTINGS.followupBody, 8_000),
    updatedAt: nowIso(),
  };
}

export async function getProspectingSettings() {
  const saved = await prospectStore().get('settings', { type: 'json', consistency: 'strong' }).catch(() => null);
  return normalizeSettings({ ...DEFAULT_PROSPECTING_SETTINGS, ...(saved || {}) });
}

export async function saveProspectingSettings(input) {
  const settings = normalizeSettings(input);
  await prospectStore().setJSON('settings', settings);
  return settings;
}

export async function listProspects(limit = 500) {
  const store = prospectStore();
  const { blobs } = await store.list({ prefix: 'prospects/' });
  const rows = await Promise.all((blobs || []).slice(0, Math.max(1, Math.min(1000, limit))).map((blob) => store.get(blob.key, { type: 'json', consistency: 'strong' }).catch(() => null)));
  return rows.filter(Boolean).sort((a, b) => String(b.updatedAt || b.collectedAt || '').localeCompare(String(a.updatedAt || a.collectedAt || '')));
}

export async function getProspect(id) {
  if (!/^p-[a-f0-9]{32}$/.test(String(id || ''))) return null;
  return prospectStore().get(`prospects/${id}`, { type: 'json', consistency: 'strong' }).catch(() => null);
}

async function upsertDiscoveredProspect({ googlePlaceId, location, discovered }) {
  const store = prospectStore();
  const websiteHost = new URL(discovered.website).hostname.replace(/^www\./, '').toLowerCase();
  const id = prospectId(googlePlaceId || discovered.website);
  const key = `prospects/${id}`;
  const existing = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' }).catch(() => null);
  const primary = discovered.emails[0] || null;
  const at = nowIso();
  const base = existing?.data || {};
  const email = base.email || primary?.email || '';
  const generic = email ? isGenericBusinessEmail(email) : false;
  const previouslyConfirmed = !!base.email && base.emailReviewRequired === false;
  const status = base.status && !['missing_email', 'review', 'ready'].includes(base.status)
    ? base.status
    : email ? (generic || previouslyConfirmed ? 'ready' : 'review') : 'missing_email';
  const record = {
    ...base,
    id,
    googlePlaceId: clean(googlePlaceId, 200),
    companyName: base.companyName || clean(discovered.companyName || websiteHost, 180),
    location: base.location || clean(location, 160),
    website: clean(discovered.website, 1000),
    email,
    emailSourceUrl: base.emailSourceUrl || primary?.sourceUrl || '',
    emailCandidates: discovered.emails.map((item) => ({ email: item.email, sourceUrl: item.sourceUrl, generic: item.generic })).slice(0, 10),
    emailReviewRequired: base.email ? !!base.emailReviewRequired : !!email && !generic,
    sourceType: 'site_professionnel_public',
    collectedAt: base.collectedAt || at,
    updatedAt: at,
    status,
    unsubscribeToken: base.unsubscribeToken || randomBytes(24).toString('hex'),
    followupStage: Number(base.followupStage) || 0,
  };
  if (existing?.data) {
    const result = await store.setJSON(key, record, { onlyIfMatch: existing.etag });
    if (!result.modified) throw new Error('Ce prospect a été modifié pendant la recherche. Recharge la liste.');
    return { record, created: false };
  }
  const result = await store.setJSON(key, record, { onlyIfNew: true });
  if (!result.modified) return { record: await getProspect(id), created: false };
  return { record, created: true };
}

async function placesPage({ apiKey, textQuery, pageSize, pageToken }) {
  const body = { textQuery, pageSize, languageCode: 'fr', regionCode: 'FR', includePureServiceAreaBusinesses: true };
  if (pageToken) body.pageToken = pageToken;
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.websiteUri,nextPageToken',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Recherche Google Places indisponible (${response.status}).`);
  return data;
}

async function inBatches(items, concurrency, worker) {
  const results = [];
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

export async function discoverProspects({ keyword, location, limit }) {
  const apiKey = clean(process.env.GOOGLE_PLACES_API_KEY, 500);
  if (!apiKey) throw new Error('La clé Google Places n’est pas encore configurée dans Netlify.');
  const safeKeyword = clean(keyword || DEFAULT_PROSPECTING_SETTINGS.keyword, 120);
  const safeLocation = clean(location, 160);
  const wanted = Math.max(1, Math.min(40, Number(limit) || 20));
  if (!safeLocation) throw new Error('Indique une ville, un département ou une région.');
  const places = [];
  let token = '';
  do {
    const page = await placesPage({ apiKey, textQuery: `${safeKeyword} ${safeLocation}`, pageSize: Math.min(20, wanted - places.length), pageToken: token });
    for (const place of page.places || []) if (place.id && !places.some((item) => item.id === place.id)) places.push(place);
    token = page.nextPageToken || '';
  } while (token && places.length < wanted);

  let created = 0;
  let updated = 0;
  let withoutWebsite = 0;
  let crawlErrors = 0;
  const saved = await inBatches(places.slice(0, wanted), 3, async (place) => {
    if (!place.websiteUri) { withoutWebsite++; return null; }
    try {
      const discovered = await discoverWebsite(place.websiteUri);
      const result = await upsertDiscoveredProspect({ googlePlaceId: place.id, location: safeLocation, discovered });
      if (result.created) created++; else updated++;
      return result.record;
    } catch (error) {
      console.error('prospecting-crawl', place.id, error.message);
      crawlErrors++;
      return null;
    }
  });
  return { found: places.length, saved: saved.filter(Boolean).length, created, updated, withoutWebsite, crawlErrors };
}

function validJobId(value) {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(String(value || ''));
}

export async function queueProspectingJob({ jobId, keyword, location, limit }) {
  if (!validJobId(jobId)) throw new Error('Identifiant de recherche invalide.');
  const settings = await getProspectingSettings();
  const job = {
    id: jobId,
    runToken: randomBytes(24).toString('hex'),
    status: 'queued',
    keyword: clean(keyword || settings.keyword, 120),
    location: clean(location || settings.defaultLocation, 160),
    limit: Math.max(1, Math.min(40, Number(limit) || settings.searchLimit)),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  if (!job.location) throw new Error('Indique une ville, un département ou une région.');
  if (!String(process.env.GOOGLE_PLACES_API_KEY || '').trim()) throw new Error('La clé Google Places n’est pas encore configurée dans Netlify.');
  const result = await prospectStore().setJSON(`jobs/${job.id}`, job, { onlyIfNew: true });
  if (!result.modified) throw new Error('Cette recherche existe déjà.');
  return job;
}

export async function getProspectingJob(jobId) {
  if (!validJobId(jobId)) return null;
  return prospectStore().get(`jobs/${jobId}`, { type: 'json', consistency: 'strong' }).catch(() => null);
}

export async function runProspectingJob(jobId, runToken) {
  const store = prospectStore();
  const job = await getProspectingJob(jobId);
  if (!job) throw new Error('Recherche introuvable.');
  if (!/^[a-f0-9]{48}$/.test(String(runToken || '')) || job.runToken !== runToken) throw new Error('Autorisation de recherche invalide.');
  if (job.status === 'completed') return job;
  await store.setJSON(`jobs/${jobId}`, { ...job, status: 'running', startedAt: nowIso(), updatedAt: nowIso() });
  try {
    const result = await discoverProspects(job);
    const completed = { ...job, status: 'completed', result, completedAt: nowIso(), updatedAt: nowIso() };
    await store.setJSON(`jobs/${jobId}`, completed);
    return completed;
  } catch (error) {
    const failed = { ...job, status: 'failed', error: clean(error.message || 'Recherche impossible.', 500), completedAt: nowIso(), updatedAt: nowIso() };
    await store.setJSON(`jobs/${jobId}`, failed);
    return failed;
  }
}

export async function updateProspect(input) {
  const id = clean(input.id, 80);
  const store = prospectStore();
  const key = `prospects/${id}`;
  const current = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
  if (!current?.data) throw new Error('Prospect introuvable.');
  if (['contacted', 'followed_up', 'replied', 'unsubscribed'].includes(current.data.status) && input.email && normalizeEmail(input.email) !== current.data.email) {
    throw new Error('L’adresse d’un prospect déjà contacté ne peut pas être remplacée.');
  }
  const email = input.email === undefined ? current.data.email : normalizeEmail(input.email);
  if (input.email !== undefined && !email) throw new Error('Adresse e-mail invalide.');
  const allowedStatus = new Set(['ready', 'review', 'missing_email', 'contacted', 'paused', 'replied', 'unsubscribed']);
  let status = allowedStatus.has(input.status) ? input.status : current.data.status;
  if (input.email !== undefined && input.confirmEmail) status = 'ready';
  const record = {
    ...current.data,
    companyName: input.companyName === undefined ? current.data.companyName : clean(input.companyName, 180),
    location: input.location === undefined ? current.data.location : clean(input.location, 160),
    email,
    emailSourceUrl: input.emailSourceUrl === undefined ? current.data.emailSourceUrl : clean(input.emailSourceUrl, 1000),
    notes: input.notes === undefined ? current.data.notes : clean(input.notes, 2000),
    emailReviewRequired: input.email !== undefined ? !input.confirmEmail : current.data.emailReviewRequired,
    emailConfirmedAt: input.email !== undefined && input.confirmEmail ? nowIso() : (input.email !== undefined ? '' : current.data.emailConfirmedAt),
    status,
    repliedAt: status === 'replied' ? (current.data.repliedAt || nowIso()) : current.data.repliedAt,
    updatedAt: nowIso(),
  };
  const result = await store.setJSON(key, record, { onlyIfMatch: current.etag });
  if (!result.modified) throw new Error('Le prospect a été modifié entre-temps. Recharge la liste.');
  return record;
}

async function isSuppressed(email) {
  return !!(await prospectStore().get(`suppressions/${emailHash(email)}`, { type: 'json', consistency: 'strong' }).catch(() => null));
}

function sameUtcDay(value, now = new Date()) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
}

async function sentToday(now = new Date()) {
  const prospects = await listProspects(1000);
  return prospects.reduce((count, prospect) => count + (sameUtcDay(prospect.sentAt, now) ? 1 : 0) + (sameUtcDay(prospect.followupSentAt, now) ? 1 : 0), 0);
}

export async function sendInitialProspects(ids, now = new Date()) {
  const settings = await getProspectingSettings();
  const connection = await getConnection();
  if (!connection?.refreshToken) throw new Error('Gmail n’est pas connecté. Ouvre d’abord le module Mail IA.');
  if (normalizeEmail(connection.email) !== expectedProspectingSender()) throw new Error(`La boîte Gmail connectée n’est pas celle de Clean-Cité. Reconnecte ${expectedProspectingSender()} depuis Mail IA.`);
  const selected = [...new Set((Array.isArray(ids) ? ids : []).map(String))].slice(0, 20);
  if (!selected.length) throw new Error('Sélectionne au moins un prospect.');
  let remaining = Math.max(0, settings.dailySendLimit - await sentToday(now));
  if (!remaining) throw new Error('La limite quotidienne d’envoi est atteinte.');
  const store = prospectStore();
  const results = [];
  for (const id of selected) {
    if (!remaining) { results.push({ id, ok: false, error: 'Limite quotidienne atteinte.' }); continue; }
    try {
      const key = `prospects/${id}`;
      const current = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
      const prospect = current?.data;
      if (!prospect) throw new Error('Prospect introuvable.');
      if (prospect.status !== 'ready') throw new Error('Ce prospect n’est pas prêt à être contacté.');
      if (prospect.emailReviewRequired) throw new Error('Valide d’abord l’adresse e-mail détectée.');
      if (!normalizeEmail(prospect.email)) throw new Error('Adresse e-mail manquante ou invalide.');
      if (await isSuppressed(prospect.email)) throw new Error('Cette adresse figure dans la liste de désinscription.');
      const claim = await store.setJSON(`claims/initial/${prospect.id}`, { at: now.toISOString() }, { onlyIfNew: true });
      if (!claim.modified) throw new Error('Un envoi ou une tentative existe déjà pour ce prospect.');
      const locked = await store.setJSON(key, { ...prospect, status: 'sending', updatedAt: now.toISOString() }, { onlyIfMatch: current.etag });
      if (!locked.modified) throw new Error('Le prospect a été modifié entre-temps.');
      const subject = renderProspectTemplate(settings.initialSubject, prospect);
      const body = renderProspectTemplate(settings.initialBody, prospect) + complianceFooter(prospect);
      const sent = await sendGmailMail({ to: prospect.email, subject, body });
      const updated = {
        ...prospect,
        status: 'contacted',
        subject,
        sentAt: now.toISOString(),
        sentMessageId: sent.id || '',
        threadId: sent.threadId || '',
        followupDueAt: new Date(now.getTime() + 7 * DAY).toISOString(),
        followupStage: 0,
        updatedAt: now.toISOString(),
      };
      await store.setJSON(key, updated);
      remaining--;
      results.push({ id, ok: true });
    } catch (error) {
      console.error('prospecting-send', id, error);
      const record = await getProspect(id);
      if (record?.status === 'sending') await store.setJSON(`prospects/${id}`, { ...record, status: 'send_uncertain', lastError: clean(error.message, 500), updatedAt: now.toISOString() });
      results.push({ id, ok: false, error: error.message || 'Envoi impossible.' });
    }
  }
  return { sent: results.filter((item) => item.ok).length, failed: results.filter((item) => !item.ok).length, results, remainingToday: remaining };
}

export function prospectDue(prospect, now = new Date()) {
  if (prospect.status !== 'contacted' || Number(prospect.followupStage) !== 0) return false;
  const due = Date.parse(prospect.followupDueAt || '') || (Date.parse(prospect.sentAt || '') + 7 * DAY);
  return Number.isFinite(due) && due <= now.getTime();
}

async function hasProspectReplied(prospect) {
  const sentAt = Date.parse(prospect.sentAt || '');
  const email = normalizeEmail(prospect.email);
  if (!Number.isFinite(sentAt) || !email) return false;
  if (prospect.threadId) {
    const thread = await gmailFetch(`/threads/${encodeURIComponent(prospect.threadId)}?format=metadata&metadataHeaders=From`);
    const ownIds = new Set([prospect.sentMessageId, prospect.followupMessageId].filter(Boolean));
    const later = (thread.messages || []).filter((message) => Number(message.internalDate) > sentAt && !ownIds.has(message.id));
    if (later.some((message) => normalizeEmail(headerMap(message.payload?.headers).from) === email)) return true;
    if (later.some((message) => (message.labelIds || []).includes('SENT'))) return true;
  }
  const after = new Date(Math.max(0, sentAt - DAY)).toISOString().slice(0, 10).replace(/-/g, '/');
  const list = await gmailFetch(`/messages?maxResults=30&q=${encodeURIComponent(`in:inbox from:${email} after:${after}`)}`);
  for (const message of list.messages || []) {
    const item = await gmailFetch(`/messages/${encodeURIComponent(message.id)}?format=metadata&metadataHeaders=From`);
    if (Number(item.internalDate) > sentAt && normalizeEmail(headerMap(item.payload?.headers).from) === email) return true;
  }
  return false;
}

export async function runProspectFollowups(now = new Date()) {
  await purgeStaleProspects(now);
  const settings = await getProspectingSettings();
  if (!settings.autoFollowup) return { enabled: false, checked: 0, sent: 0, replied: 0 };
  const connection = await getConnection();
  if (!connection?.refreshToken) return { enabled: true, connected: false, checked: 0, sent: 0, replied: 0 };
  if (normalizeEmail(connection.email) !== expectedProspectingSender()) return { enabled: true, connected: false, senderMismatch: true, email: connection.email || '', checked: 0, sent: 0, replied: 0 };
  let remaining = Math.max(0, settings.dailySendLimit - await sentToday(now));
  const allProspects = await listProspects(1000);
  const due = allProspects.filter((prospect) => prospectDue(prospect, now));
  const store = prospectStore();
  let checked = 0;
  let sent = 0;
  let replied = 0;
  let errors = 0;
  for (const prospect of allProspects.filter((item) => item.status === 'followed_up').slice(0, 20)) {
    try {
      if (!await hasProspectReplied(prospect)) continue;
      const key = `prospects/${prospect.id}`;
      const current = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
      if (!current?.data || current.data.status !== 'followed_up') continue;
      const changed = await store.setJSON(key, { ...current.data, status: 'replied', repliedAt: now.toISOString(), updatedAt: now.toISOString() }, { onlyIfMatch: current.etag });
      if (changed.modified) replied++;
    } catch (error) {
      console.error('prospecting-post-followup-reply-check', prospect.id, error);
      errors++;
    }
  }
  for (const prospect of due) {
    if (!remaining || checked >= 20) break;
    checked++;
    try {
      const key = `prospects/${prospect.id}`;
      const current = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
      if (!current?.data || !prospectDue(current.data, now)) continue;
      if (await isSuppressed(current.data.email)) {
        await store.setJSON(key, { ...current.data, status: 'unsubscribed', updatedAt: now.toISOString() }, { onlyIfMatch: current.etag });
        continue;
      }
      if (await hasProspectReplied(current.data)) {
        const changed = await store.setJSON(key, { ...current.data, status: 'replied', repliedAt: now.toISOString(), updatedAt: now.toISOString() }, { onlyIfMatch: current.etag });
        if (changed.modified) replied++;
        continue;
      }
      const claim = await store.setJSON(`claims/followup/${prospect.id}`, { at: now.toISOString() }, { onlyIfNew: true });
      if (!claim.modified) continue;
      let messageIdHeader = '';
      if (current.data.sentMessageId) {
        const previous = await gmailFetch(`/messages/${encodeURIComponent(current.data.sentMessageId)}?format=metadata&metadataHeaders=Message-ID`);
        messageIdHeader = headerMap(previous.payload?.headers)['message-id'] || '';
      }
      const body = renderProspectTemplate(settings.followupBody, current.data) + complianceFooter(current.data);
      const message = await sendGmailMail({
        to: current.data.email,
        subject: current.data.subject || renderProspectTemplate(settings.initialSubject, current.data),
        body,
        threadId: messageIdHeader ? current.data.threadId : undefined,
        inReplyTo: messageIdHeader,
        references: messageIdHeader,
      });
      await store.setJSON(key, {
        ...current.data,
        status: 'followed_up',
        followupStage: 1,
        followupSentAt: now.toISOString(),
        followupMessageId: message.id || '',
        threadId: message.threadId || current.data.threadId,
        updatedAt: now.toISOString(),
      });
      sent++;
      remaining--;
    } catch (error) {
      console.error('prospecting-followup', prospect.id, error);
      errors++;
    }
  }
  return { enabled: true, connected: true, checked, sent, replied, errors, remainingToday: remaining };
}

export async function unsubscribeProspect(id, token, now = new Date()) {
  if (!/^p-[a-f0-9]{32}$/.test(String(id || '')) || !/^[a-f0-9]{48}$/.test(String(token || ''))) return false;
  const store = prospectStore();
  const key = `prospects/${id}`;
  const current = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' }).catch(() => null);
  if (!current?.data || current.data.unsubscribeToken !== token) return false;
  if (normalizeEmail(current.data.email)) {
    await store.setJSON(`suppressions/${emailHash(current.data.email)}`, { optedOutAt: now.toISOString(), source: 'unsubscribe_link' });
  }
  await store.setJSON(key, { ...current.data, status: 'unsubscribed', unsubscribedAt: now.toISOString(), updatedAt: now.toISOString() }, { onlyIfMatch: current.etag });
  return true;
}

export async function purgeStaleProspects(now = new Date()) {
  const store = prospectStore();
  const rows = await listProspects(1000);
  let deleted = 0;
  for (const prospect of rows) {
    const lastInbound = Date.parse(prospect.repliedAt || prospect.collectedAt || '');
    if (!Number.isFinite(lastInbound) || now.getTime() - lastInbound < THREE_YEARS) continue;
    await store.delete(`prospects/${prospect.id}`);
    deleted++;
  }
  return deleted;
}

export function prospectStats(rows) {
  const stats = { total: rows.length, ready: 0, contacted: 0, followedUp: 0, replied: 0, missing: 0, unsubscribed: 0 };
  for (const row of rows) {
    if (row.status === 'ready' || row.status === 'review') stats.ready++;
    if (row.status === 'contacted') stats.contacted++;
    if (row.status === 'followed_up') stats.followedUp++;
    if (row.status === 'replied') stats.replied++;
    if (row.status === 'missing_email') stats.missing++;
    if (row.status === 'unsubscribed') stats.unsubscribed++;
  }
  return stats;
}
