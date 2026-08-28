const ADMIN_EMAIL = (process.env.CLEAN_CITE_ADMIN_EMAIL || "cleannette7@gmail.com").toLowerCase();
const COMPANY_EMAIL = process.env.CLEAN_CITE_EMAIL || "cleannette7@gmail.com";
const COMPANY_PHONE = "07 66 53 61 54";

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}
function escapeHtml(v){return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function euro(n){return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(Number(n)||0);}
function frDate(v){if(!v)return "";const d=new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString("fr-FR");}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());}
function cleanText(v,max=3000){return String(v||"").trim().slice(0,max);}
function authUser(event){const u=event.clientContext && event.clientContext.user;return u && u.email ? String(u.email).trim().toLowerCase() : "";}

function validate(payload){
  if(!payload || typeof payload!=="object") return "Données de devis invalides.";
  if(!cleanText(payload.quoteNumber,80)) return "Numéro de devis manquant.";
  if(!payload.client || !cleanText(payload.client.name,200)) return "Nom du client manquant.";
  if(!validEmail(payload.client.email)) return "E-mail client invalide.";
  if(!Array.isArray(payload.lines) || !payload.lines.length || payload.lines.length>25) return "Le devis doit contenir entre 1 et 25 lignes.";
  for(const l of payload.lines){if(!cleanText(l.description,500) || !(Number(l.quantity)>0) || Number(l.unitPrice)<0) return "Une ligne du devis est invalide.";}
  return "";
}

function normalize(payload){
  const lines=payload.lines.slice(0,25).map(l=>({description:cleanText(l.description,500),quantity:Number(l.quantity)||0,unit:cleanText(l.unit,60),unitPrice:Number(l.unitPrice)||0,total:(Number(l.quantity)||0)*(Number(l.unitPrice)||0)}));
  const subtotal=lines.reduce((s,l)=>s+l.total,0);
  const discPct=Math.min(100,Math.max(0,Number(payload.totals?.discPct)||0));
  const discount=subtotal*discPct/100;
  const ht=subtotal-discount;
  const vatRate=Math.min(100,Math.max(0,Number(payload.totals?.vatRate)||0));
  const vat=ht*vatRate/100;
  const ttc=ht+vat;
  const depPct=Math.min(100,Math.max(0,Number(payload.totals?.depPct)||0));
  return {
    quoteNumber:cleanText(payload.quoteNumber,80),quoteDate:cleanText(payload.quoteDate,20),validUntil:cleanText(payload.validUntil,20),
    client:{name:cleanText(payload.client.name,200),email:cleanText(payload.client.email,254),phone:cleanText(payload.client.phone,80),city:cleanText(payload.client.city,160),address:cleanText(payload.client.address,300)},
    lines,totals:{subtotal,discPct,discount,ht,vatRate,vat,ttc,depPct,deposit:ttc*depPct/100},notes:cleanText(payload.notes,5000),paymentTerms:cleanText(payload.paymentTerms,5000)
  };
}

function formatQuote(p){
  const rows=p.lines.map(l=>`<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(l.description)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${escapeHtml(l.quantity)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(l.unit)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${euro(l.unitPrice)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700">${euro(l.total)}</td></tr>`).join("");
  const textLines=p.lines.map(l=>`- ${l.description} : ${l.quantity} ${l.unit} × ${euro(l.unitPrice)} = ${euro(l.total)}`).join("\n");
  const subject=`Devis Clean-Cité ${p.quoteNumber} — ${p.client.name}`;
  const text=`Bonjour ${p.client.name},\n\nVeuillez trouver ci-dessous votre devis Clean-Cité n° ${p.quoteNumber}.\nDate : ${frDate(p.quoteDate)}\nValable jusqu'au : ${frDate(p.validUntil)}\n\n${textLines}\n\nSous-total HT : ${euro(p.totals.subtotal)}\nRemise : -${euro(p.totals.discount)}\nTotal HT : ${euro(p.totals.ht)}\nTVA ${p.totals.vatRate}% : ${euro(p.totals.vat)}\nTOTAL TTC : ${euro(p.totals.ttc)}${p.totals.depPct?`\nAcompte demandé (${p.totals.depPct}%) : ${euro(p.totals.deposit)}`:""}\n\nObservations : ${p.notes||"Aucune observation particulière."}\n\nConditions : ${p.paymentTerms||"Selon accord avec Clean-Cité."}\n\nPour accepter ou demander une modification, vous pouvez répondre directement à cet e-mail ou contacter Clean-Cité au ${COMPANY_PHONE}.\n\nCordialement,\nClean-Cité\n149 rue de Paris, 93000 Bobigny\nSIRET 989 248 554 00010`;
  const html=`<div style="font-family:Arial,sans-serif;max-width:780px;margin:auto;color:#172033;line-height:1.55"><div style="background:#0B2447;color:white;padding:22px;border-radius:16px 16px 0 0"><div style="font-size:12px;letter-spacing:.1em;color:#e8c780;font-weight:800">CLEAN-CITÉ</div><h1 style="margin:5px 0 2px;font-size:28px">Devis ${escapeHtml(p.quoteNumber)}</h1><div style="color:#dce5ef">Nettoyage professionnel · Bobigny & Île-de-France</div></div><div style="border:1px solid #dfe5ee;border-top:0;padding:24px;border-radius:0 0 16px 16px"><p>Bonjour <strong>${escapeHtml(p.client.name)}</strong>,</p><p>Voici votre devis Clean-Cité établi selon les informations communiquées.</p><table style="width:100%;border-collapse:collapse;margin:18px 0"><tr><td><strong>Date</strong><br>${frDate(p.quoteDate)}</td><td><strong>Valable jusqu'au</strong><br>${frDate(p.validUntil)}</td><td><strong>Lieu</strong><br>${escapeHtml(p.client.address||p.client.city||"À confirmer")}</td></tr></table><table style="width:100%;border-collapse:collapse;margin-top:18px"><thead><tr style="background:#0B2447;color:white"><th style="padding:10px;text-align:left">Désignation</th><th style="padding:10px;text-align:right">Qté</th><th style="padding:10px;text-align:left">Unité</th><th style="padding:10px;text-align:right">PU HT</th><th style="padding:10px;text-align:right">Total HT</th></tr></thead><tbody>${rows}</tbody></table><div style="margin:18px 0 0 auto;max-width:380px"><div style="display:flex;justify-content:space-between;padding:7px"><span>Sous-total HT</span><strong>${euro(p.totals.subtotal)}</strong></div><div style="display:flex;justify-content:space-between;padding:7px"><span>Remise</span><strong>-${euro(p.totals.discount)}</strong></div><div style="display:flex;justify-content:space-between;padding:7px"><span>Total HT</span><strong>${euro(p.totals.ht)}</strong></div><div style="display:flex;justify-content:space-between;padding:7px"><span>TVA ${escapeHtml(p.totals.vatRate)} %</span><strong>${euro(p.totals.vat)}</strong></div><div style="display:flex;justify-content:space-between;padding:13px;background:#0B2447;color:white;border-radius:10px;font-size:18px"><span>Total TTC</span><strong style="color:#e8c780">${euro(p.totals.ttc)}</strong></div>${p.totals.depPct?`<div style="display:flex;justify-content:space-between;padding:9px"><span>Acompte ${p.totals.depPct} %</span><strong>${euro(p.totals.deposit)}</strong></div>`:""}</div>${p.notes?`<h3 style="color:#0B2447">Observations</h3><p>${escapeHtml(p.notes).replace(/\n/g,"<br>")}</p>`:""}<h3 style="color:#0B2447">Conditions</h3><p>${escapeHtml(p.paymentTerms||"Selon accord avec Clean-Cité.").replace(/\n/g,"<br>")}</p><div style="margin-top:24px;background:#f7f2e9;padding:14px;border-radius:10px"><strong>Pour accepter ce devis ou demander une modification</strong><br>Répondez directement à cet e-mail ou contactez Clean-Cité au ${COMPANY_PHONE}.</div><p style="margin-top:26px;font-size:12px;color:#667085">Clean-Cité · 149 rue de Paris, 93000 Bobigny · SIRET 989 248 554 00010 · ${escapeHtml(COMPANY_EMAIL)}</p></div></div>`;
  return {subject,text,html};
}

function mailto(p){const f=formatQuote(p);return `mailto:${encodeURIComponent(p.client.email)}?subject=${encodeURIComponent(f.subject)}&body=${encodeURIComponent(f.text)}`;}

async function sendBrevo(p){
  const f=formatQuote(p);const senderEmail=process.env.BREVO_SENDER_EMAIL||COMPANY_EMAIL;const senderName=process.env.BREVO_SENDER_NAME||"Clean-Cité";
  const body={sender:{email:senderEmail,name:senderName},to:[{email:p.client.email,name:p.client.name}],bcc:[{email:COMPANY_EMAIL,name:"Clean-Cité"}],subject:f.subject,htmlContent:f.html,textContent:f.text,replyTo:{email:COMPANY_EMAIL,name:"Clean-Cité"}};
  const r=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"Content-Type":"application/json","api-key":process.env.BREVO_API_KEY},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(data.message||"Erreur Brevo");e.status=r.status;e.details=data;throw e}return data;
}

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS") return json(200,{ok:true});
  if(event.httpMethod!=="POST") return json(405,{error:"Méthode non autorisée."});
  const email=authUser(event);if(!email||email!==ADMIN_EMAIL)return json(403,{error:"Accès administrateur requis pour envoyer un devis."});
  let raw={};try{raw=JSON.parse(event.body||"{}");const problem=validate(raw);if(problem)return json(400,{error:problem});const p=normalize(raw);if(!process.env.BREVO_API_KEY)return json(200,{sent:false,fallback:true,message:"Brevo n'est pas configuré.",mailto:mailto(p)});const result=await sendBrevo(p);return json(200,{sent:true,message:`Devis ${p.quoteNumber} envoyé à ${p.client.email}.`,messageId:result.messageId||null});}catch(e){return json(e.status||500,{error:e.message||"Erreur lors de l'envoi du devis.",details:e.details||null});}
};
