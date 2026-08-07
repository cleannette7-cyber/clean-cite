(function () {
  const WA_PHONE = "33766536154";

  const services = {
    bureaux: { label: "Nettoyage de bureaux", type: "office" },
    fin_chantier: { label: "Nettoyage fin de chantier", type: "surface_state" },
    chantier: { label: "Nettoyage chantier en cours", type: "hourly" },
    remise_etat: { label: "Remise en état", type: "restoration" },
    vitrerie: { label: "Vitrerie / vitrines", type: "glass" },
    parties_communes: { label: "Parties communes", type: "monthly", monthly: 199 },
    sortie_poubelles: { label: "Sortie et rentrée de poubelles", type: "bins" },
    tapis_canapes: { label: "Tapis / canapés", type: "quote" },
    terrasses: { label: "Terrasses", type: "terrace" }
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

  function money(value) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2
    }).format(value);
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
              <button class="ccai-chip" type="button" data-q="Combien coûte un nettoyage de bureaux ponctuel et régulier ?">Tarifs bureaux</button>
              <button class="ccai-chip" type="button" data-q="Quels sont vos forfaits de sortie et rentrée de poubelles ?">Poubelles</button>
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
                  <option value="sortie_poubelles">Sortie et rentrée de poubelles</option>
                  <option value="tapis_canapes">Tapis / canapés</option>
                  <option value="terrasses">Terrasses</option>
                </select>
              </div>

              <div class="ccai-grid2">
                <div class="ccai-field" id="ccai-surface-wrap">
                  <label for="ccai-surface">Surface en m²</label>
                  <input class="ccai-input" id="ccai-surface" type="number" min="1" placeholder="Ex : 120">
                </div>
                <div class="ccai-field">
                  <label for="ccai-city">Ville</label>
                  <input class="ccai-input" id="ccai-city" type="text" placeholder="Ex : Bobigny">
                </div>
              </div>

              <div class="ccai-grid2">
                <div class="ccai-field" id="ccai-condition-wrap">
                  <label for="ccai-condition">État du lieu</label>
                  <select class="ccai-select" id="ccai-condition">
                    <option value="light">Légèrement sale</option>
                    <option value="standard" selected>Moyennement sale</option>
                    <option value="dirty">Très sale</option>
                    <option value="after_work">Après travaux</option>
                  </select>
                </div>
                <div class="ccai-field" id="ccai-frequency-wrap">
                  <label for="ccai-frequency">Fréquence</label>
                  <select class="ccai-select" id="ccai-frequency">
                    <option value="once">Une seule intervention</option>
                    <option value="weekly">Chaque semaine</option>
                    <option value="multi_week">Plusieurs fois par semaine</option>
                    <option value="monthly">Chaque mois</option>
                  </select>
                </div>
              </div>

              <div class="ccai-grid2" id="ccai-hourly-row" style="display:none">
                <div class="ccai-field">
                  <label for="ccai-hours">Heures estimées / passage</label>
                  <input class="ccai-input" id="ccai-hours" type="number" min="1" step="0.5" value="4">
                </div>
                <div class="ccai-field">
                  <label>Base chantier</label>
                  <input class="ccai-input" value="28 € HT / heure" disabled>
                </div>
              </div>

              <div class="ccai-grid2" id="ccai-bins-row" style="display:none">
                <div class="ccai-field">
                  <label for="ccai-bins">Nombre de bacs</label>
                  <input class="ccai-input" id="ccai-bins" type="number" min="1" value="4">
                </div>
                <div class="ccai-field">
                  <label for="ccai-bin-passes">Passages / semaine</label>
                  <input class="ccai-input" id="ccai-bin-passes" type="number" min="1" value="1">
                </div>
              </div>

              <div class="ccai-estimate" id="ccai-estimate">
                Estimation indicative : <strong>à calculer</strong><br>
                <small>Les tarifs sont confirmés par Clean-Cité selon les contraintes réelles du site.</small>
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

  function getConditionLabel(value) {
    return {
      light: "Légèrement sale",
      standard: "Moyennement sale",
      dirty: "Très sale",
      after_work: "Après travaux"
    }[value] || value;
  }

  function getFrequencyLabel(value) {
    return {
      once: "Une seule intervention",
      weekly: "Chaque semaine",
      multi_week: "Plusieurs fois par semaine",
      monthly: "Chaque mois"
    }[value] || value;
  }

  function getEstimatePayload(root) {
    const service = root.querySelector("#ccai-service").value;
    const selected = services[service] || services.fin_chantier;
    const surface = Number(root.querySelector("#ccai-surface").value || 0);
    const conditionCode = root.querySelector("#ccai-condition").value;
    const frequencyCode = root.querySelector("#ccai-frequency").value;
    const hours = Math.max(0, Number(root.querySelector("#ccai-hours").value || 0));
    const bins = Math.max(0, Number(root.querySelector("#ccai-bins").value || 0));
    const binPasses = Math.max(0, Number(root.querySelector("#ccai-bin-passes").value || 0));

    let total = null;
    let estimateText = "Sur devis";
    let detail = "Cette prestation nécessite une validation par l'équipe Clean-Cité.";
    let rate = null;
    let billingUnit = "";
    let plan = "";

    if (selected.type === "office" && surface > 0) {
      if (frequencyCode === "once") {
        rate = 1.5;
        total = Math.max(surface * rate, 150);
        billingUnit = "intervention ponctuelle";
        estimateText = money(total);
        detail = `${surface} m² × 1,50 €/m². Minimum ponctuel de 150 € appliqué si nécessaire.`;
      } else {
        rate = 1;
        total = surface * rate;
        billingUnit = "par passage";
        estimateText = `${money(total)} / passage`;
        detail = `${surface} m² × 1 €/m² par passage. Contrat régulier : devis final selon la fréquence et les tâches.`;
      }
    }

    if (selected.type === "surface_state" && surface > 0) {
      rate = conditionCode === "light" ? 4.5 : conditionCode === "dirty" ? 9 : 6;
      total = Math.max(surface * rate, 150);
      billingUnit = "intervention";
      estimateText = money(total);
      detail = `${surface} m² × ${String(rate).replace(".", ",")} €/m² (${getConditionLabel(conditionCode)}). Minimum ponctuel de 150 € si nécessaire.`;
    }

    if (selected.type === "hourly" && hours > 0) {
      rate = 28;
      const raw = hours * rate;
      total = frequencyCode === "once" ? Math.max(raw, 150) : raw;
      billingUnit = frequencyCode === "once" ? "intervention" : "par passage";
      estimateText = frequencyCode === "once" ? money(total) : `${money(total)} / passage`;
      detail = `${hours} h × 28 € HT/h${frequencyCode === "once" ? ". Minimum ponctuel de 150 € si nécessaire." : " par passage. Contrat final sur devis."}`;
    }

    if (selected.type === "restoration" && surface > 0) {
      rate = conditionCode === "dirty" ? 8.5 : 6.5;
      total = Math.max(surface * rate, 150);
      billingUnit = "intervention";
      estimateText = money(total);
      detail = `${surface} m² × ${String(rate).replace(".", ",")} €/m². Décapage lourd ou accès complexe : sur devis.`;
    }

    if (selected.type === "glass" && surface > 0) {
      rate = conditionCode === "dirty" ? 6.5 : 4;
      total = Math.max(surface * rate, 150);
      billingUnit = "intervention";
      estimateText = money(total);
      detail = `${surface} m² × ${String(rate).replace(".", ",")} €/m². Hauteur, nacelle ou accès difficile : sur devis.`;
    }

    if (selected.type === "terrace" && surface > 0) {
      rate = conditionCode === "dirty" ? 6.5 : 4.9;
      total = Math.max(surface * rate, 150);
      billingUnit = "intervention";
      estimateText = money(total);
      detail = `${surface} m² × ${String(rate).replace(".", ",")} €/m². Cas complexe : sur devis.`;
    }

    if (selected.type === "monthly") {
      total = selected.monthly;
      billingUnit = "par mois";
      estimateText = `dès ${money(total)} / mois`;
      detail = "Parties communes : base dès 199 €/mois. Le devis dépend du nombre d'étages, halls, passages et tâches.";
    }

    if (selected.type === "bins") {
      if (bins > 0 && binPasses > 0) {
        if (bins <= 4 && binPasses <= 1) {
          total = 79;
          plan = "Starter";
          detail = "Starter : jusqu'à 4 bacs, 1 passage/semaine, sortie et rentrée, rapport mensuel.";
        } else if (bins <= 10 && binPasses <= 2) {
          total = 159;
          plan = "Confort";
          detail = "Confort : jusqu'à 10 bacs, 2 passages/semaine, nettoyage des bacs 1×/mois, rapport mensuel.";
        } else if (bins <= 15 && binPasses <= 3) {
          total = 249;
          plan = "Premium";
          detail = "Premium : jusqu'à 15 bacs, 3 passages/semaine, nettoyage des bacs 2×/mois, rapport détaillé.";
        } else {
          total = null;
          plan = "Sur devis";
          detail = "Plus de 15 bacs, plus de 3 passages/semaine ou besoin particulier : devis personnalisé.";
        }
        billingUnit = "par mois";
        estimateText = total === null ? "Sur devis" : `${plan} — ${money(total)} / mois`;
      } else {
        detail = "Indiquez le nombre de bacs et de passages par semaine pour choisir Starter, Confort ou Premium.";
      }
    }

    return {
      service,
      serviceLabel: selected.label,
      surface,
      city: root.querySelector("#ccai-city").value.trim(),
      condition: getConditionLabel(conditionCode),
      conditionCode,
      frequency: getFrequencyLabel(frequencyCode),
      frequencyCode,
      hours,
      bins,
      binPasses,
      name: root.querySelector("#ccai-name").value.trim(),
      phone: root.querySelector("#ccai-phone").value.trim(),
      email: root.querySelector("#ccai-email").value.trim(),
      message: root.querySelector("#ccai-extra").value.trim(),
      rate,
      billingUnit,
      plan,
      total,
      estimateText,
      estimateDetail: detail
    };
  }

  function updateDynamicFields(root) {
    const service = root.querySelector("#ccai-service").value;
    const selected = services[service] || services.fin_chantier;
    const surfaceWrap = root.querySelector("#ccai-surface-wrap");
    const conditionWrap = root.querySelector("#ccai-condition-wrap");
    const frequencyWrap = root.querySelector("#ccai-frequency-wrap");
    const hourlyRow = root.querySelector("#ccai-hourly-row");
    const binsRow = root.querySelector("#ccai-bins-row");

    const needsSurface = ["office", "surface_state", "restoration", "glass", "terrace"].includes(selected.type);
    const needsCondition = ["surface_state", "restoration", "glass", "terrace"].includes(selected.type);
    const needsFrequency = ["office", "hourly"].includes(selected.type);

    surfaceWrap.style.display = needsSurface ? "block" : "none";
    conditionWrap.style.display = needsCondition ? "block" : "none";
    frequencyWrap.style.display = needsFrequency ? "block" : "none";
    hourlyRow.style.display = selected.type === "hourly" ? "grid" : "none";
    binsRow.style.display = selected.type === "bins" ? "grid" : "none";
  }

  function updateEstimate(root) {
    updateDynamicFields(root);
    const payload = getEstimatePayload(root);
    const estimate = root.querySelector("#ccai-estimate");
    const whatsapp = root.querySelector("#ccai-whatsapp");

    estimate.innerHTML = `Estimation indicative : <strong>${escapeHtml(payload.estimateText)}</strong><br><small>${escapeHtml(payload.estimateDetail)}</small>`;

    const extras = [];
    if (payload.surface) extras.push(`Surface : ${payload.surface} m²`);
    if (payload.hours && payload.service === "chantier") extras.push(`Durée estimée : ${payload.hours} h / passage`);
    if (payload.bins && payload.service === "sortie_poubelles") extras.push(`Bacs : ${payload.bins}`);
    if (payload.binPasses && payload.service === "sortie_poubelles") extras.push(`Passages : ${payload.binPasses} / semaine`);
    if (payload.plan) extras.push(`Formule : ${payload.plan}`);

    const waMessage = `Bonjour Clean-Cité, je souhaite recevoir un devis.\n\nService : ${payload.serviceLabel}\n${extras.length ? extras.join("\n") + "\n" : ""}Ville : ${payload.city || "non précisée"}\nÉtat du lieu : ${payload.condition || "non précisé"}\nFréquence : ${payload.frequency || "non précisée"}\nEstimation indicative : ${payload.estimateText}\nDétail : ${payload.estimateDetail}\nNom : ${payload.name || "non renseigné"}\nTéléphone : ${payload.phone || "non renseigné"}\nEmail : ${payload.email || "non renseigné"}\nMessage : ${payload.message || "aucun"}`;
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
    updateDynamicFields(root);
    updateEstimate(root);

    root.querySelector(".ccai-bubble").addEventListener("click", () => root.classList.toggle("open"));
    root.querySelector(".ccai-close").addEventListener("click", () => root.classList.remove("open"));
    root.querySelectorAll(".ccai-tab").forEach((btn) => btn.addEventListener("click", () => switchView(root, btn.dataset.view)));
    root.querySelector("#ccai-send").addEventListener("click", () => sendChat(root));
    root.querySelector("#ccai-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendChat(root);
    });
    root.querySelectorAll(".ccai-chip").forEach((btn) => btn.addEventListener("click", () => sendChat(root, btn.dataset.q)));
    root.querySelectorAll("#ccai-service,#ccai-surface,#ccai-city,#ccai-condition,#ccai-frequency,#ccai-hours,#ccai-bins,#ccai-bin-passes,#ccai-name,#ccai-phone,#ccai-email,#ccai-extra").forEach((field) => {
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
      const details = [
        `Service : ${p.serviceLabel}`,
        p.surface ? `surface : ${p.surface} m²` : "",
        p.hours && p.service === "chantier" ? `durée : ${p.hours} h/passage` : "",
        p.bins && p.service === "sortie_poubelles" ? `bacs : ${p.bins}` : "",
        p.binPasses && p.service === "sortie_poubelles" ? `passages : ${p.binPasses}/semaine` : "",
        `ville : ${p.city || "non précisée"}`,
        `état : ${p.condition || "non précisé"}`,
        `fréquence : ${p.frequency || "non précisée"}`,
        `estimation : ${p.estimateText}`,
        p.message || ""
      ].filter(Boolean).join(", ");
      sendChat(root, `Peux-tu me conseiller pour cette demande ? ${details}`);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
