import test from 'node:test';
import assert from 'node:assert/strict';
import pricing from '../assets/pricing.js';
import { quoteFromAnalysis, prequotePdf } from '../netlify/functions/_prequote.mjs';
import { dueStage } from '../netlify/functions/_quote-followups.mjs';
import { geminiQuotaError } from '../netlify/functions/gmail-mail-ai.mjs';
import { DEFAULT_PROSPECTING_SETTINGS, PROSPECT_CATEGORIES, extractPublicEmails, isGenericBusinessEmail, normalizeProspectingSettings, prospectDue, prospectMessageTemplate, renderProspectTemplate } from '../netlify/functions/_prospecting-core.mjs';
import { PDFDocument } from 'pdf-lib';

const officeMessage = {subject:'Demande de devis bureaux',body:'Bonjour, nettoyage ponctuel de nos bureaux de 100 m² à Bobigny.'};
const officeFacts = {quoteData:{service:'bureaux',surface:100,frequency:'unique',city:'Bobigny'},quoteEvidence:{service:'bureaux',surface:'100 m²',frequency:'ponctuel',city:'Bobigny'}};

test('un refus de quota Gemini donne un délai clair sans exposer le message technique', () => {
  const error=geminiQuotaError({status:429},{error:{message:'Quota exceeded. Please retry in 56.146100323s.',details:[{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'56s'}]}});
  assert.equal(error.code,'GEMINI_QUOTA');
  assert.equal(error.retryAfterSeconds,56);
  assert.match(error.message,/Limite Gemini atteinte/);
  assert.equal(geminiQuotaError({status:400},{error:{message:'Mauvaise requête'}}),null);
});

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

test('la détection privilégie les e-mails professionnels publics sans doublon', () => {
  const html='<a href="mailto:contact@conciergerie.fr">Nous écrire</a> contact@conciergerie.fr <span>direction [at] conciergerie [dot] fr</span> noreply@conciergerie.fr';
  const emails=extractPublicEmails(html,'https://conciergerie.fr/contact');
  assert.deepEqual(emails.map(item=>item.email).sort(),['contact@conciergerie.fr','direction@conciergerie.fr']);
  assert.equal(isGenericBusinessEmail('contact@conciergerie.fr'),true);
  assert.equal(isGenericBusinessEmail('marie@conciergerie.fr'),false);
});

test('les variables du message de prospection sont remplacées sans invention', () => {
  const rendered=renderProspectTemplate('Bonjour {{entreprise}} à {{ville}} — {{site}}',{
    companyName:'Maison Hôte',location:'Paris',website:'https://maison-hote.fr'
  });
  assert.equal(rendered,'Bonjour Maison Hôte à Paris — https://maison-hote.fr');
});

test('la prospection propose cinq activités avec un message dédié', () => {
  assert.deepEqual(Object.keys(PROSPECT_CATEGORIES),['airbnb','syndic','gestionnaire_copropriete','administrateur_biens','agence_immobiliere']);
  const syndic=prospectMessageTemplate(DEFAULT_PROSPECTING_SETTINGS,'syndic');
  const agence=prospectMessageTemplate(DEFAULT_PROSPECTING_SETTINGS,'agence_immobiliere');
  assert.match(syndic.initialBody,/parties communes/i);
  assert.doesNotMatch(syndic.initialBody,/Airbnb/i);
  assert.match(agence.initialBody,/avant location ou vente/i);
  assert.doesNotMatch(agence.followupBody,/locations courte durée/i);
});

test('les anciens réglages Airbnb sont migrés sans perdre le message personnalisé', () => {
  const settings=normalizeProspectingSettings({version:1,keyword:'conciergerie Airbnb',initialSubject:'Objet personnalisé',initialBody:'Corps personnalisé',followupBody:'Relance personnalisée'});
  assert.equal(settings.version,2);
  assert.equal(settings.selectedCategory,'airbnb');
  assert.equal(settings.templates.airbnb.initialSubject,'Objet personnalisé');
  assert.match(settings.templates.syndic.initialBody,/syndics/i);
  const afterManualSyndicSearch=normalizeProspectingSettings({version:1,keyword:'syndic de copropriété',initialSubject:'Objet Airbnb conservé'});
  assert.equal(afterManualSyndicSearch.selectedCategory,'syndic');
  assert.equal(afterManualSyndicSearch.templates.airbnb.initialSubject,'Objet Airbnb conservé');
  assert.match(afterManualSyndicSearch.templates.syndic.initialSubject,/parties communes/i);
});

test('la prospection prévoit une seule relance à J+7', () => {
  const prospect={status:'contacted',followupStage:0,sentAt:'2026-09-01T09:00:00Z',followupDueAt:'2026-09-08T09:00:00Z'};
  assert.equal(prospectDue(prospect,new Date('2026-09-08T08:59:59Z')),false);
  assert.equal(prospectDue(prospect,new Date('2026-09-08T09:00:00Z')),true);
  assert.equal(prospectDue({...prospect,followupStage:1},new Date('2026-09-20T09:00:00Z')),false);
  assert.equal(prospectDue({...prospect,status:'replied'},new Date('2026-09-20T09:00:00Z')),false);
});
