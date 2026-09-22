import { getUser } from '@netlify/identity';
import { getConnection } from './_gmail-common.mjs';
import {
  PROSPECT_CATEGORIES,
  getProspectingJob,
  getProspect,
  getProspectingSettings,
  expectedProspectingSender,
  listProspects,
  prospectStats,
  runProspectFollowups,
  queueProspectingJob,
  saveProspectingSettings,
  sendInitialProspects,
  unsubscribeProspect,
  updateProspect,
} from './_prospecting-core.mjs';

const ADMIN_EMAIL = String(process.env.CLEAN_CITE_ADMIN_EMAIL || 'cleannette7@gmail.com').trim().toLowerCase();
const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

async function requireAdmin() {
  const user = await getUser();
  if (!user) return { ok: false, response: json(401, { error: 'Connexion administrateur requise.' }) };
  if (String(user.email || '').trim().toLowerCase() !== ADMIN_EMAIL) return { ok: false, response: json(403, { error: 'Accès administrateur refusé.' }) };
  return { ok: true, user };
}

export default async function handler(request) {
  if (request.method !== 'POST') return json(405, { error: 'Méthode non autorisée.' });
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'status');

    if (action === 'status') {
      const [settings, prospects, gmail] = await Promise.all([
        getProspectingSettings(),
        listProspects(),
        getConnection().catch(() => null),
      ]);
      const expectedSender = expectedProspectingSender();
      const gmailMatches = !!gmail?.refreshToken && String(gmail?.email || '').trim().toLowerCase() === expectedSender;
      return json(200, {
        settings,
        categories: Object.entries(PROSPECT_CATEGORIES).map(([key, value]) => ({ key, label: value.label, keyword: value.keyword })),
        stats: prospectStats(prospects),
        gmailConnected: gmailMatches,
        gmailAccountConnected: !!gmail?.refreshToken,
        gmailEmail: gmail?.email || '',
        expectedSender,
        placesConfigured: !!String(process.env.GOOGLE_PLACES_API_KEY || '').trim(),
      });
    }
    if (action === 'list') {
      const prospects = await listProspects();
      return json(200, { prospects, stats: prospectStats(prospects) });
    }
    if (action === 'search_prepare') return json(200, { job: await queueProspectingJob(body) });
    if (action === 'job_status') {
      const job = await getProspectingJob(String(body.jobId || ''));
      if (!job) return json(404, { error: 'Recherche introuvable.' });
      const { runToken, ...safeJob } = job;
      return json(200, { job: safeJob });
    }
    if (action === 'settings_save') {
      return json(200, { settings: await saveProspectingSettings(body.settings || {}) });
    }
    if (action === 'update') {
      return json(200, { prospect: await updateProspect(body.prospect || {}) });
    }
    if (action === 'send') {
      return json(200, { result: await sendInitialProspects(body.ids) });
    }
    if (action === 'followups_run') {
      return json(200, { result: await runProspectFollowups() });
    }
    if (action === 'unsubscribe') {
      const prospect = await getProspect(String(body.id || ''));
      if (!prospect) return json(404, { error: 'Prospect introuvable.' });
      const ok = await unsubscribeProspect(prospect.id, prospect.unsubscribeToken);
      return json(ok ? 200 : 400, ok ? { ok: true } : { error: 'Désinscription impossible.' });
    }
    return json(400, { error: 'Action inconnue.' });
  } catch (error) {
    console.error('prospecting-api', error);
    return json(500, { error: error.message || 'Erreur du module de prospection.' });
  }
}
