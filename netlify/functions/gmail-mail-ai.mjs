import { getUser } from '@netlify/identity';
import {
  fetchImageAttachments,
  fetchMessage,
  getConnection,
  getSettings,
  gmailFetch,
  headerMap,
  mailStore,
  saveSettings,
  toB64url,
  extractEmail,
} from './_gmail-common.mjs';

const ADMIN_EMAIL = String(process.env.CLEAN_CITE_ADMIN_EMAIL || 'cleannette7@gmail.com').trim().toLowerCase();
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const json = (status, data) => new Response(JSON.stringify(data), { status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'} });

const COMPANY_CONTEXT = `
Tu es l'assistant e-mail professionnel de Clean-Cité, entreprise de nettoyage professionnel basée à Bobigny (93), intervenant en Île-de-France.
Coordonnées : Clean-Cité, 149 rue de Paris, 93000 Bobigny, 07 66 53 61 54.

Grille tarifaire indicative actuelle :
- Bureaux ponctuels : dès 1,50 €/m². Minimum ponctuel : 150 €.
- Bureaux réguliers : dès 1 €/m² PAR PASSAGE, sans appliquer automatiquement le minimum ponctuel.
- Chantier en cours : 28 € HT/heure PAR AGENT. Journée type 7 h = 196 € HT par agent. Calcul : agents × heures/jour × jours × 28 €.
- Fin de chantier : léger 4,50 €/m² ; standard 6 €/m² ; très sale 9 €/m².
- Remise en état : dès 6,50 €/m² ; très encrassée dès 8,50 €/m².
- Vitrerie accessible : dès 4 €/m² ; très sale/première intervention dès 6,50 €/m² ; hauteur/nacelle sur devis.
- Terrasse : dès 4,90 €/m² ; très encrassée dès 6,50 €/m².
- Parties communes : dès 199 €/mois, à préciser selon immeuble et fréquence.
- Poubelles : Starter 79 €/mois (jusqu'à 4 bacs, 1 passage/semaine) ; Confort 159 €/mois (jusqu'à 10 bacs, 2 passages/semaine) ; Premium dès 249 €/mois (jusqu'à 15 bacs, 3 passages/semaine).

Règles absolues :
- Répondre en français, ton professionnel, humain, cordial, bref et clair.
- Ne jamais inventer une information manquante.
- Ne jamais annoncer un prix ferme à partir de simples informations ou photos : parler d'estimation indicative et demander les éléments manquants.
- Pour un chantier en cours, demander agents, heures/jour et nombre de jours si manquants.
- Pour une fin de chantier au m², demander surface et niveau d'encrassement si manquants.
- Pour les poubelles, demander nombre de bacs et passages/semaine si manquants.
- Pour les parties communes, demander nombre d'étages/halls, fréquence et présence d'un local poubelles si utile.
- Les pièces jointes photo peuvent aider à qualifier l'état visible, mais ne permettent jamais d'inventer la surface, l'accès ou les zones hors champ.
- Ne pas envoyer de geste commercial, remise, avoir, modification de facture ou engagement contractuel sans validation humaine.
- En cas de réclamation, litige, facture, paiement, demande de remise, dommage, urgence sensible ou demande juridique : classer comme validation humaine obligatoire.
`;

async function requireAdmin() {
  const u = await getUser();
  if (!u) return { ok:false, response:json(401,{error:'Connexion administrateur requise.'}) };
  if (String(u.email||'').trim().toLowerCase() !== ADMIN_EMAIL) return { ok:false, response:json(403,{error:'Accès administrateur refusé.'}) };
  return { ok:true, user:u };
}

function parseFromName(v) {
  const s = String(v||'').trim();
  const m = s.match(/^\s*"?([^"<]+?)"?\s*</);
  return (m ? m[1] : s.split('@')[0]).trim().slice(0,120);
}

function cleanSubject(s) {
  return String(s||'').replace(/^(re|fw|fwd)\s*:\s*/i,'').trim().slice(0,300);
}

async function listMessages(q, maxResults=20) {
  const query = String(q || 'in:inbox -from:me newer_than:30d').slice(0,500);
  const list = await gmailFetch(`/messages?maxResults=${Math.max(1,Math.min(30,Number(maxResults)||20))}&q=${encodeURIComponent(query)}`);
  const ids = (list.messages || []).slice(0,30);
  const store = mailStore();
  const items = await Promise.all(ids.map(async ({id,threadId}) => {
    try {
      const m = await gmailFetch(`/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-ID`);
      const h = headerMap(m.payload?.headers || []);
      const processed = await store.get(`processed/${id}`,{type:'json'}).catch(()=>null);
      return {
        id, threadId: threadId || m.threadId,
        from:h.from||'', subject:h.subject||'(Sans objet)', date:h.date||'',
        snippet:m.snippet||'', unread:(m.labelIds||[]).includes('UNREAD'),
        processed:!!processed, processedAt:processed?.sentAt||'', processedMode:processed?.mode||''
      };
    } catch { return null; }
  }));
  return items.filter(Boolean);
}

function safeJsonParse(text) {
  const raw = String(text||'').trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim();
  try { return JSON.parse(raw); } catch {}
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  if (a>=0 && b>a) { try { return JSON.parse(raw.slice(a,b+1)); } catch {} }
  return null;
}

function serverAutoGuard(message, ai) {
  const original = `${message.subject}\n${message.body}`;
  const reply = String(ai.replyBody||'');
  const riskyOriginal = /(devis|facture|avoir|remise|geste commercial|réclamation|plainte|litige|paiement|impay|dommage|accident|contrat|annul|juridique|avocat|mise en demeure|prix|tarif|€|euro|urgent)/i.test(original);
  const riskyReply = /(€|euro|remise|avoir|facture rectificative|prix ferme|tarif définitif|nous vous accordons|indemn|responsabilit)/i.test(reply);
  const safeCat = ['information_simple','accuse_reception'].includes(String(ai.category||''));
  return safeCat && ai.risk === 'low' && ai.autoSuggested === true && !riskyOriginal && !riskyReply;
}

async function generateAiDraft(message) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY n’est pas configurée dans Netlify.');
  const images = await fetchImageAttachments(message).catch(()=>[]);
  const prompt = `Analyse cet e-mail reçu et prépare une réponse Clean-Cité.\n\nEXPÉDITEUR : ${message.from}\nOBJET : ${message.subject}\nMESSAGE :\n${message.body || message.snippet || '(message vide)'}\n\nRéponds uniquement avec un JSON valide :\n{\n  "category":"information_simple|accuse_reception|devis|facture|reclamation|paiement|autre",\n  "risk":"low|medium|high",\n  "autoSuggested":true|false,\n  "reason":"raison courte",\n  "replySubject":"objet de réponse",\n  "replyBody":"corps de la réponse sans signature excessive",\n  "missingInfo":["..."],\n  "photoNotes":"observation éventuelle des photos jointes, sinon chaîne vide"\n}\n\nUne réponse automatique ne doit être suggérée QUE pour une information générale simple ou un accusé de réception sans prix, engagement, facture, paiement, réclamation, remise ni modification contractuelle.`;
  const parts = [{text:prompt}];
  for (const img of images) parts.push({inlineData:{mimeType:img.mimeType,data:img.data}});
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      systemInstruction:{parts:[{text:COMPANY_CONTEXT}]},
      contents:[{role:'user',parts}],
      generationConfig:{temperature:0.15,maxOutputTokens:1200,responseMimeType:'application/json'}
    })
  });
  const d = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(d?.error?.message || 'Erreur Gemini.');
  const text = d?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || '';
  const ai = safeJsonParse(text);
  if (!ai?.replyBody) throw new Error('Gemini n’a pas produit de réponse exploitable.');
  ai.category = String(ai.category||'autre');
  ai.risk = ['low','medium','high'].includes(ai.risk) ? ai.risk : 'medium';
  ai.replySubject = String(ai.replySubject || `Re: ${cleanSubject(message.subject)}`).slice(0,300);
  ai.replyBody = String(ai.replyBody||'').slice(0,8000);
  ai.missingInfo = Array.isArray(ai.missingInfo) ? ai.missingInfo.slice(0,5).map(String) : [];
  ai.photoNotes = String(ai.photoNotes||'').slice(0,1500);
  ai.autoEligible = serverAutoGuard(message, ai);
  ai.imagesAnalyzed = images.length;
  return ai;
}

function replyRaw(message, body, subject, senderEmail) {
  const to = extractEmail(message.replyTo) || extractEmail(message.from);
  if (!to) throw new Error('Adresse de réponse du client introuvable.');
  if (!String(body||'').trim()) throw new Error('Réponse vide.');
  const subj = String(subject||`Re: ${cleanSubject(message.subject)}`).replace(/[\r\n]/g,' ').slice(0,300);
  const refs = [message.references, message.messageIdHeader].filter(Boolean).join(' ').replace(/[\r\n]/g,' ');
  const msgId = String(message.messageIdHeader||'').replace(/[\r\n]/g,' ');
  const text = String(body).replace(/\r\n/g,'\n').trim();
  const headers = [
    `From: Clean-Cité <${senderEmail}>`,
    `To: ${to}`,
    `Subject: ${subj}`,
    ...(msgId ? [`In-Reply-To: ${msgId}`] : []),
    ...(refs ? [`References: ${refs}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    'Cordialement,',
    'Clean-Cité',
    '07 66 53 61 54',
  ].join('\r\n');
  return { raw:toB64url(headers), to };
}

async function sendReply(message, body, subject, mode='manual') {
  const conn = await getConnection();
  if (!conn?.email) throw new Error('Gmail n’est pas connecté.');
  const built = replyRaw(message, body, subject, conn.email);
  const sent = await gmailFetch('/messages/send',{method:'POST',body:JSON.stringify({raw:built.raw,threadId:message.threadId})});
  await mailStore().setJSON(`processed/${message.id}`,{
    sentAt:new Date().toISOString(), mode, sentMessageId:sent.id||'', to:built.to, subject:String(subject||''),
  });
  return sent;
}

async function autoProcessInternal() {
  const settings = await getSettings();
  if (!(settings.mode === 'semi' && settings.autoSimple)) return {enabled:false,checked:0,sent:0,skipped:0};
  const conn = await getConnection();
  if (!conn?.refreshToken) return {enabled:true,connected:false,checked:0,sent:0,skipped:0};
  const list = await listMessages(settings.query, settings.maxPerRun);
  let checked=0,sent=0,skipped=0;
  for (const item of list) {
    if (checked >= settings.maxPerRun) break;
    if (item.processed) { skipped++; continue; }
    checked++;
    try {
      const message = await fetchMessage(item.id);
      const ai = await generateAiDraft(message);
      await mailStore().setJSON(`drafts/${item.id}`,{...ai,generatedAt:new Date().toISOString()});
      if (ai.autoEligible) {
        await sendReply(message, ai.replyBody, ai.replySubject, 'semi-auto');
        sent++;
      } else skipped++;
    } catch(e) {
      console.error('gmail-auto-item',item.id,e);
      skipped++;
    }
  }
  const result={enabled:true,connected:true,checked,sent,skipped,ranAt:new Date().toISOString()};
  await mailStore().setJSON('last-auto-run',result);
  return result;
}

export async function autoProcess() { return autoProcessInternal(); }

export default async function handler(req) {
  if (req.method !== 'POST') return json(405,{error:'Méthode non autorisée.'});
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json().catch(()=>({}));
    const action = String(body.action||'status');
    const conn = await getConnection().catch(()=>null);
    if (!conn?.refreshToken && !['status','settings_get','settings_save'].includes(action)) return json(400,{error:'Gmail n’est pas encore connecté.'});

    if (action === 'status') {
      const settings=await getSettings();
      const lastAuto=await mailStore().get('last-auto-run',{type:'json'}).catch(()=>null);
      return json(200,{connected:!!conn?.refreshToken,email:conn?.email||'',settings,lastAuto});
    }
    if (action === 'settings_get') return json(200,{settings:await getSettings()});
    if (action === 'settings_save') return json(200,{settings:await saveSettings(body.settings||{})});
    if (action === 'list') return json(200,{messages:await listMessages(body.query,body.maxResults||20)});
    if (action === 'get') return json(200,{message:await fetchMessage(String(body.messageId||''))});
    if (action === 'draft') {
      const message=await fetchMessage(String(body.messageId||''));
      const draft=await generateAiDraft(message);
      await mailStore().setJSON(`drafts/${message.id}`,{...draft,generatedAt:new Date().toISOString()});
      return json(200,{message,draft});
    }
    if (action === 'send') {
      const message=await fetchMessage(String(body.messageId||''));
      const sent=await sendReply(message,String(body.replyBody||''),String(body.replySubject||''),'manual');
      return json(200,{ok:true,sentId:sent.id||''});
    }
    if (action === 'auto_run') return json(200,{result:await autoProcessInternal()});
    return json(400,{error:'Action inconnue.'});
  } catch(e) {
    console.error('gmail-mail-ai',e);
    return json(500,{error:e.message||'Erreur Mail IA.'});
  }
}
