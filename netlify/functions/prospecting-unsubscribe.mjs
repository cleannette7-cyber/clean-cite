import { unsubscribeProspect } from './_prospecting-core.mjs';

const page = (title, message, status = 200) => new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} | Clean-Cité</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f3f6fa;color:#172033;font-family:Arial,sans-serif}.card{max-width:620px;background:#fff;border:1px solid #dfe5ee;border-radius:24px;padding:34px;box-shadow:0 18px 55px rgba(11,36,71,.13);text-align:center}h1{color:#0B2447}p{line-height:1.65;color:#475467}a{color:#0B2447;font-weight:800}</style></head><body><main class="card"><h1>${title}</h1><p>${message}</p><p><a href="https://clean-cite.org">Retour au site Clean-Cité</a></p></main></body></html>`, {
  status,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default async function handler(request) {
  if (request.method !== 'GET') return page('Lien invalide', 'Cette adresse ne peut pas être utilisée.', 405);
  try {
    const url = new URL(request.url);
    const ok = await unsubscribeProspect(url.searchParams.get('id'), url.searchParams.get('token'));
    return ok
      ? page('Désinscription confirmée', 'Votre opposition a bien été enregistrée. Vous ne recevrez plus d’e-mails de prospection de Clean-Cité.')
      : page('Lien invalide ou expiré', 'Nous n’avons pas pu identifier cette demande. Vous pouvez écrire à cleannette7@gmail.com pour exercer votre droit d’opposition.', 400);
  } catch (error) {
    console.error('prospecting-unsubscribe', error);
    return page('Désinscription indisponible', 'Veuillez écrire à cleannette7@gmail.com afin que nous enregistrions votre opposition.', 500);
  }
}
