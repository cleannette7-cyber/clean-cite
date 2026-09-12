/* Grille commune au calculateur public et aux estimations par e-mail. */
(function (root) {
  'use strict';
  const rates = Object.freeze({
    officeOnce: 1.5, officeRegular: 1, minimumOnce: 150,
    chantierHour: 28, finishLight: 4.5, finishStandard: 6, finishHeavy: 9,
    binsStarter: 79, binsComfort: 159, binsPremium: 249,
    airbnbBedroom: 10, airbnbBathroom: 15, airbnbToilet: 6,
    airbnbKitchen: 15, airbnbLiving: 10, airbnbLevel: 12
  });
  function positive(v) { const n = Number(v); return Number.isFinite(n) && n > 0 && n <= 100000 ? n : null; }
  function count(v) { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : null; }
  function positiveCount(v) { const n = count(v); return n && n <= 365 ? n : null; }
  function airbnb(surface, bedrooms, bathrooms, toilets, kitchens, livingRooms, levels) {
    let base = surface <= 30 ? 55 : surface <= 50 ? 70 : surface <= 75 ? 90 : surface <= 100 ? 120 : Math.max(150, Math.round(120 + (surface - 100) * 1.2));
    const typology = surface <= 30 ? 'Studio / T1' : surface <= 50 ? 'T2' : surface <= 75 ? 'T3' : surface <= 100 ? 'T4' : 'T5+ / grand logement';
    const bedroomExtra = Math.max(0, bedrooms - 1) * rates.airbnbBedroom;
    const bathroomExtra = Math.max(0, bathrooms - 1) * rates.airbnbBathroom;
    const toiletExtra = Math.max(0, toilets - 1) * rates.airbnbToilet;
    const kitchenExtra = Math.max(0, kitchens - 1) * rates.airbnbKitchen;
    const livingExtra = Math.max(0, livingRooms - 1) * rates.airbnbLiving;
    const levelExtra = Math.max(0, levels - 1) * rates.airbnbLevel;
    const supplements = bedroomExtra + bathroomExtra + toiletExtra + kitchenExtra + livingExtra + levelExtra;
    return { base, typology, perRotation: Math.round(base + supplements), supplements, bedroomExtra, bathroomExtra, toiletExtra, kitchenExtra, livingExtra, levelExtra };
  }
  function estimate(input) {
    const p = input || {}, missing = [], service = p.service;
    function required(name, fn) { const v = fn(p[name]); if (v === null) missing.push(name); return v; }
    let amount, detail, period = 'intervention';
    if (service === 'bureaux') {
      const surface = required('surface', positive);
      if (!['unique', 'regulier'].includes(p.frequency)) missing.push('frequency');
      const passages = p.frequency === 'regulier' ? required('passages', positiveCount) : 1;
      if (p.frequency === 'regulier' && !['semaine','mois'].includes(p.periodUnit)) missing.push('periodUnit');
      if (!missing.length) {
        amount = p.frequency === 'unique' ? Math.max(surface * rates.officeOnce, rates.minimumOnce) : surface * rates.officeRegular * passages;
        detail = `${surface} m² · ${passages} passage(s)${p.frequency === 'regulier' ? ` par ${p.periodUnit}` : ''} · bureaux ${p.frequency === 'unique' ? 'ponctuels' : 'réguliers'}`;
        period = p.frequency === 'regulier' ? p.periodUnit : period;
      }
    } else if (service === 'fin_chantier') {
      const surface = required('surface', positive);
      if (!['leger', 'standard', 'tres_sale'].includes(p.condition)) missing.push('condition');
      if (!missing.length) {
        const rate = { leger: rates.finishLight, standard: rates.finishStandard, tres_sale: rates.finishHeavy }[p.condition];
        amount = Math.max(surface * rate, rates.minimumOnce);
        detail = `${surface} m² · fin de chantier · état ${p.condition.replace('_', ' ')}`;
      }
    } else if (service === 'poubelles') {
      const bins = required('bins', positiveCount), passes = required('binPasses', positiveCount);
      if (!missing.length) {
        if (bins > 15 || passes > 3) return { complete: false, missing: ['forfait sur mesure'], reason: 'Au-delà des forfaits publics.' };
        amount = bins <= 4 && passes <= 1 ? rates.binsStarter : bins <= 10 && passes <= 2 ? rates.binsComfort : rates.binsPremium;
        detail = `${bins} bac(s) · ${passes} passage(s) par semaine`; period = 'mois';
      }
    } else if (service === 'chantier_cours') {
      const agents = required('agents', positiveCount), hours = required('hours', positive), days = required('days', positiveCount);
      if (hours !== null && hours > 24) missing.push('hours');
      if (!missing.length) { amount = agents * hours * days * rates.chantierHour; detail = `${agents} agent(s) · ${hours} h/jour · ${days} jour(s)`; }
    } else if (service === 'airbnb') {
      const surface = required('surface', positive), levels = required('levels', positiveCount), rotations = required('rotations', positiveCount);
      const bedrooms = required('bedrooms', count), bathrooms = required('bathrooms', count), toilets = required('toilets', count), kitchens = required('kitchens', count), livingRooms = required('livingRooms', count);
      if (p.surfaceScope !== 'total') missing.push('surfaceScope');
      if (!missing.length) {
        const a = airbnb(surface, bedrooms, bathrooms, toilets, kitchens, livingRooms, levels);
        amount = a.perRotation * rotations;
        detail = `${surface} m² au total · ${levels} niveau(x) · ${bedrooms} chambre(s) · ${bathrooms} salle(s) d'eau · ${toilets} WC · ${kitchens} cuisine(s) · ${livingRooms} séjour(s) · ${rotations} rotation(s)`;
        period = rotations === 1 ? 'rotation' : `${rotations} rotations`;
      }
    } else return { complete: false, missing: ['service'], reason: 'Prestation à examiner manuellement.' };
    if (missing.length) return { complete: false, missing, reason: 'Informations nécessaires avant estimation.' };
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e6) return { complete: false, missing: [], reason: 'Montant à vérifier manuellement.' };
    return { complete: true, service, detail, amount: Math.round(amount), upper: Math.round(amount * 1.2), period, rateVersion: '2026-09-12' };
  }
  const api = { rates, airbnb, estimate };
  root.CleanCitePricing = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
