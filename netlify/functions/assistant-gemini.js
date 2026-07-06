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
- Zone : Bobigny, Seine-Saint-Denis, Paris, Île-de-France, 92, 93, 94, 95, 77, 91

Services :
- Nettoyage de bureaux et locaux professionnels
- Nettoyage de fin de chantier
- Nettoyage de chantier en cours
- Remise en état après travaux, sinistre ou déménagement
- Vitrerie et vitrines
- Parties communes d'immeuble et copropriétés
- Sortie de poubelles
- Nettoyage tapis, canapés, terrasses

Tarifs indicatifs à rappeler avec prudence :
- Bureaux : à partir de 3 €/m²
- Chantier / fin de chantier : à partir de 4,50 €/m²
- Remise en état : à partir de 8 €/m²
- Vitrerie : à partir de 2,50 €/m²
- Minimum d'intervention : 150 €

Ton rôle :
- Accueillir les clients avec un ton professionnel, clair et rassurant.
- Répondre aux questions sur les services et les zones d'intervention.
- Aider à préparer une demande de devis.
- Demander les informations manquantes : ville, surface, type de prestation, état du lieu, délai, fréquence, coordonnées.
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
    return json(500, {
      error: "Clé Gemini manquante.",
      message: "Ajoutez GEMINI_API_KEY dans les variables d'environnement Netlify."
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
            temperature: 0.35,
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
