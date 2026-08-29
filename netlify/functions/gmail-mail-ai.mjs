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
- Ne JAMAIS mettre de signature, de formule finale « Cordialement » ni les coordonnées de Clean-Cité dans replyBody : la signature officielle est ajoutée automatiquement au moment de l'envoi.
- Ne jamais inventer une information manquante.
- Ne jamais annoncer un prix ferme à partir de simples informations ou photos : parler d'estimation indicative et demander les éléments manquants.
- Pour un chantier en cours, demander agents, heures/jour et nombre de jours si manquants.
- Pour une fin de chantier au m², demander surface et niveau d'encrassement si manquants.
- Pour les poubelles, demander nombre de bacs et passages/semaine si manquants.
- Pour les parties communes, demander nombre d'étages/halls, fréquence et présence d'un local poubelles si utile.
- Les pièces jointes photo peuvent aider à qualifier l'état visible, mais ne permettent jamais d'inventer la surface, l'accès ou les zones hors champ.
- Une demande de devis peut recevoir automatiquement une réponse si elle se limite à accuser réception, demander les informations manquantes et/ou donner une estimation explicitement INDICATIVE fondée sur la grille ci-dessus, sous réserve de validation et sans remise ni engagement contractuel.
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
  const from = String(message.from||'').toLowerCase();
  const h = message.headers || {};

  // Évite les boucles automatiques, newsletters et robots.
  if (/(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notification)/i.test(from)) return false;
  if (String(h['auto-submitted']||'').toLowerCase() && String(h['auto-submitted']).toLowerCase() !== 'no') return false;
  if (/(bulk|list|junk)/i.test(String(h.precedence||'')) || h['list-id']) return false;

  // Ces sujets restent toujours sous validation humaine.
  const riskyOriginal = /(facture|avoir|remise|geste commercial|réclamation|plainte|litige|paiement|impay|dommage|accident|contrat|annul|juridique|avocat|mise en demeure|responsabilit|sinistre)/i.test(original);
  if (riskyOriginal) return false;

  const category = String(ai.category||'');
  const safeCategory = ['information_simple','accuse_reception','devis'].includes(category);
  if (!safeCategory || ai.autoSuggested !== true) return false;
  if (!['low','medium'].includes(String(ai.risk||''))) return false;

  // Une demande de devis peut être automatique, mais jamais avec un engagement ferme.
  const forbiddenReply = /(prix ferme|tarif définitif|devis définitif|nous vous accordons|remise de|avoir de|engagement ferme|commande confirmée|contrat accepté|responsabilité reconnue)/i.test(reply);
  if (forbiddenReply) return false;

  // Si un montant est donné automatiquement, il doit être explicitement présenté comme indicatif.
  const hasAmount = /(?:\d[\d\s.,]*\s?(?:€|euros?)|€\s?\d)/i.test(reply);
  if (hasAmount && !/(indicatif|indicative|estimation|pré-estimation|à titre indicatif|sous réserve)/i.test(reply)) return false;

  return true;
}

async function generateAiDraft(message) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY n’est pas configurée dans Netlify.');
  const images = await fetchImageAttachments(message).catch(()=>[]);
  const prompt = `Analyse cet e-mail reçu et prépare une réponse Clean-Cité.\n\nEXPÉDITEUR : ${message.from}\nOBJET : ${message.subject}\nMESSAGE :\n${message.body || message.snippet || '(message vide)'}\n\nRéponds uniquement avec un JSON valide :\n{\n  "category":"information_simple|accuse_reception|devis|facture|reclamation|paiement|autre",\n  "risk":"low|medium|high",\n  "autoSuggested":true|false,\n  "reason":"raison courte",\n  "replySubject":"objet de réponse",\n  "replyBody":"corps de la réponse sans signature excessive",\n  "missingInfo":["..."],\n  "photoNotes":"observation éventuelle des photos jointes, sinon chaîne vide"\n}\n\nUne réponse automatique peut être suggérée pour : (1) une information générale simple, (2) un accusé de réception, ou (3) une demande de devis lorsque la réponse reste indicative, demande les précisions utiles et ne comporte aucun engagement ferme. Les factures, paiements, réclamations, remises, avoirs, litiges et modifications contractuelles restent toujours manuels. Ne mets AUCUNE signature dans replyBody.`;
  const parts = [{text:prompt}];
  for (const img of images) parts.push({inlineData:{mimeType:img.mimeType,data:img.data}});
  const responseJsonSchema = {
    type:'object',
    additionalProperties:false,
    required:['category','risk','autoSuggested','reason','replySubject','replyBody','missingInfo','photoNotes'],
    properties:{
      category:{type:'string',enum:['information_simple','accuse_reception','devis','facture','reclamation','paiement','autre']},
      risk:{type:'string',enum:['low','medium','high']},
      autoSuggested:{type:'boolean'},
      reason:{type:'string'},
      replySubject:{type:'string'},
      replyBody:{type:'string'},
      missingInfo:{type:'array',items:{type:'string'}},
      photoNotes:{type:'string'}
    }
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      systemInstruction:{parts:[{text:COMPANY_CONTEXT}]},
      contents:[{role:'user',parts}],
      generationConfig:{
        temperature:0.15,
        maxOutputTokens:2400,
        responseMimeType:'application/json',
        responseJsonSchema,
        thinkingConfig:{thinkingBudget:0}
      }
    })
  });
  const d = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(d?.error?.message || 'Erreur Gemini.');
  const candidate = d?.candidates?.[0] || null;
  const text = candidate?.content?.parts?.filter(p=>typeof p?.text==='string').map(p=>p.text).join('').trim() || '';
  let ai = safeJsonParse(text);

  // Secours : si Gemini renvoie du texte JSON incomplet ou aucun texte final,
  // on fait une seconde tentative très courte, sans réflexion, en texte brut.
  if (!ai?.replyBody) {
    const finish = candidate?.finishReason || '';
    const block = d?.promptFeedback?.blockReason || '';
    const fallbackPrompt = `Rédige uniquement la réponse e-mail que Clean-Cité doit envoyer au client, en français, sans JSON et sans commentaire.\n\nExpéditeur : ${message.from}\nObjet : ${message.subject}\nMessage :\n${message.body || message.snippet || '(message vide)'}\n\nSi des informations manquent pour chiffrer précisément, pose les questions nécessaires. Ne donne pas de prix ferme. N'ajoute aucune signature ni formule « Cordialement » à la fin.`;
    const fr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:COMPANY_CONTEXT}]},
        contents:[{role:'user',parts:[{text:fallbackPrompt}]}],
        generationConfig:{temperature:0.2,maxOutputTokens:1200,thinkingConfig:{thinkingBudget:0}}
      })
    });
    const fd = await fr.json().catch(()=>({}));
    if (fr.ok) {
      const ftext = fd?.candidates?.[0]?.content?.parts?.filter(p=>typeof p?.text==='string').map(p=>p.text).join('').trim() || '';
      if (ftext) {
        const risky = /(devis|prix|tarif|€|euro|facture|paiement|réclamation|plainte|litige|remise|avoir)/i.test(`${message.subject}\n${message.body}`);
        ai = {
          category: risky ? 'devis' : 'autre',
          risk: risky ? 'medium' : 'low',
          autoSuggested: risky ? false : true,
          reason:`Brouillon généré en mode de secours${finish?` (première génération : ${finish})`:''}${block?` (blocage : ${block})`:''}.`,
          replySubject:`Re: ${cleanSubject(message.subject)}`,
          replyBody:ftext,
          missingInfo:[],
          photoNotes:''
        };
      }
    }
  }

  if (!ai?.replyBody) {
    const finish = candidate?.finishReason || 'INCONNU';
    const block = d?.promptFeedback?.blockReason || '';
    const detail = block ? ` Blocage : ${block}.` : '';
    throw new Error(`Gemini n’a pas produit de réponse exploitable (fin : ${finish}).${detail}`);
  }
  ai.category = String(ai.category||'autre');
  ai.risk = ['low','medium','high'].includes(ai.risk) ? ai.risk : 'medium';
  ai.replySubject = String(ai.replySubject || `Re: ${cleanSubject(message.subject)}`).slice(0,300);
  ai.replyBody = stripGeneratedSignature(String(ai.replyBody||'')).slice(0,8000);
  ai.missingInfo = Array.isArray(ai.missingInfo) ? ai.missingInfo.slice(0,5).map(String) : [];
  ai.photoNotes = String(ai.photoNotes||'').slice(0,1500);
  ai.autoEligible = serverAutoGuard(message, ai);
  ai.imagesAnalyzed = images.length;
  return ai;
}

function stripGeneratedSignature(value) {
  let text = String(value||'').replace(/\r\n/g,'\n').trim();
  // Gemini n'est pas censé signer, mais on nettoie défensivement les signatures
  // générées afin qu'une seule signature officielle soit ajoutée par le serveur.
  text = text.replace(/\n{1,3}(?:(?:bien\s+)?cordialement|sinc[eè]res?\s+salutations|respectueusement|bonne\s+journ[eé]e)[,\s]*\n[\s\S]{0,700}$/i, '').trim();
  text = text.replace(/\n{1,3}(?:l[’']?[ée]quipe\s+)?clean[-–— ]?cit[ée][\s\S]{0,500}$/i, '').trim();
  return text;
}

function encodeMimeHeader(value) {
  const clean = String(value||'').replace(/[\r\n]+/g,' ').trim();
  if (!clean) return '';
  // RFC 2047 : évite « Clean-CitÃ© » dans Gmail et protège tous les accents.
  return `=?UTF-8?B?${Buffer.from(clean,'utf8').toString('base64')}?=`;
}

function replyRaw(message, body, subject, senderEmail) {
  const to = extractEmail(message.replyTo) || extractEmail(message.from);
  if (!to) throw new Error('Adresse de réponse du client introuvable.');
  if (!String(body||'').trim()) throw new Error('Réponse vide.');
  const subj = String(subject||`Re: ${cleanSubject(message.subject)}`).replace(/[\r\n]/g,' ').slice(0,300);
  const refs = [message.references, message.messageIdHeader].filter(Boolean).join(' ').replace(/[\r\n]/g,' ');
  const msgId = String(message.messageIdHeader||'').replace(/[\r\n]/g,' ');
  const text = stripGeneratedSignature(body);
  const headers = [
    `From: ${encodeMimeHeader('Clean-Cité')} <${senderEmail}>`,
    `To: ${to}`,
    `Subject: ${encodeMimeHeader(subj)}`,
    ...(msgId ? [`In-Reply-To: ${msgId}`] : []),
    ...(refs ? [`References: ${refs}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    'Cordialement,',
    `L’équipe Clean-Cité`,
    '07 66 53 61 54',
    '149 rue de Paris, 93000 Bobigny',
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
