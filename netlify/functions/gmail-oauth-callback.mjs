import { authStore, assertGmailConfig, gmailFetch, getConnection, saveConnection } from './_gmail-common.mjs';

function html(status, title, text, redirect=true) {
  const safe = String(text||'').replace(/[<>&]/g, m=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[m]));
  return new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><body style="font-family:Arial;background:#eef3f8;padding:40px;color:#0B2447"><div style="max-width:620px;margin:auto;background:white;padding:30px;border-radius:18px"><h1>${title}</h1><p>${safe}</p><a href="/admin/mail-ia.html">Retour au Mail IA</a></div>${redirect?'<script>setTimeout(()=>location.href="/admin/mail-ia.html?gmail=connected",1600)</script>':''}</body></html>`, { status, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'} });
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    const oauthError = url.searchParams.get('error') || '';
    if (oauthError) return html(400,'Connexion Gmail annulée',oauthError,false);
    if (!code || !state) return html(400,'Connexion Gmail impossible','Code ou état OAuth manquant.',false);

    const store = authStore();
    const stateKey = `oauth-state/${state}`;
    const saved = await store.get(stateKey,{type:'json',consistency:'strong'});
    await store.delete(stateKey).catch(()=>{});
    if (!saved || Number(saved.expiresAt||0) < Date.now()) return html(400,'Connexion Gmail expirée','Relance la connexion depuis le tableau de bord.',false);

    const cfg = assertGmailConfig();
    const tokenBody = new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: cfg.redirectUri,
    });
    const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tokenBody});
    const tokens = await r.json().catch(()=>({}));
    if (!r.ok || !tokens.access_token) throw new Error(tokens.error_description||tokens.error||'Échange du code Google impossible.');

    const profileResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile',{headers:{Authorization:`Bearer ${tokens.access_token}`}});
    const profile = await profileResp.json().catch(()=>({}));
    if (!profileResp.ok || !profile.emailAddress) throw new Error(profile?.error?.message||'Impossible de lire le profil Gmail.');
    const email = String(profile.emailAddress).trim().toLowerCase();
    if (cfg.allowedEmail && email !== cfg.allowedEmail) throw new Error(`Ce compte Gmail (${email}) n’est pas celui autorisé (${cfg.allowedEmail}).`);

    const existing = await getConnection().catch(()=>null);
    const refresh = tokens.refresh_token || (existing?.refreshToken ? null : '');
    await saveConnection({ refreshToken: refresh, email, scope: tokens.scope });
    return html(200,'Gmail connecté',`La boîte ${email} est maintenant reliée à Clean-Cité.`);
  } catch(e) {
    console.error('gmail-oauth-callback',e);
    return html(500,'Erreur de connexion Gmail',e.message||'Erreur inconnue.',false);
  }
}
