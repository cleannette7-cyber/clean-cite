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
- Nettoyage de fin de chantier
- Nettoyage de chantier en cours
- Remise en état après travaux, sinistre ou déménagement
- Vitrerie et vitrines
- Parties communes d'immeuble et copropriétés
- Sortie et rentrée de poubelles
- Nettoyage de tapis, canapés et terrasses

GRILLE TARIFAIRE CLEAN-CITÉ À UTILISER :
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

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Méthode non autorisée." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return json(200, {
      reply: "L'assistant IA Clean-Cité est bien installé mais Gemini n'est pas encore activé sur le serveur. Pour un devis, indiquez la ville, la surface, le type de nettoyage et votre téléphone. Vous pouvez aussi utiliser le devis rapide, WhatsApp ou appeler Clean-Cité au 07 66 53 61 54."
    });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const message = String(payload.message || "").trim();
    const images = sanitizeImages(payload.images);
    const messages = normalizeMessages(payload.messages, message, images);

    if (!messages.length) {
      return json(400, { error: "Message ou photo manquante." });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: COMPANY_CONTEXT }]
          },
          contents: messages,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1100
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return json(response.status, {
        error: "Erreur Gemini.",
        details: data
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim() ||
      "Je n'ai pas pu générer de réponse pour le moment. Vous pouvez contacter Clean-Cité au 07 66 53 61 54.";

    return json(200, { reply, imagesProcessed: images.length });
  } catch (error) {
    return json(500, {
      error: "Erreur serveur.",
      message: error.message
    });
  }
};
