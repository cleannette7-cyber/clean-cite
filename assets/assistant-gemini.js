(function () {
  const WA_PHONE = "33766536154";
  const services = {
    bureaux: { label: "Nettoyage de bureaux", price: 3 },
    fin_chantier: { label: "Nettoyage fin de chantier", price: 4.5 },
    chantier: { label: "Nettoyage chantier en cours", price: 4.5 },
    remise_etat: { label: "Remise en état", price: 8 },
    vitrerie: { label: "Vitrerie / vitrines", price: 2.5 },
    parties_communes: { label: "Parties communes", price: 3 },
    sortie_poubelles: { label: "Sortie de poubelles", price: 0 },
    tapis_canapes: { label: "Tapis / canapés", price: 0 },
    terrasses: { label: "Terrasses", price: 0 }
  };

  const state = {
    messages: [
      {
        role: "assistant",
        content: "Bonjour, je suis l'assistant IA Clean-Cité. Je peux vous aider à choisir une prestation, estimer un tarif indicatif ou préparer une demande de devis."
      }
    ]
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function nl2br(value) {
    return escapeHtml(value).replace(/\n/g, "<br>");
  }

  function buildWidget() {
    const root = document.createElement("div");
    root.className = "ccai-root";
    root.innerHTML = `
      <button class="ccai-bubble" type="button" aria-label="Ouvrir l'assistant IA Clean-Cité">
        <span>✨</span><span>Assistant IA</span>
      </button>

      <section class="ccai-panel" aria-label="Assistant IA Clean-Cité">
        <div class="ccai-header">
          <div class="ccai-title">
            <span class="ccai-avatar">🤖</span>
            <div>Assistant IA Clean-Cité<small>Devis, questions, conseils et contact</small></div>
          </div>
          <button class="ccai-close" type="button" aria-label="Fermer">×</button>
        </div>

        <div class="ccai-tabs">
          <button class="ccai-tab active" type="button" data-view="chat">Discussion</button>
          <button class="ccai-tab" type="button" data-view="devis">Devis rapide</button>
        </div>

        <div class="ccai-body">
          <div class="ccai-view active" data-panel="chat">
            <div class="ccai-messages" id="ccai-messages"></div>
            <div class="ccai-quick">
              <button class="ccai-chip" type="button" data-q="J'ai besoin d'un nettoyage de fin de chantier à Bobigny.">Fin de chantier</button>
              <button class="ccai-chip" type="button" data-q="Combien coûte un nettoyage de bureaux ?">Tarifs bureaux</button>
              <button class="ccai-chip" type="button" data-q="Intervenez-vous en Île-de-France ?">Zone intervention</button>
            </div>
            <div class="ccai-chatbar">
              <input class="ccai-input" id="ccai-input" type="text" placeholder="Écrivez votre demande...">
              <button class="ccai-send" type="button" id="ccai-send">Envoyer</button>
            </div>
            <p class="ccai-note">L'assistant donne des estimations indicatives. Le devis final est confirmé par l'équipe Clean-Cité.</p>
          </div>

          <div class="ccai-view" data-panel="devis">
            <form class="ccai-form" id="ccai-form">
              <div class="ccai-field">
                <label for="ccai-service">Type de prestation</label>
                <select class="ccai-select" id="ccai-service" required>
                  <option value="fin_chantier">Nettoyage fin de chantier</option>
                  <option value="chantier">Nettoyage chantier en cours</option>
                  <option value="bureaux">Nettoyage de bureaux</option>
                  <option value="remise_etat">Remise en état</option>
                  <option value="vitrerie">Vitrerie / vitrines</option>
                  <option value="parties_communes">Parties communes</option>
                  <option value="sortie_poubelles">Sortie de poubelles</option>
                  <option value="tapis_canapes">Tapis / canapés</option>
                  <option value="terrasses">Terrasses</option>
                </select>
              </div>

              <div class="ccai-grid2">
                <div class="ccai-field">
                  <label for="ccai-surface">Surface en m²</label>
                  <input class="ccai-input" id="ccai-surface" type="number" min="1" placeholder="Ex : 120">
                </div>
                <div class="ccai-field">
                  <label for="ccai-city">Ville</label>
                  <input class="ccai-input" id="ccai-city" type="text" placeholder="Ex : Bobigny">
                </div>
              </div>

              <div class="ccai-grid2">
                <div class="ccai-field">
                  <label for="ccai-condition">État du lieu</label>
                  <select class="ccai-select" id="ccai-condition">
                    <option>Légèrement sale</option>
                    <option selected>Moyennement sale</option>
                    <option>Très sale</option>
                    <option>Après travaux</option>
                  </select>
                </div>
                <div class="ccai-field">
                  <label for="ccai-frequency">Fréquence</label>
                  <select class="ccai-select" id="ccai-frequency">
                    <option>Une seule intervention</option>
                    <option>Chaque semaine</option>
                    <option>Plusieurs fois par semaine</option>
                    <option>Chaque mois</option>
                  </select>
                </div>
              </div>

              <div class="ccai-estimate" id="ccai-estimate">
                Estimation indicative : <strong>à calculer</strong><br>
                <small>Minimum d'intervention : 150 €.</small>
              </div>

              <div class="ccai-grid2">
                <div class="ccai-field">
                  <label for="ccai-name">Nom / société</label>
                  <input class="ccai-input" id="ccai-name" type="text" placeholder="Votre nom">
                </div>
                <div class="ccai-field">
                  <label for="ccai-phone">Téléphone</label>
                  <input class="ccai-input" id="ccai-phone" type="tel" placeholder="Votre téléphone">
                </div>
              </div>

              <div class="ccai-field">
                <label for="ccai-email">Email</label>
                <input class="ccai-input" id="ccai-email" type="email" placeholder="Votre email">
              </div>

              <div class="ccai-field">
                <label for="ccai-extra">Informations complémentaires</label>
                <textarea class="ccai-textarea" id="ccai-extra" placeholder="Décrivez brièvement le lieu, l'urgence, les contraintes..."></textarea>
              </div>

              <div class="ccai-status" id="ccai-status"></div>

              <div class="ccai-actions">
                <button class="ccai-btn orange" type="submit">Envoyer la demande par email</button>
                <a class="ccai-btn blue" id="ccai-whatsapp" href="#" target="_blank" rel="noopener">Envoyer sur WhatsApp</a>
                <button class="ccai-btn light" type="button" id="ccai-ask-ai">Demander conseil à l'IA</button>
              </div>
            </form>
            <p class="ccai-note">L'envoi email automatique fonctionne dès que les variables Brevo sont ajoutées dans Netlify. Sans Brevo, le site ouvre un email manuel prêt à envoyer.</p>
          </div>
        </div>
      </section>
    `;
    document.body.appendChild(root);
    return root;
  }

  function renderMessages(root) {
    const box = root.querySelector("#ccai-messages");
    if (!box) return;
    box.innerHTML = state.messages
      .map((m) => `<div class="ccai-msg ${m.role === "user" ? "user" : "assistant"}"><div>${nl2br(m.content)}</div></div>`)
      .join("");
    box.scrollTop = box.scrollHeight;
  }

  async function sendChat(root, forcedText) {
    const input = root.querySelector("#ccai-input");
    const text = String(forcedText || input.value || "").trim();
    if (!text) return;
    if (input) input.value = "";

    state.messages.push({ role: "user", content: text });
    state.messages.push({ role: "assistant", content: "Je prépare ma réponse..." });
    renderMessages(root);

    try {
      const response = await fetch("/.netlify/functions/assistant-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          messages: state.messages.filter((m) => m.content !== "Je prépare ma réponse...").slice(-10)
        })
      });
      const data = await response.json();
      state.messages.pop();
      state.messages.push({ role: "assistant", content: data.reply || data.message || "Je n'ai pas pu répondre pour le moment." });
    } catch (error) {
      state.messages.pop();
      state.messages.push({ role: "assistant", content: "Impossible de joindre l'assistant pour le moment. Vous pouvez contacter Clean-Cité au 07 66 53 61 54." });
    }
    renderMessages(root);
  }

  function getEstimatePayload(root) {
    const service = root.querySelector("#ccai-service").value;
    const surface = Number(root.querySelector("#ccai-surface").value || 0);
    const selected = services[service] || services.fin_chantier;
    let total = null;

    if (selected.price > 0 && surface > 0) {
      total = Math.max(surface * selected.price, 150);
    }

    return {
      service,
      serviceLabel: selected.label,
      price: selected.price,
      surface,
      city: root.querySelector("#ccai-city").value.trim(),
      condition: root.querySelector("#ccai-condition").value,
      frequency: root.querySelector("#ccai-frequency").value,
      name: root.querySelector("#ccai-name").value.trim(),
      phone: root.querySelector("#ccai-phone").value.trim(),
      email: root.querySelector("#ccai-email").value.trim(),
      message: root.querySelector("#ccai-extra").value.trim(),
      total
    };
  }

  function updateEstimate(root) {
    const payload = getEstimatePayload(root);
    const estimate = root.querySelector("#ccai-estimate");
    const whatsapp = root.querySelector("#ccai-whatsapp");
    let estimateText = "Sur devis";
    let detail = "Cette prestation nécessite une validation par l'équipe Clean-Cité.";

    if (payload.total !== null) {
      estimateText = `${payload.total.toFixed(2)} €`;
      detail = `${payload.surface} m² × ${payload.price} €/m². Minimum d'intervention : 150 €.`;
    }

    estimate.innerHTML = `Estimation indicative : <strong>${escapeHtml(estimateText)}</strong><br><small>${escapeHtml(detail)}</small>`;

    const waMessage = `Bonjour Clean-Cité, je souhaite recevoir un devis.\n\nService : ${payload.serviceLabel}\nSurface : ${payload.surface || "non précisée"} m²\nVille : ${payload.city || "non précisée"}\nÉtat du lieu : ${payload.condition}\nFréquence : ${payload.frequency}\nEstimation indicative : ${estimateText}\nNom : ${payload.name || "non renseigné"}\nTéléphone : ${payload.phone || "non renseigné"}\nEmail : ${payload.email || "non renseigné"}\nMessage : ${payload.message || "aucun"}`;
    whatsapp.href = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(waMessage)}`;
  }

  function showStatus(root, type, message) {
    const status = root.querySelector("#ccai-status");
    status.className = `ccai-status ${type}`;
    status.textContent = message;
  }

  async function submitLead(root) {
    const payload = getEstimatePayload(root);
    if (!payload.name && !payload.phone && !payload.email) {
      showStatus(root, "err", "Merci d'indiquer au moins un nom, un téléphone ou un email.");
      return;
    }

    showStatus(root, "ok", "Envoi de la demande en cours...");

    try {
      const response = await fetch("/.netlify/functions/send-devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.fallback && data.mailto) {
        showStatus(root, "ok", "Brevo n'est pas encore configuré : ouverture d'un email prêt à envoyer.");
        window.location.href = data.mailto;
        return;
      }
      if (!response.ok || !data.sent) {
        throw new Error(data.message || data.error || "Envoi impossible.");
      }
      showStatus(root, "ok", "Demande envoyée. Clean-Cité pourra vous recontacter rapidement.");
    } catch (error) {
      showStatus(root, "err", "L'envoi automatique a échoué. Utilisez le bouton WhatsApp ou réessayez plus tard.");
    }
  }

  function switchView(root, view) {
    root.querySelectorAll(".ccai-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
    root.querySelectorAll(".ccai-view").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === view));
  }

  function init() {
    if (document.querySelector(".ccai-root")) return;
    const root = buildWidget();
    renderMessages(root);
    updateEstimate(root);

    root.querySelector(".ccai-bubble").addEventListener("click", () => root.classList.toggle("open"));
    root.querySelector(".ccai-close").addEventListener("click", () => root.classList.remove("open"));
    root.querySelectorAll(".ccai-tab").forEach((btn) => btn.addEventListener("click", () => switchView(root, btn.dataset.view)));
    root.querySelector("#ccai-send").addEventListener("click", () => sendChat(root));
    root.querySelector("#ccai-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendChat(root);
    });
    root.querySelectorAll(".ccai-chip").forEach((btn) => btn.addEventListener("click", () => sendChat(root, btn.dataset.q)));
    root.querySelectorAll("#ccai-service,#ccai-surface,#ccai-city,#ccai-condition,#ccai-frequency,#ccai-name,#ccai-phone,#ccai-email,#ccai-extra").forEach((field) => {
      field.addEventListener("input", () => updateEstimate(root));
      field.addEventListener("change", () => updateEstimate(root));
    });
    root.querySelector("#ccai-form").addEventListener("submit", (e) => {
      e.preventDefault();
      updateEstimate(root);
      submitLead(root);
    });
    root.querySelector("#ccai-ask-ai").addEventListener("click", () => {
      const p = getEstimatePayload(root);
      switchView(root, "chat");
      sendChat(root, `Peux-tu me conseiller pour cette demande ? Service : ${p.serviceLabel}, surface : ${p.surface || "non précisée"} m², ville : ${p.city || "non précisée"}, état : ${p.condition}, fréquence : ${p.frequency}. ${p.message || ""}`);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
