import { randomBytes } from 'node:crypto';
import { getUser } from '@netlify/identity';
import { authStore, assertGmailConfig, disconnectGmail, getConnection, GMAIL_SCOPES } from './_gmail-common.mjs';

const ADMIN_EMAIL = String(process.env.CLEAN_CITE_ADMIN_EMAIL || 'cleannette7@gmail.com').trim().toLowerCase();
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' } });

async function requireAdmin() {
  const u = await getUser();
  if (!u) return { ok:false, response:json(401,{error:'Connexion administrateur requise.'}) };
  if (String(u.email||'').trim().toLowerCase() !== ADMIN_EMAIL) return { ok:false, response:json(403,{error:'Accès administrateur refusé.'}) };
  return { ok:true, user:u };
}

export default async function handler(req) {
  if (req.method !== 'POST') return json(405,{error:'Méthode non autorisée.'});
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json().catch(()=>({}));
    const action = String(body.action||'status');
    const cfg = (()=>{ try { return assertGmailConfig(); } catch(e) { return null; } })();
    if (action === 'status') {
      const conn = await getConnection().catch(()=>null);
      return json(200, {
        configured: !!cfg,
        connected: !!conn?.refreshToken,
        email: conn?.email || '',
        connectedAt: conn?.connectedAt || '',
        missing: cfg ? [] : ['GOOGLE_GMAIL_CLIENT_ID','GOOGLE_GMAIL_CLIENT_SECRET'],
      });
    }
    if (!cfg) return json(400,{error:'Les identifiants OAuth Gmail ne sont pas encore configurés dans Netlify.'});
    if (action === 'start') {
      const state = randomBytes(24).toString('hex');
      await authStore().setJSON(`oauth-state/${state}`, {
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 10*60*1000,
        admin: String(auth.user.email||'').toLowerCase(),
      });
      const q = new URLSearchParams({
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        response_type: 'code',
        scope: GMAIL_SCOPES.join(' '),
        access_type: 'offline',
        include_granted_scopes: 'true',
        prompt: 'consent',
        state,
      });
      if (cfg.allowedEmail) q.set('login_hint', cfg.allowedEmail);
      return json(200,{ authUrl:`https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}` });
    }
    if (action === 'disconnect') {
      await disconnectGmail();
      return json(200,{ok:true});
    }
    return json(400,{error:'Action inconnue.'});
  } catch(e) {
    console.error('gmail-oauth', e);
    return json(500,{error:e.message||'Erreur OAuth Gmail.'});
  }
}
