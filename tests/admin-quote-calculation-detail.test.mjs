import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { normalize, formatQuote } from '../netlify/functions/admin-send-devis.mjs';

const pageSource=readFileSync(new URL('../admin/devis.html',import.meta.url),'utf8');
const scripts=[...pageSource.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length,'Le script du module devis est introuvable.');
const adminScript=scripts.at(-1)[1].replace(/\n\$\('servicePreset'\)[\s\S]*?initIdentity\(\);\s*$/,'\n');

function createAdminContext(){
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id)) elements.set(id,{id,value:'',innerHTML:'',textContent:'',disabled:false,classList:{add(){},remove(){}},addEventListener(){},focus(){}});
    return elements.get(id);
  };
  const storage=new Map();
  const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value))};
  const context=vm.createContext({
    console,Intl,Date,Math,JSON,Number,String,Array,Object,RegExp,
    document:{getElementById:element,querySelectorAll:()=>[],querySelector:()=>null},
    localStorage,sessionStorage:{setItem(){},getItem(){return null}},
    location:{origin:'https://clean-cite.org',href:''},
    window:{open(){return null}},
    confirm:()=>true,alert(){},scrollTo(){},requestAnimationFrame:fn=>fn(),setTimeout,
  });
  vm.runInContext(adminScript,context,{filename:'admin/devis.html'});
  Object.assign(element('quoteNumber'),{value:'D-2026-TEST'});
  Object.assign(element('quoteDate'),{value:'2026-10-01'});
  Object.assign(element('validDays'),{value:'30'});
  Object.assign(element('clientName'),{value:'Client test'});
  Object.assign(element('clientEmail'),{value:'client@example.com'});
  Object.assign(element('clientPhone'),{value:'0612345678'});
  Object.assign(element('clientCity'),{value:'Bobigny'});
  Object.assign(element('clientAddress'),{value:'1 rue du Test'});
  Object.assign(element('vatRate'),{value:'20'});
  Object.assign(element('discount'),{value:'0'});
  Object.assign(element('deposit'),{value:'0'});
  Object.assign(element('quoteNotes'),{value:''});
  Object.assign(element('paymentTerms'),{value:'Règlement à réception.'});
  return{context,elements,localStorage};
}

const calculationDetail=`Sur la base de 6 jours par semaine :

• Par jour : 4 h × 26 € = 104 € HT
• Par mois moyen : 26 jours × 104 € = 2 704 € HT

Ce calcul suppose que toutes les prestations prévues sont comprises dans les 4 heures quotidiennes.`;

test('création, ajout, sauvegarde, rechargement et suppression du détail du calcul',()=>{
  const{context,elements,localStorage}=createAdminContext();
  vm.runInContext("addLine('Nettoyage général des parties communes',1,'forfait',2800)",context);
  assert.match(elements.get('linesBody').innerHTML,/Ajouter détail du calcul/);
  assert.doesNotMatch(elements.get('linesBody').innerHTML,/<textarea/);

  context.testDetail=calculationDetail;
  vm.runInContext('showCalculationDetail(lines[0].id);updateCalculationDetail(lines[0].id,testDetail)',context);
  assert.match(elements.get('linesBody').innerHTML,/Supprimer détail du calcul/);
  assert.match(elements.get('linesBody').innerHTML,/Détail du calcul/);

  const created=vm.runInContext('buildPayload()',context);
  assert.equal(created.lines[0].calculationDetail,calculationDetail);
  assert.equal(created.totals.subtotal,2800);
  assert.equal(created.totals.vat,560);
  assert.equal(created.totals.ttc,3360);

  vm.runInContext('saveHistory(buildPayload())',context);
  const saved=JSON.parse(localStorage.getItem('cleanCiteAdminQuotesV1'))[0];
  assert.equal(saved.lines[0].calculationDetail,calculationDetail);

  vm.runInContext("lines=[];renderLines();loadHistory(0)",context);
  assert.equal(vm.runInContext('lines[0].calculationDetail',context),calculationDetail);
  assert.equal(vm.runInContext('lines[0].detailOpen',context),true);
  assert.match(elements.get('linesBody').innerHTML,/Supprimer détail du calcul/);

  vm.runInContext('removeCalculationDetail(lines[0].id)',context);
  assert.equal(vm.runInContext('buildPayload().lines[0].calculationDetail',context),'');
  assert.match(elements.get('linesBody').innerHTML,/Ajouter détail du calcul/);
});

test('le document PDF conserve les lignes, les puces et masque les détails vides',()=>{
  const{context}=createAdminContext();
  context.quote={
    quoteNumber:'D-2026-TEST',quoteDate:'2026-10-01',validUntil:'2026-10-31',
    client:{name:'Client test',email:'',phone:'0612345678',city:'Bobigny',address:'1 rue du Test'},
    lines:[
      {description:'Nettoyage général des parties communes',quantity:1,unit:'forfait',unitPrice:2800,total:2800,calculationDetail},
      {description:'Prestation sans détail',quantity:1,unit:'forfait',unitPrice:100,total:100,calculationDetail:''},
    ],
    totals:{subtotal:2900,discount:0,ht:2900,vatRate:0,vat:0,ttc:2900,depPct:0,deposit:0},notes:'',paymentTerms:'Règlement à réception.',
  };
  const html=vm.runInContext('quoteHtml(quote)',context);
  assert.match(html,/Détail du calcul :/);
  assert.match(html,/• Par jour : 4 h × 26 € = 104 € HT/);
  assert.match(html,/• Par mois moyen : 26 jours × 104 € = 2 704 € HT/);
  assert.match(html,/white-space:pre-wrap/);
  assert.equal((html.match(/<tr class="calculation-pdf-row">/g)||[]).length,1);

  context.emptyQuote={...context.quote,lines:[context.quote.lines[1]]};
  const emptyHtml=vm.runInContext('quoteRowsHtml(emptyQuote)',context);
  assert.doesNotMatch(emptyHtml,/Détail du calcul/);
  assert.doesNotMatch(emptyHtml,/calculation-pdf-row/);
});

test('l’envoi du devis normalise et protège le détail sans modifier les totaux',()=>{
  const raw={
    quoteNumber:'D-2026-TEST',quoteDate:'2026-10-01',validUntil:'2026-10-31',
    client:{name:'Client test',email:'client@example.com',phone:'0612345678',city:'Bobigny',address:'1 rue du Test'},
    lines:[{description:'Nettoyage général',quantity:1,unit:'forfait',unitPrice:2800,calculationDetail:`${calculationDetail}\n<script>alert(1)</script>`}],
    totals:{discPct:0,vatRate:20,depPct:0},notes:'',paymentTerms:'Règlement à réception.',
  };
  const normalized=normalize(raw);
  assert.equal(normalized.lines[0].calculationDetail,raw.lines[0].calculationDetail);
  assert.equal(normalized.totals.ht,2800);
  assert.equal(normalized.totals.vat,560);
  assert.equal(normalized.totals.ttc,3360);

  const formatted=formatQuote(normalized);
  assert.match(formatted.html,/Détail du calcul :/);
  assert.match(formatted.html,/• Par jour : 4 h × 26 € = 104 € HT/);
  assert.doesNotMatch(formatted.html,/<script>alert\(1\)<\/script>/);
  assert.match(formatted.html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(formatted.text,/Détail du calcul/);
});
