const fs = require("fs");
const path = require("path");

const ADMIN_EMAIL = "cleannette7@gmail.com";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(payload)
  };
}

function loadPlanningFile() {
  const candidates = [
    path.join(process.cwd(), "data", "planning.json"),
    path.join(__dirname, "..", "..", "data", "planning.json"),
    path.join(__dirname, "data", "planning.json"),
    "/var/task/data/planning.json"
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.planning) ? parsed.planning : [];
      }
    } catch (error) {
      console.error("Erreur lecture planning", filePath, error.message);
    }
  }

  return [];
}

exports.handler = async function (event, context) {
  try {
    if (event.httpMethod !== "GET") {
      return jsonResponse(405, { error: "Méthode non autorisée." });
    }

    const user = context.clientContext && context.clientContext.user;

    if (!user || !user.email) {
      return jsonResponse(401, {
        error: "Connexion nécessaire.",
        message: "Connectez-vous à votre espace client Clean-Cité pour consulter votre planning."
      });
    }

    const email = normalizeEmail(user.email);
    const isAdmin = email === ADMIN_EMAIL;
    const allItems = loadPlanningFile()
      .filter(item => item && item.publier !== false)
      .map(item => ({
        date: item.date || "",
        heure: item.heure || "",
        type_prestation: item.type_prestation || "Intervention",
        ville: item.ville || "",
        statut: item.statut || "Prévu",
        note: item.note || "",
        client_nom: item.client_nom || item.client || "",
        client_email: normalizeEmail(item.client_email || item.email || "")
      }))
      .filter(item => Boolean(item.date));

    const planning = isAdmin
      ? allItems
      : allItems.filter(item => item.client_email === email);

    planning.sort((a, b) => String(a.date + a.heure).localeCompare(String(b.date + b.heure)));

    return jsonResponse(200, {
      email,
      isAdmin,
      planning,
      total: planning.length
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Erreur serveur.",
      details: error.message
    });
  }
};
