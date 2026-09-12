import test from 'node:test';
import assert from 'node:assert/strict';
import pricing from '../assets/pricing.js';
import { quoteFromAnalysis, prequotePdf } from '../netlify/functions/_prequote.mjs';
import { dueStage } from '../netlify/functions/_quote-followups.mjs';
import { PDFDocument } from 'pdf-lib';

const officeMessage = {subject:'Demande de devis bureaux',body:'Bonjour, nettoyage ponctuel de nos bureaux de 100 m² à Bobigny.'};
const officeFacts = {quoteData:{service:'bureaux',surface:100,frequency:'unique',city:'Bobigny'},quoteEvidence:{service:'bureaux',surface:'100 m²',frequency:'ponctuel',city:'Bobigny'}};

test('la grille partagée applique le minimum ponctuel, pas au contrat régulier', () => {
  assert.equal(pricing.estimate({service:'bureaux',surface:100,frequency:'unique'}).amount,150);
  assert.equal(pricing.estimate({service:'bureaux',surface:100,frequency:'regulier',passages:4,periodUnit:'mois'}).amount,400);
  assert.equal(pricing.estimate({service:'bureaux',surface:100,frequency:'regulier',passages:4}).complete,false);
  assert.equal(pricing.estimate({service:'poubelles',bins:16,binPasses:1}).complete,false);
});

test('seuls des faits justifiés par le message permettent le pré-devis', () => {
  const valid=quoteFromAnalysis(officeMessage,officeFacts);
  assert.equal(valid.amount,150);
  assert.equal(valid.upper,180);
  assert.equal(quoteFromAnalysis(officeMessage,{...officeFacts,quoteEvidence:{...officeFacts.quoteEvidence,city:'Paris'}}).complete,false);
  assert.equal(quoteFromAnalysis({subject:'Bureaux et terrasse',body:officeMessage.body},officeFacts).complete,false);
  assert.equal(quoteFromAnalysis({subject:'Re: devis bureaux',body:'Merci de votre réponse.\nLe mardi, vous avez écrit :\n'+officeMessage.body},officeFacts).complete,false);
});

test('Airbnb multi-niveaux sans surface totale explicite reste manuel', () => {
  const message={subject:'Devis Airbnb',body:'Airbnb à Bobigny, 140 m² sur 3 niveaux, 6 chambres, 5 salles d’eau, 2 WC, 1 cuisine, 1 salon, 1 rotation.'};
  const facts={quoteData:{service:'airbnb',surface:140,levels:3,bedrooms:6,bathrooms:5,toilets:2,kitchens:1,livingRooms:1,rotations:1,city:'Bobigny'},quoteEvidence:{service:'Airbnb',surface:'140 m²',levels:'3 niveaux',bedrooms:'6 chambres',bathrooms:'5 salles d’eau',toilets:'2 WC',kitchens:'1 cuisine',livingRooms:'1 salon',rotations:'1 rotation',city:'Bobigny'}};
  assert.equal(quoteFromAnalysis(message,facts).complete,false);
  assert.equal(pricing.estimate({...facts.quoteData,surfaceScope:'total'}).amount,308);
});

test('le PDF porte explicitement la mention PRÉ-DEVIS et reste lisible', async () => {
  const pdf=await prequotePdf(quoteFromAnalysis(officeMessage,officeFacts),'PRE-TEST',new Date('2026-09-12T09:00:00Z'));
  assert.ok(pdf.length>1000);
  assert.equal((await PDFDocument.load(pdf)).getPageCount(),1);
});

test('relances à J+7 puis sept jours après la première, jamais après réponse', () => {
  const quote={status:'pending',stage:0,sentAt:'2026-09-01T09:00:00Z'};
  assert.equal(dueStage(quote,new Date('2026-09-08T08:59:00Z')),0);
  assert.equal(dueStage(quote,new Date('2026-09-08T09:00:00Z')),1);
  assert.equal(dueStage({...quote,stage:1,lastFollowupAt:'2026-09-08T09:00:00Z'},new Date('2026-09-15T09:00:00Z')),2);
  assert.equal(dueStage({...quote,status:'replied'},new Date('2026-09-15T09:00:00Z')),0);
  assert.equal(dueStage({...quote,stage:2},new Date('2026-09-30T09:00:00Z')),0);
});
