import pricing from '../../assets/pricing.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const labels = {
  surface: 'surface en m²', frequency: 'fréquence', passages: 'nombre de passages', periodUnit:'période des passages',
  condition: 'état du chantier', bins: 'nombre de bacs', binPasses: 'passages par semaine',
  agents: 'nombre d’agents', hours: 'heures par jour', days: 'nombre de jours',
  levels: 'nombre de niveaux', rotations: 'rotations', bedrooms: 'chambres',
  bathrooms: 'salles d’eau', toilets: 'WC', kitchens: 'cuisines', livingRooms: 'séjours',
  surfaceScope: 'surface totale du logement', city: 'ville d’intervention'
};
const serviceWords = {
  bureaux: /bureaux|bureau|locaux professionnels/i,
  fin_chantier: /fin de chantier|apr[eè]s travaux/i,
  chantier_cours: /chantier en cours|pendant (?:les )?travaux/i,
  poubelles: /poubelles|bacs/i,
  airbnb: /airbnb|location courte dur[eé]e|rotation/i
};
const fieldPatterns = {
  surface: /(?:m²|m2|mètres? carrés?|surface|superficie)/i,
  passages: /passages?|fois|interventions?/i, bins: /bacs?|poubelles?/i,
  binPasses: /passages?|fois/i, agents: /agents?|employés?|personnes?/i,
  hours: /\b(?:h(?:eures?)?|heures?)\b|\d\s?h\b/i, days: /jours?|journées?/i,
  levels: /niveaux?|étages?/i, rotations: /rotations?|ménages?/i,
  bedrooms: /chambres?/i, bathrooms: /salles? d.eau|douches?/i,
  toilets: /wc|toilettes?/i, kitchens: /cuisines?/i, livingRooms: /salons?|séjours?/i
};

export function newMessageText(body) {
  return String(body||'').split(/\n(?:Le .{4,150}(?:a|avez) écrit\s*:|On .{4,150} wrote\s*:|De\s*:.{4,150}\n|>)/i)[0].slice(0,6000);
}

export function quoteFromAnalysis(message, analysis) {
  const data = analysis?.quoteData || {}, evidence = analysis?.quoteEvidence || {};
  const source = `${message.subject || ''}\n${newMessageText(message.body)}`.toLocaleLowerCase('fr-FR').replace(/\s+/g, ' ');
  const service = String(data.service || '');
  if (!serviceWords[service]) return { complete:false, missing:['prestation'], reason:'Prestation à analyser.' };
  const serviceEvidence = String(evidence.service || '').toLocaleLowerCase('fr-FR').replace(/\s+/g, ' ').trim();
  if (!serviceEvidence || !source.includes(serviceEvidence) || !serviceWords[service].test(serviceEvidence))
    return { complete:false, missing:['prestation'], reason:'Prestation non justifiée dans le message.' };
  if (Object.entries(serviceWords).filter(([key,pattern])=>key!==service && pattern.test(source)).length)
    return { complete:false, missing:['plusieurs prestations'], reason:'Demande mixte à chiffrer manuellement.' };
  // Une demande avec prestation supplémentaire ne reçoit pas une estimation partielle.
  const extras = /\b(?:d[eé]capage|vitrerie|vitres?|fen[eê]tres?|terrasses?|d[eé]barras|d[eé]sinfection)\b/i;
  if (extras.test(source)) return { complete:false, missing:['options à chiffrer'], reason:'Prestation complémentaire à vérifier.' };
  const fields = { bureaux:['surface','frequency'], fin_chantier:['surface','condition'], poubelles:['bins','binPasses'], chantier_cours:['agents','hours','days'], airbnb:['surface','levels','rotations','bedrooms','bathrooms','toilets','kitchens','livingRooms'] }[service];
  if (service === 'bureaux' && data.frequency === 'regulier') fields.push('passages','periodUnit');
  if (service === 'airbnb' && Number(data.levels) > 1) fields.push('surfaceScope');
  fields.push('city');
  const missing = [], clean = { service };
  for (const field of fields) {
    const snippet = String(evidence[field] || '').toLocaleLowerCase('fr-FR').replace(/\s+/g, ' ').trim();
    const value = data[field];
    if (!snippet || snippet.length > 120 || !source.includes(snippet)) { missing.push(labels[field]); continue; }
    if (fieldPatterns[field]) {
      const n = Number(value);
      const numbers = [...snippet.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => Number(m[0].replace(',', '.')));
      if (!fieldPatterns[field].test(snippet) || !numbers.includes(n)) { missing.push(labels[field]); continue; }
      clean[field] = n;
    } else if (field === 'condition') {
      const pattern = { leger:/l[eé]ger/i, standard:/standard|normal/i, tres_sale:/tr[eè]s sale|tr[eè]s encrass/i }[value];
      if (!pattern?.test(snippet)) missing.push(labels[field]); else clean[field] = value;
    } else if (field === 'frequency') {
      const pattern = value === 'unique' ? /ponctuel|unique|une fois/i : value === 'regulier' ? /r[eé]gulier|hebdomadaire|par semaine|par mois/i : null;
      if (!pattern?.test(snippet)) missing.push(labels[field]); else clean[field] = value;
    } else if (field === 'periodUnit') {
      if (!['semaine','mois'].includes(value) || !new RegExp(value,'i').test(snippet)) missing.push(labels[field]); else clean[field] = value;
    } else if (field === 'surfaceScope') {
      if (value !== 'total' || !/au total|surface totale|en tout/i.test(snippet)) missing.push(labels[field]); else clean[field] = value;
    } else if (field === 'city') {
      if (typeof value !== 'string' || value.length < 2 || !snippet.includes(value.toLocaleLowerCase('fr-FR'))) missing.push(labels[field]); else clean[field] = value.slice(0,100);
    }
  }
  if (service === 'airbnb' && Number(clean.levels) === 1) clean.surfaceScope = 'total';
  if (missing.length) return { complete:false, missing, reason:'Informations non confirmées dans le message.' };
  const result = pricing.estimate(clean);
  return result.complete ? { ...result, city:clean.city } : { ...result, missing:(result.missing || []).map(k=>labels[k] || k) };
}

const money = amount => new Intl.NumberFormat('fr-FR', { maximumFractionDigits:0 }).format(amount) + ' €';
export function prequoteText(q) {
  return `Nous vous remercions pour votre demande. Sur la base des informations communiquées (${q.detail}, ${q.city}), voici votre PRÉ-DEVIS : ${money(q.amount)} à ${money(q.upper)} pour ${q.period}.\n\nCette estimation est indicative. Le montant, la TVA et les conditions de la prestation seront confirmés après vérification de l’accès, de l’état réel des lieux et de vos besoins. Pour obtenir un devis définitif, vous pouvez répondre directement à ce message.`;
}

export async function prequotePdf(q, reference, now = new Date()) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage([595.28, 841.89]);
  const loadFont=async name => {
    try { return await readFile(new URL(`../../assets/fonts/${name}`,import.meta.url)); }
    catch { return readFile(resolve(process.cwd(),'assets','fonts',name)); }
  };
  const regular = await pdf.embedFont(await loadFont('DejaVuSans.ttf'),{subset:true});
  const bold = await pdf.embedFont(await loadFont('DejaVuSans-Bold.ttf'),{subset:true});
  const navy = rgb(.043,.141,.278), orange = rgb(.956,.475,.125), gray = rgb(.37,.43,.50);
  page.drawRectangle({x:0,y:712,width:595.28,height:130,color:navy});
  page.drawText('CLEAN-CITÉ', {x:46,y:793,font:bold,size:23,color:rgb(1,1,1)});
  page.drawText('PRÉ-DEVIS · ESTIMATION INDICATIVE', {x:46,y:750,font:bold,size:17,color:rgb(1,1,1)});
  page.drawText(`Référence : ${reference}`, {x:46,y:678,font:bold,size:11,color:navy});
  page.drawText(`Établi le ${new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'Europe/Paris'}).format(now)}`, {x:46,y:658,font:regular,size:11,color:gray});
  page.drawText('Prestation et informations fournies', {x:46,y:612,font:bold,size:14,color:navy});
  const wrap = (text,width=83) => {
    const lines=[''];
    for (const word of String(text).split(/\s+/)) {
      const i=lines.length-1, next=lines[i] ? lines[i]+' '+word : word;
      if (next.length>width && lines[i]) lines.push(word); else lines[i]=next;
    }
    return lines;
  };
  let y=588;
  for (const line of wrap(q.detail + ' · ' + q.city, 83)) { page.drawText(line.trim(), {x:46,y,font:regular,size:11,color:navy}); y-=18; }
  y-=100;
  page.drawRectangle({x:46,y:y-14,width:503,height:86,color:rgb(.96,.97,.99)});
  page.drawText('Fourchette indicative', {x:62,y:y+49,font:regular,size:12,color:gray});
  page.drawText(`${money(q.amount)} – ${money(q.upper)}`, {x:62,y:y+14,font:bold,size:25,color:orange});
  page.drawText(`Pour : ${q.period}`, {x:46,y:y-42,font:regular,size:11,color:navy});
  y-=96;
  const disclaimer = 'Cette estimation est établie à partir des seules informations transmises. Le montant définitif, la TVA, les options, les conditions d’accès, l’état des lieux et les horaires seront confirmés par Clean-Cité après vérification. Ce document ne constitue pas un devis définitif.';
  for (const line of wrap(disclaimer, 88)) { page.drawText(line.trim(), {x:46,y,font:regular,size:10,color:gray}); y-=16; }
  page.drawText('Pour demander un devis définitif, répondez à cet e-mail.', {x:46,y:y-23,font:bold,size:11,color:navy});
  page.drawLine({start:{x:46,y:89},end:{x:549,y:89},thickness:1,color:rgb(.85,.88,.92)});
  page.drawText('Clean-Cité · 149 rue de Paris, 93000 Bobigny · 07 66 53 61 54', {x:46,y:68,font:regular,size:9,color:gray});
  return Buffer.from(await pdf.save());
}
