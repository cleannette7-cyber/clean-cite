const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
- Chantier en cours : 28 € HT/heure. Pour une intervention ponctuelle, le minimum de 150 € peut s'appliquer ; les contrats récurrents sont confirmés sur devis.
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
- Pour un chantier en cours, demande le nombre d'heures estimées ou propose un devis si la durée est inconnue.
- Pour les poubelles, demande le nombre de bacs et le nombre de passages par semaine afin d'orienter vers Starter, Confort, Premium ou un devis personnalisé.
- Pour les parties communes, indique « dès 199 €/mois » et demande le nombre d'étages, halls, passages/semaine et présence d'un local poubelles.
- Ne présente jamais une estimation comme un prix ferme.

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

function normalizeMessages(messages, fallbackMessage) {
  const inputMessages = Array.isArray(messages) && messages.length
    ? messages
    : [{ role: "user", content: fallbackMessage || "Bonjour" }];

  return inputMessages
    .slice(-12)
    .map((msg) => {
      const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
      const text = String(msg.content || "").slice(0, 2000);
      return {
        role,
        parts: [{ text }]
      };
    })
    .filter((msg) => msg.parts[0].text.trim().length > 0);
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
    const messages = normalizeMessages(payload.messages, message);

    if (!messages.length) {
      return json(400, { error: "Message manquant." });
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
            temperature: 0.25,
            maxOutputTokens: 700
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

    return json(200, { reply });
  } catch (error) {
    return json(500, {
      error: "Erreur serveur.",
      message: error.message
    });
  }
};
