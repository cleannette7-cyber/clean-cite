import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

export const DEFAULT_REDIRECT_URI = 'https://clean-cite.org/.netlify/functions/gmail-oauth-callback';

export function gmailConfig() {
  return {
    clientId: String(process.env.GOOGLE_GMAIL_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.GOOGLE_GMAIL_CLIENT_SECRET || '').trim(),
    redirectUri: String(process.env.GMAIL_OAUTH_REDIRECT_URI || DEFAULT_REDIRECT_URI).trim(),
    allowedEmail: String(process.env.GMAIL_ALLOWED_EMAIL || '').trim().toLowerCase(),
  };
}

export function assertGmailConfig() {
  const c = gmailConfig();
  const missing = [];
  if (!c.clientId) missing.push('GOOGLE_GMAIL_CLIENT_ID');
  if (!c.clientSecret) missing.push('GOOGLE_GMAIL_CLIENT_SECRET');
  if (!c.redirectUri) missing.push('GMAIL_OAUTH_REDIRECT_URI');
  if (missing.length) throw new Error(`Configuration Gmail manquante : ${missing.join(', ')}`);
  return c;
}

function keyFromSecret(secret) {
  return createHash('sha256').update(`clean-cite-gmail-token-v1|${secret}`).digest();
}

export function encryptSecret(value) {
  const { clientSecret } = assertGmailConfig();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(clientSecret), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  };
}

export function decryptSecret(payload) {
  if (!payload?.iv || !payload?.tag || !payload?.data) throw new Error('Jeton Gmail illisible. Reconnecte Gmail.');
  const { clientSecret } = assertGmailConfig();
  const decipher = createDecipheriv('aes-256-gcm', keyFromSecret(clientSecret), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8');
}

export function authStore() {
  return getStore({ name: 'clean-cite-gmail-auth', consistency: 'strong' });
}

export function mailStore() {
  return getStore({ name: 'clean-cite-gmail-mail', consistency: 'strong' });
}

export async function getConnection() {
  return await authStore().get('connection', { type: 'json', consistency: 'strong' });
}

export async function saveConnection({ refreshToken, email, scope }) {
  const existing = await getConnection();
  const encrypted = refreshToken ? encryptSecret(refreshToken) : existing?.refreshToken;
  if (!encrypted) throw new Error('Google n’a pas fourni de jeton de connexion. Recommence la connexion Gmail.');
  const record = {
    refreshToken: encrypted,
    email: String(email || existing?.email || '').trim().toLowerCase(),
    scope: String(scope || existing?.scope || GMAIL_SCOPES.join(' ')),
    connectedAt: existing?.connectedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await authStore().setJSON('connection', record);
  return record;
}

export async function disconnectGmail() {
  await authStore().delete('connection');
}

export async function getAccessToken() {
  const c = assertGmailConfig();
  const conn = await getConnection();
  if (!conn?.refreshToken) throw new Error('Gmail n’est pas connecté.');
  const refreshToken = decryptSecret(conn.refreshToken);
  const body = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) {
    const detail = d.error_description || d.error || 'Impossible de renouveler l’accès Gmail.';
    throw new Error(`${detail} Reconnecte Gmail depuis l’administration.`);
  }
  return { accessToken: d.access_token, connection: conn };
}

export async function gmailFetch(path, options = {}) {
  const { accessToken } = await getAccessToken();
  const url = path.startsWith('http') ? path : `https://gmail.googleapis.com/gmail/v1/users/me${path}`;
  const r = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(d?.error?.message || `Erreur Gmail (${r.status}).`);
  }
  return d;
}

export function b64urlToBuffer(v) {
  let s = String(v || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

export function toB64url(v) {
  return Buffer.from(v).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function headerMap(headers = []) {
  const out = {};
  for (const h of headers || []) out[String(h.name || '').toLowerCase()] = String(h.value || '');
  return out;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractBody(payload) {
  const plain = [];
  const html = [];
  function walk(part) {
    if (!part) return;
    const mime = String(part.mimeType || '').toLowerCase();
    if (part.body?.data) {
      const text = b64urlToBuffer(part.body.data).toString('utf8');
      if (mime === 'text/plain') plain.push(text);
      if (mime === 'text/html') html.push(text);
    }
    for (const child of part.parts || []) walk(child);
  }
  walk(payload);
  const text = plain.join('\n\n').trim() || stripHtml(html.join('\n\n'));
  return String(text || '').slice(0, 16000);
}

export function attachmentMeta(payload) {
  const out = [];
  function walk(part) {
    if (!part) return;
    if (part.filename && part.body?.attachmentId) {
      out.push({
        filename: String(part.filename).slice(0, 220),
        mimeType: String(part.mimeType || '').toLowerCase(),
        attachmentId: String(part.body.attachmentId),
        size: Number(part.body.size) || 0,
      });
    }
    for (const child of part.parts || []) walk(child);
  }
  walk(payload);
  return out;
}

export async function fetchMessage(id) {
  const msg = await gmailFetch(`/messages/${encodeURIComponent(id)}?format=full`);
  const h = headerMap(msg.payload?.headers || []);
  return {
    id: msg.id,
    threadId: msg.threadId,
    labelIds: msg.labelIds || [],
    snippet: msg.snippet || '',
    internalDate: msg.internalDate || '',
    headers: h,
    subject: h.subject || '(Sans objet)',
    from: h.from || '',
    to: h.to || '',
    replyTo: h['reply-to'] || '',
    messageIdHeader: h['message-id'] || '',
    references: h.references || '',
    body: extractBody(msg.payload),
    attachments: attachmentMeta(msg.payload),
    rawPayload: msg.payload,
  };
}

export function extractEmail(v) {
  const s = String(v || '').trim();
  const m = s.match(/<([^>]+)>/);
  const candidate = (m ? m[1] : s).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : '';
}

export async function fetchImageAttachments(message, maxImages = 3, maxTotalBytes = 2_400_000) {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const imgs = [];
  let total = 0;
  for (const a of message.attachments || []) {
    if (imgs.length >= maxImages || !allowed.has(a.mimeType) || a.size > 1_300_000) continue;
    const d = await gmailFetch(`/messages/${encodeURIComponent(message.id)}/attachments/${encodeURIComponent(a.attachmentId)}`);
    const buf = b64urlToBuffer(d.data || '');
    if (!buf.length || total + buf.length > maxTotalBytes) continue;
    total += buf.length;
    imgs.push({ mimeType: a.mimeType, data: buf.toString('base64'), filename: a.filename });
  }
  return imgs;
}

export const DEFAULT_SETTINGS = {
  mode: 'draft',
  autoSimple: false,
  query: 'is:unread in:inbox -from:me newer_than:2d',
  maxPerRun: 3,
};

export async function getSettings() {
  const s = await mailStore().get('settings', { type: 'json', consistency: 'strong' });
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function saveSettings(input = {}) {
  const next = {
    mode: input.mode === 'semi' ? 'semi' : 'draft',
    autoSimple: input.mode === 'semi' && !!input.autoSimple,
    query: String(input.query || DEFAULT_SETTINGS.query).trim().slice(0, 300),
    maxPerRun: Math.max(1, Math.min(5, Number(input.maxPerRun) || 3)),
    updatedAt: new Date().toISOString(),
  };
  await mailStore().setJSON('settings', next);
  return next;
}
