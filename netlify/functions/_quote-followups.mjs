import { createHash } from 'node:crypto';
import { extractEmail, getConnection, getSettings, gmailFetch, headerMap, quoteStore, sendGmailMail } from './_gmail-common.mjs';

export const quoteId = (source, value) => `${source}-${createHash('sha256').update(String(value)).digest('hex').slice(0,32)}`;

export async function recordQuote(record) {
  const store = quoteStore();
  const clean = {
    id:record.id, source:record.source, email:extractEmail(record.email).toLowerCase(),
    reference:String(record.reference||'').slice(0,80),
    subject:String(record.subject||'').slice(0,300),
    sentAt:record.sentAt || new Date().toISOString(),
    threadId:record.threadId || '', sentMessageId:record.sentMessageId || '',
    stage:0, status:'pending'
  };
  if (!clean.email || !clean.id || !clean.reference) throw new Error('Devis impossible à suivre.');
  const result = await store.setJSON(`quotes/${clean.id}`,clean,{onlyIfNew:true});
  return !!result.modified;
}

async function listQuotes(limit=100) {
  const store=quoteStore(), {blobs}=await store.list({prefix:'quotes/'});
  const current=await Promise.all(blobs.map(b=>store.get(b.key,{type:'json',consistency:'strong'})));
  return current.filter(Boolean).sort((a,b)=>b.sentAt.localeCompare(a.sentAt)).slice(0,limit);
}

export async function quoteStatusList() { return listQuotes(100); }

export async function setQuotePaused(id,paused) {
  if (!/^(gmail|admin)-[a-f0-9]{32}$/.test(String(id))) throw new Error('Référence de suivi invalide.');
  const store=quoteStore(), key=`quotes/${id}`;
  const current=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
  if (!current?.data) throw new Error('Suivi introuvable.');
  if (current.data.status==='replied' || current.data.stage>=2) return current.data;
  const updated={...current.data,status:paused?'paused':'pending'};
  const result=await store.setJSON(key,updated,{onlyIfMatch:current.etag});
  if (!result.modified) throw new Error('Le suivi a été modifié entre-temps. Recharge la liste.');
  return updated;
}

export function dueStage(quote,now) {
  if (quote.status !== 'pending' || quote.stage >= 2) return 0;
  const sent = Date.parse(quote.sentAt), last = quote.lastFollowupAt ? Date.parse(quote.lastFollowupAt) : sent;
  if (!Number.isFinite(sent) || !Number.isFinite(last)) return 0;
  // Première relance sept jours après envoi, deuxième sept jours après la première.
  return now.getTime() - last >= 7*86400000 ? quote.stage + 1 : 0;
}

async function hasClientReplied(quote) {
  const sent=Date.parse(quote.sentAt), email=quote.email.toLowerCase();
  if (quote.threadId) {
    const thread=await gmailFetch(`/threads/${encodeURIComponent(quote.threadId)}?format=metadata&metadataHeaders=From`);
    const replies=(thread.messages || []).filter(m=>Number(m.internalDate)>sent && ![quote.sentMessageId,quote.lastFollowupId].includes(m.id));
    if (replies.some(m=>extractEmail(headerMap(m.payload?.headers).from).toLowerCase()===email)) return true;
    // L'administrateur a répondu entre-temps : éviter une relance incohérente.
    if (replies.some(m=>(m.labelIds||[]).includes('SENT'))) return true;
  }
  // Couvre également les devis envoyés via Brevo et les réponses sorties du fil Gmail.
  const after=new Date(Math.max(0,sent-86400000)).toISOString().slice(0,10).replace(/-/g,'/');
  const query=`in:inbox from:${email} after:${after}`;
  const list=await gmailFetch(`/messages?maxResults=50&q=${encodeURIComponent(query)}`);
  for (const m of list.messages || []) {
    const item=await gmailFetch(`/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From`);
    if (Number(item.internalDate)>sent && extractEmail(headerMap(item.payload?.headers).from).toLowerCase()===email) return true;
  }
  return false;
}

export async function runFollowups(now=new Date()) {
  const settings=await getSettings();
  if (!settings.autoFollowups) return {enabled:false,checked:0,sent:0,replied:0};
  const connection=await getConnection();
  if (!connection?.refreshToken) return {enabled:true,connected:false,checked:0,sent:0,replied:0};
  const quotes=await listQuotes(500), store=quoteStore();
  let checked=0,sent=0,replied=0,errors=0;
  for (const record of quotes) {
    const stage=dueStage(record,now);
    if (!stage || checked>=15) continue;
    checked++;
    try {
      const key=`quotes/${record.id}`;
      const current=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
      if (!current?.data || dueStage(current.data,now)!==stage) continue;
      if (await hasClientReplied(current.data)) {
        const changed=await store.setJSON(key,{...current.data,status:'replied',updatedAt:now.toISOString()},{onlyIfMatch:current.etag});
        if (changed.modified) replied++;
        continue;
      }
      const claim=await store.setJSON(`claims/${record.id}-${stage}`,{at:now.toISOString()},{onlyIfNew:true});
      if (!claim.modified) continue;
      // Un claim conservé sur erreur évite un envoi double après un timeout réseau.
      const locked=await store.setJSON(key,{...current.data,status:'sending'},{onlyIfMatch:current.etag});
      if (!locked.modified) continue;
      const q=current.data;
      const body=stage===1
        ? `Bonjour,\n\nNous revenons vers vous concernant ${q.reference}, envoyé le ${new Intl.DateTimeFormat('fr-FR').format(new Date(q.sentAt))}. L'avez-vous bien reçu ? Nous restons disponibles pour toute question ou adaptation de la prestation.\n\nCordialement,\nL'équipe Clean-Cité`
        : `Bonjour,\n\nNous faisons un dernier suivi concernant ${q.reference}. Si votre projet est toujours d'actualité, vous pouvez répondre directement à cet e-mail.\n\nCordialement,\nL'équipe Clean-Cité`;
      let replyHeader='';
      const originalId=q.lastFollowupId || q.sentMessageId;
      if (q.threadId && originalId) {
        const previous=await gmailFetch(`/messages/${encodeURIComponent(originalId)}?format=metadata&metadataHeaders=Message-ID`);
        replyHeader=headerMap(previous.payload?.headers)['message-id']||'';
      }
      const sentMessage=await sendGmailMail({to:q.email,subject:q.subject,body,threadId:replyHeader?q.threadId:undefined,inReplyTo:replyHeader});
      await store.setJSON(key,{...q,stage,status:stage===2?'completed':'pending',lastFollowupAt:now.toISOString(),lastFollowupId:sentMessage.id||'',threadId:sentMessage.threadId||q.threadId});
      sent++;
    } catch(e) { console.error('clean-cite-followup',record.id,e); errors++; }
  }
  return {enabled:true,connected:true,checked,sent,replied,errors};
}
