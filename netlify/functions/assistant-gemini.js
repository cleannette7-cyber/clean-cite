const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 650 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 2400 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const COMPANY_CONTEXT = `
Tu es l'assistant IA officiel de Clean-Cité, entreprise de nettoyage professionnel basée à Bobigny.

Identité Clean-Cité :
- Nom : Clean-Cité
- Responsable : TRAORE FOUSSEYNI
- Adresse : 149 rue de Paris, 93000 Bobigny
- Téléphone : 07 66 53 61 54
- Email principal : cleannette7@gmail.com
- Site : https://clean-cite.org
- Zone : Bobigny, Seine-Saint-Denis, Paris et Île-de-France (92, 93, 94, 95, 77, 91)

Services :
- Nettoyage de bureaux et locaux professionnels
- Nettoyage Airbnb et location courte durée entre deux voyageurs
- Nettoyage de fin de chantier
- Nettoyage de chantier en cours
- Remise en état après travaux, sinistre ou déménagement
- Vitrerie et vitrines
- Parties communes d'immeuble et copropriétés
- Sortie et rentrée de poubelles
- Nettoyage de tapis, canapés et terrasses

GRILLE TARIFAIRE CLEAN-CITÉ À UTILISER :
- Airbnb / location courte durée — CALCUL SERVEUR OBLIGATOIRE, Gemini ne doit jamais recalculer le prix. La surface peut être saisie PAR NIVEAU ou AU TOTAL. Dans Clean-Cité, la formulation « 140 m² sur 3 niveaux » est interprétée comme 140 m² par niveau = 420 m², sauf si le client précise « 140 m² au total ». Base surface : 55 € jusqu’à 30 m², 70 € jusqu’à 50 m², 90 € jusqu’à 75 m², 120 € jusqu’à 100 m² ; au-delà, base = max(150 €, 120 € + 1,20 € par m² au-dessus de 100 m²). Ajustements : +10 € par chambre au-delà de la première, +15 € par salle d’eau/douche au-delà de la première, +6 € par WC au-delà du premier, +15 € par cuisine au-delà de la première, +10 € par salon/séjour au-delà du premier, +12 € par niveau au-delà du premier. Décapage/remise en état du sol : 6,50 €/m² ; décapage lourd : 8,50 €/m², calculé séparément sur la surface de sol réellement à traiter et une seule fois. Blanchisserie, fourniture de linge, après fête ou urgence : sur devis.
- Bureaux ponctuels : dès 1,50 €/m². Minimum d'intervention ponctuelle : 150 €.
- Bureaux réguliers : dès 1 €/m² PAR PASSAGE. Ne pas appliquer automatiquement le minimum ponctuel de 150 € à un contrat régulier.
- Chantier en cours : 28 € HT/heure PAR AGENT. Une journée type de 7 heures correspond à 196 € HT par agent et par jour. Le calcul indicatif est : nombre d'agents × heures par jour × nombre de jours × 28 €. Pour une intervention ponctuelle, le minimum de 150 € peut s'appliquer ; les contrats récurrents sont confirmés sur devis.
- Fin de chantier léger : 4,50 €/m².
- Fin de chantier standard : 6 €/m².
- Fin de chantier très sale : 9 €/m².
- Remise en état standard : dès 6,50 €/m².
- Remise en état très encrassée : dès 8,50 €/m².
- Vitrerie accessible standard : dès 4 €/m².
- Vitrerie très sale / première intervention : dès 6,50 €/m².
- Vitrerie en hauteur, nacelle ou accès difficile : sur devis.
- Terrasse : dès 4,90 €/m² ; terrasse très encrassée : dès 6,50 €/m² ; cas complexe : sur devis.
- Parties communes : dès 199 €/mois, puis devis selon taille, fréquence et tâches.
- Sortie/rentrée de poubelles STARTER : 79 €/mois, jusqu'à 4 bacs, 1 passage/semaine, sortie et rentrée des bacs, rapport mensuel.
- Sortie/rentrée de poubelles CONFORT : 159 €/mois, jusqu'à 10 bacs, 2 passages/semaine, sortie/rentrée, nettoyage des bacs 1 fois/mois, rapport mensuel.
- Sortie/rentrée de poubelles PREMIUM : dès 249 €/mois, jusqu'à 15 bacs, 3 passages/semaine, sortie/rentrée, nettoyage des bacs 2 fois/mois, rapport détaillé.
- Plus de 15 bacs, plus de 3 passages/semaine, plusieurs immeubles ou besoin particulier : sur devis.
- Il n'existe plus de formule poubelles « illimitée ».
- Minimum d'intervention ponctuelle : 150 €. Ce minimum ne s'applique pas automatiquement aux abonnements poubelles, aux parties communes ou aux contrats réguliers.

Règles de calcul et de formulation :
- Les prix sont indicatifs et doivent être présentés comme « dès », « à partir de » ou « estimation indicative ».
- Pour un Airbnb, demande prioritairement la surface en m², le nombre de niveaux, de chambres, de salles d’eau/douches, de WC, de cuisines, de salons/séjours, le nombre de rotations à chiffrer, la ville et la fréquence. Demande aussi si le linge propre est disponible sur place si utile. Une rotation standard ne doit pas être confondue avec une remise en état très sale.
- Pour les bureaux réguliers, précise toujours « 1 €/m² par passage », pas 1 €/m² par mois.
- Pour une fin de chantier, demande le niveau d'encrassement si le client ne le précise pas avant de donner une estimation.
- Pour un chantier en cours, demande toujours le nombre d'agents prévus par jour, le nombre d'heures par jour et le nombre de jours. Propose 7 heures par jour comme journée type si le client n'a pas encore fixé la durée. Utilise le calcul : agents × heures/jour × jours × 28 € HT. Précise qu'une journée de 7 h revient à 196 € HT par agent.
- Pour les poubelles, demande le nombre de bacs et le nombre de passages par semaine afin d'orienter vers Starter, Confort, Premium ou un devis personnalisé.
- Pour les parties communes, indique « dès 199 €/mois » et demande le nombre d'étages, halls, passages/semaine et présence d'un local poubelles.
- Ne présente jamais une estimation comme un prix ferme.

RÈGLES SPÉCIALES POUR LES PHOTOS :
- Quand une ou plusieurs photos sont jointes, analyse uniquement ce qui est réellement visible et utile pour une prestation de nettoyage : niveau apparent de salissure, poussière, traces, déchets visibles, état apparent des sols et vitrages, encombrement visible et difficulté visuelle évidente.
- N'invente jamais une surface en m² à partir d'une photo. Si la surface n'est pas donnée, demande-la avant de calculer un prix au m².
- N'invente jamais la hauteur, l'accessibilité réelle, la présence d'une nacelle, le nombre d'étages, l'absence ou présence d'ascenseur, ni ce qui est caché hors champ.
- Une photo ne permet pas de diagnostiquer de façon certaine moisissures, amiante, produits chimiques, risques biologiques ou autres matières dangereuses. Si un risque semble possible, indique qu'une vérification humaine est nécessaire.
- Ne cherche pas à identifier les personnes éventuellement visibles sur les photos. Ignore leur identité et concentre-toi sur le lieu à nettoyer.
- Si les photos semblent contredire l'état déclaré par le client, signale-le comme une observation visuelle, sans modifier silencieusement les données fournies.
- Pour un chantier en cours, les photos peuvent aider à juger la charge de travail apparente, mais le tarif reste calculé sur agents × heures × jours × 28 € HT.
- Si les éléments sont suffisants, structure la réponse avec :
  1. « PRÉ-DEVIS IA ESTIMATIF »
  2. Prestation envisagée
  3. Observations visibles
  4. Données fournies par le client
  5. Calcul ou fourchette indicative selon la grille Clean-Cité
  6. Niveau de confiance : faible, moyen ou élevé
  7. Points à confirmer avant devis définitif
- Si une donnée essentielle manque, ne fabrique pas de prix. Donne l'analyse visuelle possible puis pose au maximum 3 questions prioritaires.

Ton rôle :
- Accueillir les clients avec un ton professionnel, clair et rassurant.
- Répondre aux questions sur les services et les zones d'intervention.
- Aider à préparer une demande de devis.
- Demander les informations manquantes : ville, surface, type de prestation, état du lieu, délai, fréquence et coordonnées.
- Donner uniquement des estimations indicatives, jamais un devis définitif.
- Inciter le client à laisser son nom, téléphone et email ou à contacter Clean-Cité sur WhatsApp.

Règles importantes :
- Réponds toujours en français.
- Ne promets jamais un prix ferme sans visite ou échange avec l'équipe.
- Ne demande pas d'informations sensibles inutiles.
- Si la demande est urgente, propose d'appeler ou WhatsApp au 07 66 53 61 54.
- Fais des réponses courtes, utiles et commerciales.
`;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function sanitizeImages(images) {
  if (!Array.isArray(images)) return [];
  const clean = [];
  let totalBytes = 0;

  for (const image of images.slice(0, MAX_IMAGES)) {
    const mimeType = String(image?.mimeType || "").toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) continue;

    let data = String(image?.data || "").trim();
    data = data.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    if (!data || !/^[A-Za-z0-9+/=\r\n]+$/.test(data)) continue;

    let bytes;
    try {
      bytes = Buffer.from(data, "base64");
    } catch (_) {
      continue;
    }
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) continue;
    if (totalBytes + bytes.length > MAX_TOTAL_IMAGE_BYTES) break;

    totalBytes += bytes.length;
    clean.push({
      mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
      data: bytes.toString("base64")
    });
  }
  return clean;
}

function normalizeMessages(messages, fallbackMessage, images) {
  const inputMessages = Array.isArray(messages) && messages.length
    ? messages
    : [{ role: "user", content: fallbackMessage || (images.length ? "Analyse ces photos pour préparer un pré-devis." : "Bonjour") }];

  const normalized = inputMessages
    .slice(-12)
    .map((msg) => {
      const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
      const text = String(msg.content || "").slice(0, 3000).trim();
      return {
        role,
        parts: text ? [{ text }] : []
      };
    })
    .filter((msg) => msg.parts.length > 0);

  if (images.length) {
    let targetIndex = -1;
    for (let i = normalized.length - 1; i >= 0; i -= 1) {
      if (normalized[i].role === "user") {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex < 0) {
      normalized.push({ role: "user", parts: [{ text: fallbackMessage || "Analyse ces photos pour préparer un pré-devis." }] });
      targetIndex = normalized.length - 1;
    }
    images.forEach((image) => {
      normalized[targetIndex].parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    });
  }

  return normalized;
}


function extractLastUserText(messages, fallbackMessage) {
  if (Array.isArray(messages)) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if ((m?.role === "user" || !m?.role) && String(m?.content || "").trim()) {
        return String(m.content).trim();
      }
    }
  }
  return String(fallbackMessage || "").trim();
}

function parseSurface(text) {
  const t = String(text || "").replace(/\u00a0/g, " ");
  const m = t.match(/(?:surface(?:\s+de)?\s*)?(\d[\d\s.,]{0,12})\s*(?:m2|m²|mètre(?:s)?\s+carr(?:é|e|és|ées))/i);
  if (!m) return 0;
  const raw = m[1].replace(/\s/g, "").replace(/,(?=\d{1,2}$)/, ".");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function euro(value) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}


function calcAirbnbDetailed(surfaceInput, bedrooms=1, bathrooms=1, toilets=1, kitchens=1, livingRooms=1, levels=1, surfaceMode="total", floorTreatment="none", stripArea=0) {
  surfaceInput=Math.max(0,Number(surfaceInput)||0); bedrooms=Math.max(0,Number(bedrooms)||0); bathrooms=Math.max(0,Number(bathrooms)||0); toilets=Math.max(0,Number(toilets)||0); kitchens=Math.max(0,Number(kitchens)||0); livingRooms=Math.max(0,Number(livingRooms)||0); levels=Math.max(1,Number(levels)||1); stripArea=Math.max(0,Number(stripArea)||0);
  const totalArea=surfaceMode==='per_level'?surfaceInput*levels:surfaceInput;
  let base=0,type='';
  if(totalArea<=30){base=55;type='Studio / T1';} else if(totalArea<=50){base=70;type='T2';} else if(totalArea<=75){base=90;type='T3';} else if(totalArea<=100){base=120;type='T4';} else {base=Math.max(150,Math.round(120+(totalArea-100)*1.2));type='T5+ / grand logement';}
  const configurationExtra=Math.max(0,bedrooms-1)*10 + Math.max(0,bathrooms-1)*15 + Math.max(0,toilets-1)*6 + Math.max(0,kitchens-1)*15 + Math.max(0,livingRooms-1)*10 + Math.max(0,levels-1)*12;
  const rotationPrice=Math.round(base+configurationExtra);
  const floorRate=floorTreatment==='strip_heavy'?8.5:floorTreatment==='strip'?6.5:0;
  const floorExtra=floorRate>0?Math.round(stripArea*floorRate*100)/100:0;
  return {base,type,totalArea,configurationExtra,rotationPrice,floorRate,floorExtra,stripArea,surfaceInput,surfaceMode};
}
function extractCount(text, patterns, fallback=1) { for (const re of patterns) { const m=String(text||'').match(re); if(m) return Math.max(0,Number(m[1])||0); } return fallback; }

function parseAirbnbSurfaceMode(text, levels){
  const t=String(text||'').toLowerCase();
  if(/(?:au total|surface totale|total de)\s*/i.test(t)) return 'total';
  if(/(?:par niveau|chaque niveau|par étage|chaque étage)/i.test(t)) return 'per_level';
  if(levels>1 && /\d[\d\s.,]*\s*(?:m2|m²|mètres?\s+carr[ée]s?).{0,35}(?:sur|réparti[^ ]* sur)\s*\d+\s*(?:niveaux|étages?)/i.test(t)) return 'per_level';
  return 'total';
}
function parseStripArea(text){
  const t=String(text||'');
  const m=t.match(/(\d[\d\s.,]{0,8})\s*(?:m2|m²)\s*(?:de\s*)?(?:sol\s*)?(?:à\s*)?d[ée]cap/i);
  if(!m) return 0;
  const n=Number(m[1].replace(/\s/g,'').replace(',','.')); return Number.isFinite(n)?n:0;
}
function buildAirbnbDeterministicReply(text,imageCount=0){
  const input=String(text||''); const surface=parseSurface(input);
  const bedrooms=extractCount(input,[/(\d+)\s*chambre/i],1);
  const bathrooms=extractCount(input,[/(\d+)\s*(?:salles?\s*d['’]?eau|salles?\s*de\s*bain|douches?)/i],1);
  const toilets=extractCount(input,[/(\d+)\s*(?:wc|toilettes?)/i],1);
  const kitchens=extractCount(input,[/(\d+)\s*cuisines?/i],1);
  const living=extractCount(input,[/(\d+)\s*(?:salons?|s[ée]jours?)/i],1);
  const levels=extractCount(input,[/(\d+)\s*(?:niveaux|étages?)/i],1);
  const rotations=extractCount(input,[/(\d+)\s*rotations?/i],1);
  const surfaceMode=parseAirbnbSurfaceMode(input,levels);
  const needsStrip=/d[ée]cap|taches?\s+(?:à|a)\s+d[ée]cap/i.test(input);
  const heavy=/d[ée]capage\s+lourd|tr[eè]s\s+encrass|fortement\s+tach/i.test(input);
  const stripArea=parseStripArea(input);
  const floorTreatment=needsStrip?(heavy?'strip_heavy':'strip'):'none';
  const floorType=/\bpvc\b|vinyle|lino/i.test(input)?'PVC':/carrelage/i.test(input)?'carrelage':/parquet/i.test(input)?'parquet':/moquette/i.test(input)?'moquette':'non précisé';
  const photoNote=imageCount?`
Photos reçues : ${imageCount}. Gemini peut les commenter visuellement, mais le calcul tarifaire ci-dessous reste celui du moteur Clean-Cité.`:'';
  if(!surface) return `Pour un calcul Airbnb précis, indiquez la surface, le nombre de niveaux, chambres, salles d’eau/douches, WC, cuisines et salons/séjours. Précisez surtout si la surface est « par niveau » ou « au total ».${photoNote}`;
  const a=calcAirbnbDetailed(surface,bedrooms,bathrooms,toilets,kitchens,living,levels,surfaceMode,floorTreatment,stripArea);
  const rotationTotal=a.rotationPrice*rotations;
  let out=`PRÉ-DEVIS AIRBNB — CALCUL CLEAN-CITÉ

Surface saisie : ${surface} m² ${surfaceMode==='per_level'?'par niveau':'au total'}
Niveaux : ${levels}
Surface totale calculée : ${a.totalArea} m²
Chambres : ${bedrooms}
Salles d’eau / douches : ${bathrooms}
WC : ${toilets}
Cuisine(s) : ${kitchens}
Salon(s) / séjour(s) : ${living}

Base surface : ${euro(a.base)}
Ajustement configuration : ${euro(a.configurationExtra)}
Ménage courant : ${euro(a.rotationPrice)} / rotation${rotations>1?`
${rotations} rotations : ${euro(rotationTotal)}`:''}`;
  if(needsStrip && !stripArea){out+=`

Sol : ${floorType}, décapage demandé. Le décapage n’est PAS inclus dans le montant ci-dessus tant que la surface de sol à traiter n’est pas précisée. Base : ${heavy?'8,50':'6,50'} €/m². Indiquez-moi combien de m² de PVC doivent réellement être décapés.`;}
  else if(a.floorExtra){out+=`

Décapage ${floorType} : ${a.stripArea} m² × ${String(a.floorRate).replace('.',',')} €/m² = ${euro(a.floorExtra)} (ponctuel, une seule fois)
TOTAL INDICATIF : ${euro(rotationTotal+a.floorExtra)} HT.`;}
  else {out+=`

TOTAL INDICATIF : ${euro(rotationTotal)} HT.`;}
  out+=`

Ce calcul est déterministe : Gemini n’est pas autorisé à modifier les montants. Le devis final reste validé par Clean-Cité.${photoNote}`;
  return out;
}

function localFallbackReply(text, imageCount = 0) {
  const input = String(text || "").toLowerCase();
  const surface = parseSurface(text);
  const photoNote = imageCount
    ? ` J’ai bien reçu ${imageCount} photo${imageCount > 1 ? "s" : ""}, mais leur analyse IA détaillée est momentanément indisponible.`
    : "";

  if (/fin\s*(?:de\s*)?chantier|après\s*travaux|apres\s*travaux/.test(input)) {
    let rate = 0;
    let state = "";
    if (/très\s*sale|tres\s*sale|fortement\s*encrass|sale\s*important/.test(input)) { rate = 9; state = "très sale"; }
    else if (/léger|leger|peu\s*sale/.test(input)) { rate = 4.5; state = "léger"; }
    else if (/standard|moyen|moyenne|moyennement/.test(input)) { rate = 6; state = "standard"; }
    if (surface && rate) {
      const total = Math.max(surface * rate, 150);
      return `PRÉ-DEVIS INDICATIF — Fin de chantier\n\nSurface : ${surface} m²\nÉtat : ${state}\nBase : ${String(rate).replace('.', ',')} €/m²\nEstimation indicative : ${euro(total)} HT.\n\nLe prix définitif dépend notamment des déchets à évacuer, des vitrages, des accès et des finitions.${photoNote}\nPour affiner le devis, indiquez-moi la ville, les contraintes d’accès et votre téléphone.`;
    }
    return `Bien sûr. Pour préparer un pré-devis de fin de chantier, j’ai besoin de 3 informations :\n1. la surface en m² ;\n2. l’état du chantier (léger, standard ou très sale) ;\n3. la ville et les éventuels déchets/matériaux à évacuer.\n\nNos bases sont de 4,50 €/m² (léger), 6 €/m² (standard) et 9 €/m² (très sale), avec un minimum ponctuel de 150 €.${photoNote}`;
  }

  if (/chantier\s+en\s+cours|nettoyage\s+de\s+chantier\s+en\s+cours/.test(input)) {
    return `Pour un chantier en cours, la base Clean-Cité est de 28 € HT/heure par agent. Une journée type de 7 h revient à 196 € HT par agent.\n\nPour calculer votre pré-devis, indiquez-moi :\n1. le nombre d’agents par jour ;\n2. le nombre d’heures par jour (7 h par défaut) ;\n3. le nombre de jours prévus.${photoNote}`;
  }

  if (/bureau|locaux\s+professionnels?/.test(input)) {
    if (surface) {
      return `Pour ${surface} m² de bureaux :\n• intervention ponctuelle : dès 1,50 €/m², soit une base indicative de ${euro(Math.max(surface * 1.5, 150))} ;\n• entretien régulier : dès 1 €/m² par passage, soit ${euro(surface)} par passage avant ajustement selon la fréquence et les tâches.\n\nIndiquez-moi si vous souhaitez du ponctuel ou du régulier, la fréquence et la ville.${photoNote}`;
    }
    return `Pour les bureaux, Clean-Cité propose une base dès 1,50 €/m² en ponctuel et dès 1 €/m² par passage en entretien régulier.\n\nIndiquez-moi la surface, la ville et la fréquence souhaitée pour que je vous donne une estimation indicative.${photoNote}`;
  }

  if (/poubelle|bac(?:s)?/.test(input)) {
    return `Pour la sortie et rentrée des poubelles :\n• Starter : 79 €/mois — jusqu’à 4 bacs, 1 passage/semaine ;\n• Confort : 159 €/mois — jusqu’à 10 bacs, 2 passages/semaine ;\n• Premium : dès 249 €/mois — jusqu’à 15 bacs, 3 passages/semaine.\n\nIndiquez-moi le nombre de bacs, le nombre de passages par semaine et la ville pour vous orienter vers la bonne formule.${photoNote}`;
  }

  if (/airbnb|location courte|location saisonni|meubl[ée] touristique|rotation/.test(input)) {
    return buildAirbnbDeterministicReply(text,imageCount);
  }

  if (/terrasse|balcon|cour\b/.test(input)) {
    if (surface) {
      const dirty = /très\s*sale|tres\s*sale|très\s*encrass|tres\s*encrass|fortement\s*encrass/.test(input);
      const rate = dirty ? 6.5 : 4.9;
      return `Pour une terrasse/balcon de ${surface} m², la base indicative est de ${String(rate).replace('.', ',')} €/m², soit environ ${euro(Math.max(surface * rate, 150))} pour cette intervention ponctuelle${dirty ? " très encrassée" : " standard"}.\n\nIndiquez-moi la ville et si un nettoyage haute pression est possible.${photoNote}`;
    }
    return `Le nettoyage de terrasse démarre à 4,90 €/m², et à 6,50 €/m² pour une terrasse très encrassée. Indiquez-moi la surface, l’état, la ville et si l’accès à l’eau/haute pression est possible.${photoNote}`;
  }

  if (/vitre|vitrine|vitrage/.test(input)) {
    return `La vitrerie accessible démarre à 4 €/m², ou 6,50 €/m² pour une première intervention / vitrages très sales. La hauteur, la nacelle et les accès difficiles sont sur devis.\n\nIndiquez-moi la surface vitrée approximative, l’état, la hauteur et la ville.${photoNote}`;
  }

  if (/parties?\s+communes?|copropri[eé]t[eé]|immeuble/.test(input)) {
    return `L’entretien des parties communes démarre à 199 €/mois. Pour vous donner une estimation utile, indiquez-moi le nombre d’étages, de halls, la fréquence souhaitée, la présence d’un ascenseur/local poubelles et la ville.${photoNote}`;
  }

  if (/remise\s+en\s+[ée]tat|d[eé]crassage|d[eé]m[eé]nagement/.test(input)) {
    return `La remise en état démarre à 6,50 €/m², et à 8,50 €/m² pour un site très encrassé. Indiquez-moi la surface, l’état, la ville et les contraintes particulières pour obtenir une estimation indicative.${photoNote}`;
  }

  return `Je peux vous aider à préparer un pré-devis Clean-Cité. Indiquez-moi simplement : le type de nettoyage, la ville, la surface approximative et l’état du lieu. Pour un chantier en cours, ajoutez le nombre d’agents, les heures par jour et le nombre de jours.${photoNote}\n\nSi c’est urgent, vous pouvez aussi appeler ou écrire sur WhatsApp au 07 66 53 61 54.`;
}

async function callGemini(messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: COMPANY_CONTEXT }] },
          contents: messages,
          generationConfig: {
            temperature: 0.18,
            maxOutputTokens: 1800,
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      }
    );
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Méthode non autorisée." });
  }

  if (!process.env.GEMINI_API_KEY) {
    let payload = {};
    try { payload = JSON.parse(event.body || "{}"); } catch (_) {}
    const fallbackText = extractLastUserText(payload.messages, payload.message);
    const images = sanitizeImages(payload.images);
    return json(200, { reply: localFallbackReply(fallbackText, images.length), mode: "local-fallback" });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const message = String(payload.message || "").trim();
    const images = sanitizeImages(payload.images);
    const messages = normalizeMessages(payload.messages, message, images);

    if (!messages.length) {
      return json(400, { error: "Message ou photo manquante." });
    }

    const lastUserText = extractLastUserText(payload.messages, message);

    // Les prix Airbnb sont calculés par le moteur Clean-Cité, jamais par Gemini.
    if (/airbnb|location courte|location saisonni|meubl[ée] touristique|rotation/i.test(lastUserText)) {
      return json(200, { reply: buildAirbnbDeterministicReply(lastUserText, images.length), mode: "calculator", imagesProcessed: images.length });
    }

    const { response, data } = await callGemini(messages);

    if (!response.ok) {
      console.error("assistant-gemini-api", response.status, data?.error?.message || data);
      return json(200, {
        reply: localFallbackReply(lastUserText, images.length),
        mode: "local-fallback",
        imagesProcessed: images.length
      });
    }

    const candidate = data?.candidates?.[0] || null;
    const reply = candidate?.content?.parts
      ?.filter((part) => typeof part?.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim() || "";

    if (!reply) {
      console.error("assistant-gemini-empty", candidate?.finishReason || "INCONNU", data?.promptFeedback?.blockReason || "");
      return json(200, {
        reply: localFallbackReply(lastUserText, images.length),
        mode: "local-fallback",
        imagesProcessed: images.length
      });
    }

    return json(200, { reply, mode: "gemini", imagesProcessed: images.length });
  } catch (error) {
    console.error("assistant-gemini-server", error);
    let payload = {};
    try { payload = JSON.parse(event.body || "{}"); } catch (_) {}
    const fallbackText = extractLastUserText(payload.messages, payload.message);
    const images = sanitizeImages(payload.images);
    return json(200, {
      reply: localFallbackReply(fallbackText, images.length),
      mode: "local-fallback",
      imagesProcessed: images.length
    });
  }
};
