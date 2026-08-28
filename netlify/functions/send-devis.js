const DEFAULT_EMAIL = process.env.CLEAN_CITE_EMAIL || "cleannette7@gmail.com";
const DEFAULT_PHONE = "07 66 53 61 54";

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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function displayValue(value, fallback = "Non renseigné") {
  return value === 0 || value ? String(value) : fallback;
}

function formatPayload(p) {
  const total = p.estimateText || (p.total && !Number.isNaN(Number(p.total)) ? `${Number(p.total).toFixed(2)} €` : "À confirmer");
  const extraLines = [];
  if (p.service === "chantier" || p.agents || p.workDays) {
    if (p.agents) extraLines.push(`Nombre d'agents : ${p.agents}`);
    if (p.hours) extraLines.push(`Heures par jour : ${p.hours} h`);
    if (p.workDays) extraLines.push(`Nombre de jours : ${p.workDays}`);
  } else if (p.hours) {
    extraLines.push(`Durée estimée : ${p.hours} h`);
  }
  if (p.bins) extraLines.push(`Nombre de bacs : ${p.bins}`);
  if (p.binPasses) extraLines.push(`Passages poubelles : ${p.binPasses} / semaine`);
  if (p.plan) extraLines.push(`Formule poubelles : ${p.plan}`);
  if (p.estimateDetail) extraLines.push(`Détail estimation : ${p.estimateDetail}`);
  if (p.photoCount) extraLines.push(`Photos analysées par l'IA : ${p.photoCount}`);

  const aiAnalysis = String(p.aiAnalysis || "").trim().slice(0, 4500);
  const aiText = aiAnalysis ? `\n\nAnalyse IA des photos :\n${aiAnalysis}` : "";
  const aiHtml = aiAnalysis ? `<h3 style="color:#8A6914">Analyse IA des photos</h3><p>${escapeHtml(aiAnalysis).replace(/\n/g, "<br>")}</p><p style="font-size:12px;color:#6b7280">Les photos ont été utilisées pour l'analyse IA dans l'assistant. Elles ne sont pas jointes automatiquement à cet email.</p>` : "";

  const extraText = extraLines.length ? `\n${extraLines.join("\n")}` : "";
  const extraHtml = extraLines.length
    ? extraLines.map((line) => `<p><strong>${escapeHtml(line.split(":")[0])} :</strong>${escapeHtml(line.includes(":") ? line.slice(line.indexOf(":") + 1) : "")}</p>`).join("")
    : "";

  return {
    subject: `Nouvelle demande de devis Clean-Cité - ${p.serviceLabel || "Nettoyage"}`,
    text: `Nouvelle demande de devis Clean-Cité\n\nNom / Société : ${p.name || "Non renseigné"}\nTéléphone : ${p.phone || "Non renseigné"}\nEmail : ${p.email || "Non renseigné"}\nVille / adresse : ${p.city || "Non renseigné"}\nService : ${p.serviceLabel || p.service || "Non renseigné"}\nSurface : ${p.surface ? `${p.surface} m²` : "Non applicable / non renseignée"}\nÉtat du lieu : ${p.condition || "Non renseigné"}\nFréquence : ${p.frequency || "Non renseignée"}\nEstimation indicative : ${total}${extraText}${aiText}\n\nMessage :\n${p.message || "Aucun message complémentaire"}\n\nImportant : cette estimation reste indicative et doit être confirmée par Clean-Cité.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2933">
        <h2 style="color:#8A6914">Nouvelle demande de devis Clean-Cité</h2>
        <p><strong>Nom / Société :</strong> ${escapeHtml(p.name || "Non renseigné")}</p>
        <p><strong>Téléphone :</strong> ${escapeHtml(p.phone || "Non renseigné")}</p>
        <p><strong>Email :</strong> ${escapeHtml(p.email || "Non renseigné")}</p>
        <p><strong>Ville / adresse :</strong> ${escapeHtml(p.city || "Non renseigné")}</p>
        <p><strong>Service :</strong> ${escapeHtml(p.serviceLabel || p.service || "Non renseigné")}</p>
        <p><strong>Surface :</strong> ${escapeHtml(p.surface ? `${p.surface} m²` : "Non applicable / non renseignée")}</p>
        <p><strong>État du lieu :</strong> ${escapeHtml(p.condition || "Non renseigné")}</p>
        <p><strong>Fréquence :</strong> ${escapeHtml(p.frequency || "Non renseignée")}</p>
        <p><strong>Estimation indicative :</strong> ${escapeHtml(total)}</p>
        ${extraHtml}
        ${aiHtml}
        <h3 style="color:#8A6914">Message</h3>
        <p>${escapeHtml(p.message || "Aucun message complémentaire").replace(/\n/g, "<br>")}</p>
        <p style="font-size:13px;color:#6b7280">Cette estimation reste indicative et doit être confirmée par Clean-Cité.</p>
      </div>
    `
  };
}

function buildMailto(payload) {
  const formatted = formatPayload(payload);
  return `mailto:${DEFAULT_EMAIL}?subject=${encodeURIComponent(formatted.subject)}&body=${encodeURIComponent(formatted.text)}`;
}

async function sendWithBrevo(payload) {
  const formatted = formatPayload(payload);
  const senderEmail = process.env.BREVO_SENDER_EMAIL || DEFAULT_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Clean-Cité";
  const recipients = [{ email: DEFAULT_EMAIL, name: "Clean-Cité" }];

  const customerEmail = String(payload.email || "").trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    recipients.push({ email: customerEmail, name: payload.name || "Client Clean-Cité" });
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: recipients,
      subject: formatted.subject,
      htmlContent: formatted.html,
      textContent: formatted.text,
      replyTo: customerEmail ? { email: customerEmail, name: payload.name || "Client Clean-Cité" } : undefined
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Erreur Brevo");
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Méthode non autorisée." });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");

    if (!payload.name && !payload.phone && !payload.email) {
      return json(400, { error: "Merci d'indiquer au moins un nom, un téléphone ou un email." });
    }

    if (!payload.service && !payload.serviceLabel) {
      return json(400, { error: "Merci de choisir un service." });
    }

    if (!process.env.BREVO_API_KEY) {
      return json(200, {
        sent: false,
        fallback: true,
        message: "Brevo n'est pas encore configuré. Ouverture de l'email manuel.",
        mailto: buildMailto(payload),
        phone: DEFAULT_PHONE
      });
    }

    const brevo = await sendWithBrevo(payload);
    return json(200, {
      sent: true,
      message: "Demande envoyée à Clean-Cité.",
      brevo
    });
  } catch (error) {
    return json(error.status || 500, {
      error: "Erreur lors de l'envoi.",
      message: error.message,
      details: error.details || null,
      mailto: buildMailto(payload)
    });
  }
};
