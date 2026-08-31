(function () {
  const WA_PHONE = "33766536154";
  const MAX_PHOTOS = 4;
  const MAX_PHOTO_BASE64_CHARS = 650000;
  const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

  const services = {
    bureaux: { label: "Nettoyage de bureaux", type: "office" },
    airbnb: { label: "Airbnb / location courte durée", type: "airbnb" },
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
        content: "Bonjour, je suis Gemini, l'assistance intelligente de Clean-Cité. Je peux vous aider à choisir une prestation, estimer un tarif indicatif ou préparer une demande de devis. Vous pouvez me parler avec le micro et m'envoyer des photos du lieu pour affiner l'analyse."
      }
    ],
    voiceReplies: true,
    recognition: null,
    listening: false,
    pendingVoiceText: "",
    photos: [],
    lastPhotoAnalysis: "",
    lastPhotoCount: 0
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
        <span>✨</span><span class="ccai-bubble-brand"><strong>Gemini</strong><small>Assistance intelligente</small></span>
      </button>

      <section class="ccai-panel" aria-label="Assistant IA Clean-Cité">
        <div class="ccai-header">
          <div class="ccai-title">
            <span class="ccai-avatar">🤖</span>
            <div>Gemini · Assistant IA Clean-Cité<small>Assistance intelligente pour devis, photos, micro et questions</small><span class="ccai-engine-status" id="ccai-engine-status">Gemini prêt</span></div>
          </div>
          <div class="ccai-header-actions">
            <button class="ccai-voice-toggle active" type="button" id="ccai-voice-toggle" aria-label="Désactiver les réponses vocales" aria-pressed="true" title="Réponses vocales activées">🔊</button>
            <button class="ccai-close" type="button" aria-label="Fermer">×</button>
          </div>
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
              <button class="ccai-chip" type="button" data-q="Combien coûte un ménage Airbnb entre deux voyageurs ?">Airbnb</button>
              <button class="ccai-chip" type="button" data-q="Combien coûte un nettoyage de bureaux ponctuel et régulier ?">Tarifs bureaux</button>
              <button class="ccai-chip" type="button" data-q="Quels sont vos forfaits de sortie et rentrée de poubelles ?">Poubelles</button>
              <button class="ccai-chip" type="button" data-q="Intervenez-vous en Île-de-France ?">Zone intervention</button>
            </div>
            <div class="ccai-photo-tools">
              <input class="ccai-photo-input" id="ccai-photo-gallery-chat" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>
              <input class="ccai-photo-input" id="ccai-photo-camera-chat" type="file" accept="image/*" capture="environment" hidden>
              <button class="ccai-photo-btn" type="button" data-photo-open="ccai-photo-gallery-chat">📷 Ajouter des photos</button>
              <button class="ccai-photo-btn" type="button" data-photo-open="ccai-photo-camera-chat">📸 Prendre une photo</button>
              <span class="ccai-photo-count" data-photo-count>0/${MAX_PHOTOS}</span>
            </div>
            <div class="ccai-photo-previews" data-photo-previews></div>
            <p class="ccai-photo-status" data-photo-status>Ajoutez jusqu'à ${MAX_PHOTOS} photos. Elles sont redimensionnées avant l'analyse.</p>
            <div class="ccai-chatbar">
              <input class="ccai-input" id="ccai-input" type="text" placeholder="Écrivez, dictez ou ajoutez des photos...">
              <button class="ccai-mic" type="button" id="ccai-mic" aria-label="Parler à l'assistant" title="Parler à l'assistant">🎙️</button>
              <button class="ccai-send" type="button" id="ccai-send">Envoyer</button>
            </div>
            <p class="ccai-voice-status" id="ccai-voice-status">🎙️ Appuyez sur le micro pour parler. Votre navigateur demandera l'autorisation la première fois.</p>
            <p class="ccai-note">Les photos servent à mieux évaluer l'état visible du lieu. L'IA ne déduit pas une surface exacte à partir d'une image et le devis final reste confirmé par Clean-Cité.</p>
          </div>

          <div class="ccai-view" data-panel="devis">
            <form class="ccai-form" id="ccai-form">
              <div class="ccai-field">
                <label for="ccai-service">Type de prestation</label>
                <select class="ccai-select" id="ccai-service" required>
                  <option value="fin_chantier">Nettoyage fin de chantier</option>
                  <option value="chantier">Nettoyage chantier en cours</option>
                  <option value="bureaux">Nettoyage de bureaux</option>
                  <option value="airbnb">Airbnb / location courte durée</option>
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

              <div class="ccai-worksite-grid" id="ccai-hourly-row" style="display:none">
                <div class="ccai-field">
                  <label for="ccai-agents">Agents / jour</label>
                  <input class="ccai-input" id="ccai-agents" type="number" min="1" step="1" value="1">
                </div>
                <div class="ccai-field">
                  <label for="ccai-hours">Heures / jour</label>
                  <input class="ccai-input" id="ccai-hours" type="number" min="1" max="24" step="0.5" value="7">
                </div>
                <div class="ccai-field">
                  <label for="ccai-workdays">Nombre de jours</label>
                  <input class="ccai-input" id="ccai-workdays" type="number" min="1" step="1" value="1">
                </div>
                <div class="ccai-worksite-note">Base : <strong>28 € HT/h par agent</strong> · journée type 7 h = <strong>196 € HT / agent / jour</strong>.</div>
              </div>

              <div class="ccai-worksite-grid" id="ccai-airbnb-row" style="display:none">
                <div class="ccai-field"><label for="ccai-airbnb-levels">Niveaux</label><input class="ccai-input" id="ccai-airbnb-levels" type="number" min="1" value="1"></div>
                <div class="ccai-field"><label for="ccai-airbnb-bedrooms">Chambres</label><input class="ccai-input" id="ccai-airbnb-bedrooms" type="number" min="0" value="1"></div>
                <div class="ccai-field"><label for="ccai-airbnb-bathrooms">Salles d’eau / douches</label><input class="ccai-input" id="ccai-airbnb-bathrooms" type="number" min="0" value="1"></div>
                <div class="ccai-field"><label for="ccai-airbnb-toilets">WC</label><input class="ccai-input" id="ccai-airbnb-toilets" type="number" min="0" value="1"></div>
                <div class="ccai-field"><label for="ccai-airbnb-kitchens">Cuisines</label><input class="ccai-input" id="ccai-airbnb-kitchens" type="number" min="0" value="1"></div>
                <div class="ccai-field"><label for="ccai-airbnb-living">Salons / séjours</label><input class="ccai-input" id="ccai-airbnb-living" type="number" min="0" value="1"></div>
                <div class="ccai-field"><label for="ccai-airbnb-rotations">Rotations à chiffrer</label><input class="ccai-input" id="ccai-airbnb-rotations" type="number" min="1" value="1"></div>
                <div class="ccai-worksite-note">Le calcul Airbnb combine <strong>surface + configuration réelle</strong> du logement. Le tarif reste indicatif jusqu’à validation Clean-Cité.</div>
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

              <div class="ccai-photo-box">
                <div class="ccai-photo-box-title"><strong>Photos pour l'analyse IA</strong><span data-photo-count>0/${MAX_PHOTOS}</span></div>
                <p>Ajoutez des vues générales et, si utile, des gros plans des sols, vitres, poussières, déchets ou traces.</p>
                <div class="ccai-photo-tools">
                  <input class="ccai-photo-input" id="ccai-photo-gallery-devis" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>
                  <input class="ccai-photo-input" id="ccai-photo-camera-devis" type="file" accept="image/*" capture="environment" hidden>
                  <button class="ccai-photo-btn" type="button" data-photo-open="ccai-photo-gallery-devis">📷 Galerie</button>
                  <button class="ccai-photo-btn" type="button" data-photo-open="ccai-photo-camera-devis">📸 Appareil photo</button>
                </div>
                <div class="ccai-photo-previews" data-photo-previews></div>
                <p class="ccai-photo-status" data-photo-status>Formats : JPG, PNG ou WebP · ${MAX_PHOTOS} photos maximum.</p>
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
                <button class="ccai-btn light" type="button" id="ccai-ask-ai">📷 Analyser la demande avec l'IA</button>
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
      .map((m) => {
        const photoBadge = m.imageCount ? `<span class="ccai-msg-photo-badge">📷 ${m.imageCount} photo${m.imageCount > 1 ? "s" : ""}</span>` : "";
        return `<div class="ccai-msg ${m.role === "user" ? "user" : "assistant"}"><div>${photoBadge}${nl2br(m.content)}</div></div>`;
      })
      .join("");
    box.scrollTop = box.scrollHeight;
  }

  function photoStatus(root, message, isError) {
    root.querySelectorAll("[data-photo-status]").forEach((el) => {
      el.textContent = message;
      el.classList.toggle("error", Boolean(isError));
    });
  }

  function renderPhotoPreviews(root) {
    const count = state.photos.length;
    root.querySelectorAll("[data-photo-count]").forEach((el) => { el.textContent = `${count}/${MAX_PHOTOS}`; });
    const html = state.photos.map((photo) => `
      <div class="ccai-photo-preview">
        <img src="${photo.preview}" alt="Photo sélectionnée pour le pré-devis">
        <button type="button" data-remove-photo="${photo.id}" aria-label="Supprimer cette photo">×</button>
      </div>`).join("");
    root.querySelectorAll("[data-photo-previews]").forEach((el) => { el.innerHTML = html; });
  }

  function dataUrlToBase64(dataUrl) {
    const idx = String(dataUrl || "").indexOf(",");
    return idx >= 0 ? dataUrl.slice(idx + 1) : "";
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Lecture de l'image impossible."));
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Format d'image non lisible par ce navigateur."));
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function compressPhoto(file) {
    if (!file || !String(file.type || "").startsWith("image/")) throw new Error("Le fichier sélectionné n'est pas une image.");
    if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) throw new Error("Utilisez une photo JPG, PNG ou WebP.");
    if (file.size > 12 * 1024 * 1024) throw new Error("Cette photo est trop lourde (12 Mo maximum avant compression).");

    const img = await loadImageFromFile(file);
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    const maxDimension = 1280;
    const ratio = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.78;
    let preview = canvas.toDataURL("image/jpeg", quality);
    while (dataUrlToBase64(preview).length > MAX_PHOTO_BASE64_CHARS && quality > 0.42) {
      quality -= 0.08;
      preview = canvas.toDataURL("image/jpeg", quality);
    }
    const data = dataUrlToBase64(preview);
    if (!data || data.length > MAX_PHOTO_BASE64_CHARS * 1.15) throw new Error("Impossible de réduire suffisamment cette photo. Essayez une image plus légère.");

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(file.name || "photo.jpg").slice(0, 80),
      mimeType: "image/jpeg",
      data,
      preview,
      width,
      height
    };
  }

  async function addPhotoFiles(root, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = MAX_PHOTOS - state.photos.length;
    if (room <= 0) {
      photoStatus(root, `Vous avez déjà sélectionné ${MAX_PHOTOS} photos. Supprimez-en une pour en ajouter une autre.`, true);
      return;
    }
    photoStatus(root, "Préparation des photos…", false);
    let added = 0;
    for (const file of files.slice(0, room)) {
      try {
        const photo = await compressPhoto(file);
        state.photos.push(photo);
        added += 1;
      } catch (error) {
        photoStatus(root, error.message || "Une photo n'a pas pu être ajoutée.", true);
      }
    }
    renderPhotoPreviews(root);
    if (added) photoStatus(root, `${state.photos.length} photo${state.photos.length > 1 ? "s" : ""} prête${state.photos.length > 1 ? "s" : ""} pour l'analyse IA.`, false);
  }

  function clearPhotos(root) {
    state.photos = [];
    renderPhotoPreviews(root);
    photoStatus(root, `Ajoutez jusqu'à ${MAX_PHOTOS} photos pour affiner le pré-devis.`, false);
  }

  function bindPhotoInputs(root) {
    root.querySelectorAll("[data-photo-open]").forEach((btn) => {
      btn.addEventListener("click", () => root.querySelector(`#${btn.dataset.photoOpen}`)?.click());
    });
    root.querySelectorAll(".ccai-photo-input").forEach((input) => {
      input.addEventListener("change", async () => {
        await addPhotoFiles(root, input.files);
        input.value = "";
      });
    });
    root.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-remove-photo]");
      if (!btn) return;
      state.photos = state.photos.filter((photo) => photo.id !== btn.dataset.removePhoto);
      renderPhotoPreviews(root);
      photoStatus(root, state.photos.length ? `${state.photos.length} photo${state.photos.length > 1 ? "s" : ""} prête${state.photos.length > 1 ? "s" : ""} pour l'analyse IA.` : `Ajoutez jusqu'à ${MAX_PHOTOS} photos pour affiner le pré-devis.`, false);
    });
    renderPhotoPreviews(root);
  }

  async function sendChat(root, forcedText) {
    const input = root.querySelector("#ccai-input");
    const images = state.photos.map((photo) => ({
      name: photo.name,
      mimeType: photo.mimeType,
      data: photo.data
    }));
    const rawText = String(forcedText || input.value || "").trim();
    const text = rawText || (images.length ? "Analyse ces photos pour m'aider à préparer un pré-devis Clean-Cité. Si une information essentielle manque, pose-moi les questions nécessaires sans inventer de surface ni de contrainte invisible." : "");
    if (!text) return;
    if (input) input.value = "";

    state.messages.push({ role: "user", content: text, imageCount: images.length });
    state.messages.push({ role: "assistant", content: images.length ? "J'analyse les photos et les informations…" : "Je prépare ma réponse..." });
    renderMessages(root);
    if (images.length) clearPhotos(root);

    try {
      const response = await fetch("/.netlify/functions/assistant-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          messages: state.messages
            .filter((m) => m.content !== "Je prépare ma réponse..." && m.content !== "J'analyse les photos et les informations…")
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
          images
        })
      });
      const data = await response.json();
      state.messages.pop();
      const engine = root.querySelector("#ccai-engine-status");
      if (engine) {
        if (data.mode === "gemini") { engine.textContent = "● Gemini actif"; engine.className = "ccai-engine-status gemini"; }
        else if (data.mode === "fallback") { engine.textContent = "● Mode secours actif"; engine.className = "ccai-engine-status fallback"; }
        else { engine.textContent = "Gemini prêt"; engine.className = "ccai-engine-status"; }
      }
      const reply = data.reply || data.message || "Je n'ai pas pu répondre pour le moment.";
      if (images.length) {
        state.lastPhotoAnalysis = String(reply).slice(0, 4500);
        state.lastPhotoCount = images.length;
      }
      state.messages.push({ role: "assistant", content: reply });
      renderMessages(root);
      speakText(reply);
      return;
    } catch (error) {
      state.messages.pop();
      const reply = "Impossible de joindre l'assistant pour le moment. Vous pouvez contacter Clean-Cité au 07 66 53 61 54.";
      state.messages.push({ role: "assistant", content: reply });
      renderMessages(root);
      speakText(reply);
      return;
    }
  }

  function speakText(text) {
    if (!state.voiceReplies || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(text || "").replace(/[*#_`]/g, ""));
      utterance.lang = "fr-FR";
      utterance.rate = 0.98;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  function setVoiceStatus(root, message, mode) {
    const el = root.querySelector("#ccai-voice-status");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("listening", mode === "listening");
    el.classList.toggle("error", mode === "error");
  }

  function initVoice(root) {
    const mic = root.querySelector("#ccai-mic");
    const toggle = root.querySelector("#ccai-voice-toggle");
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!("speechSynthesis" in window) && toggle) {
      toggle.disabled = true;
      toggle.title = "Réponse vocale non prise en charge par ce navigateur";
    }

    if (toggle) {
      toggle.addEventListener("click", () => {
        state.voiceReplies = !state.voiceReplies;
        toggle.classList.toggle("active", state.voiceReplies);
        toggle.setAttribute("aria-pressed", String(state.voiceReplies));
        toggle.setAttribute("aria-label", state.voiceReplies ? "Désactiver les réponses vocales" : "Activer les réponses vocales");
        toggle.title = state.voiceReplies ? "Réponses vocales activées" : "Réponses vocales désactivées";
        toggle.textContent = state.voiceReplies ? "🔊" : "🔇";
        if (!state.voiceReplies && "speechSynthesis" in window) window.speechSynthesis.cancel();
      });
    }

    if (!Recognition) {
      if (mic) {
        mic.disabled = true;
        mic.title = "Micro vocal non pris en charge par ce navigateur";
      }
      setVoiceStatus(root, "Le micro vocal n'est pas disponible sur ce navigateur. Vous pouvez toujours écrire votre message.", "error");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    state.recognition = recognition;

    recognition.onstart = () => {
      state.listening = true;
      state.pendingVoiceText = "";
      mic.classList.add("listening");
      mic.textContent = "⏹";
      mic.setAttribute("aria-label", "Arrêter l'écoute");
      setVoiceStatus(root, "Je vous écoute… Parlez normalement.", "listening");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0] ? event.results[i][0].transcript : "";
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      const text = (finalText || interimText).trim();
      const input = root.querySelector("#ccai-input");
      if (input && text) input.value = text;
      if (finalText.trim()) state.pendingVoiceText = finalText.trim();
    };

    recognition.onerror = (event) => {
      state.pendingVoiceText = "";
      const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
      setVoiceStatus(root, denied ? "Autorisation du micro refusée. Autorisez le micro dans les réglages du navigateur puis réessayez." : "Je n'ai pas bien entendu. Appuyez sur le micro pour réessayer.", "error");
    };

    recognition.onend = () => {
      state.listening = false;
      mic.classList.remove("listening");
      mic.textContent = "🎙️";
      mic.setAttribute("aria-label", "Parler à l'assistant");
      const text = state.pendingVoiceText.trim();
      state.pendingVoiceText = "";
      if (text) {
        setVoiceStatus(root, `Vous avez dit : « ${text} »`, "");
        sendChat(root, text);
      } else if (!root.querySelector("#ccai-voice-status")?.classList.contains("error")) {
        setVoiceStatus(root, "🎙️ Appuyez sur le micro pour parler.", "");
      }
    };

    mic.addEventListener("click", () => {
      if (state.listening) {
        recognition.stop();
        return;
      }
      try {
        recognition.start();
      } catch (_) {
        setVoiceStatus(root, "Le micro est déjà actif. Parlez ou appuyez de nouveau pour arrêter.", "listening");
      }
    });
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

  function calcAirbnbDetailed(surface, bedrooms, bathrooms, toilets, kitchens, livingRooms, levels){
    surface = Math.max(0, Number(surface)||0);
    bedrooms = Math.max(0, Number(bedrooms)||0);
    bathrooms = Math.max(0, Number(bathrooms)||0);
    toilets = Math.max(0, Number(toilets)||0);
    kitchens = Math.max(0, Number(kitchens)||0);
    livingRooms = Math.max(0, Number(livingRooms)||0);
    levels = Math.max(1, Number(levels)||1);
    let base=0, typology='';
    if(surface<=30){ base=55; typology='Studio / T1'; }
    else if(surface<=50){ base=70; typology='T2'; }
    else if(surface<=75){ base=90; typology='T3'; }
    else if(surface<=100){ base=120; typology='T4'; }
    else { base=Math.max(150, Math.round(120 + (surface-100)*1.2)); typology='T5+ / grand logement'; }
    const bedroomExtra=Math.max(0,bedrooms-1)*10;
    const bathroomExtra=Math.max(0,bathrooms-1)*15;
    const toiletExtra=Math.max(0,toilets-1)*6;
    const kitchenExtra=Math.max(0,kitchens-1)*15;
    const livingExtra=Math.max(0,livingRooms-1)*10;
    const levelExtra=Math.max(0,levels-1)*12;
    const supplements=bedroomExtra+bathroomExtra+toiletExtra+kitchenExtra+livingExtra+levelExtra;
    const perRotation=Math.round(base+supplements);
    return {base,typology,perRotation,supplements,bedroomExtra,bathroomExtra,toiletExtra,kitchenExtra,livingExtra,levelExtra};
  }

  function getEstimatePayload(root) {
    const service = root.querySelector("#ccai-service").value;
    const selected = services[service] || services.fin_chantier;
    const surface = Number(root.querySelector("#ccai-surface").value || 0);
    const conditionCode = root.querySelector("#ccai-condition").value;
    const frequencyCode = root.querySelector("#ccai-frequency").value;
    const agents = Math.max(1, Number(root.querySelector("#ccai-agents").value || 1));
    const hours = Math.max(0, Number(root.querySelector("#ccai-hours").value || 0));
    const workDays = Math.max(1, Number(root.querySelector("#ccai-workdays").value || 1));
    const bins = Math.max(0, Number(root.querySelector("#ccai-bins").value || 0));
    const binPasses = Math.max(0, Number(root.querySelector("#ccai-bin-passes").value || 0));
    const airbnbLevels=Math.max(1,Number(root.querySelector("#ccai-airbnb-levels").value||1));
    const airbnbBedrooms=Math.max(0,Number(root.querySelector("#ccai-airbnb-bedrooms").value||0));
    const airbnbBathrooms=Math.max(0,Number(root.querySelector("#ccai-airbnb-bathrooms").value||0));
    const airbnbToilets=Math.max(0,Number(root.querySelector("#ccai-airbnb-toilets").value||0));
    const airbnbKitchens=Math.max(0,Number(root.querySelector("#ccai-airbnb-kitchens").value||0));
    const airbnbLiving=Math.max(0,Number(root.querySelector("#ccai-airbnb-living").value||0));
    const airbnbRotations=Math.max(1,Number(root.querySelector("#ccai-airbnb-rotations").value||1));

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
      const raw = agents * hours * workDays * rate;
      total = Math.max(raw, 150);
      billingUnit = "intervention";
      estimateText = money(total);
      detail = `${agents} agent(s) × ${hours} h/jour × ${workDays} jour(s) × 28 € HT/h. Journée type 7 h = 196 € HT par agent. Minimum ponctuel de 150 € si nécessaire.`;
    }

    if (selected.type === "airbnb" && surface > 0) {
      const a=calcAirbnbDetailed(surface,airbnbBedrooms,airbnbBathrooms,airbnbToilets,airbnbKitchens,airbnbLiving,airbnbLevels);
      total=a.perRotation*airbnbRotations;
      billingUnit = airbnbRotations>1 ? `${airbnbRotations} rotations` : "par rotation";
      estimateText = airbnbRotations>1 ? `${money(total)} pour ${airbnbRotations} rotations` : `${money(a.perRotation)} / rotation`;
      detail = `${a.typology} · ${surface} m² · ${airbnbLevels} niveau(x) · ${airbnbBedrooms} chambre(s) · ${airbnbBathrooms} salle(s) d’eau · ${airbnbToilets} WC · ${airbnbKitchens} cuisine(s) · ${airbnbLiving} salon(s)/séjour(s). Base surface ${money(a.base)} + ajustement configuration ${money(a.supplements)}.`;
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
      agents,
      hours,
      workDays,
      bins,
      binPasses,
      airbnbLevels, airbnbBedrooms, airbnbBathrooms, airbnbToilets, airbnbKitchens, airbnbLiving, airbnbRotations,
      name: root.querySelector("#ccai-name").value.trim(),
      phone: root.querySelector("#ccai-phone").value.trim(),
      email: root.querySelector("#ccai-email").value.trim(),
      message: root.querySelector("#ccai-extra").value.trim(),
      photoCount: state.lastPhotoAnalysis ? state.lastPhotoCount : state.photos.length,
      aiAnalysis: state.lastPhotoAnalysis ? state.lastPhotoAnalysis.slice(0, 4500) : "",
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
    const airbnbRow = root.querySelector("#ccai-airbnb-row");

    const needsSurface = ["office", "airbnb", "surface_state", "restoration", "glass", "terrace"].includes(selected.type);
    const needsCondition = ["surface_state", "restoration", "glass", "terrace"].includes(selected.type);
    const needsFrequency = ["office", "airbnb"].includes(selected.type);

    surfaceWrap.style.display = needsSurface ? "block" : "none";
    conditionWrap.style.display = needsCondition ? "block" : "none";
    frequencyWrap.style.display = needsFrequency ? "block" : "none";
    hourlyRow.style.display = selected.type === "hourly" ? "grid" : "none";
    binsRow.style.display = selected.type === "bins" ? "grid" : "none";
    airbnbRow.style.display = selected.type === "airbnb" ? "grid" : "none";
  }

  function updateEstimate(root) {
    updateDynamicFields(root);
    const payload = getEstimatePayload(root);
    const estimate = root.querySelector("#ccai-estimate");
    const whatsapp = root.querySelector("#ccai-whatsapp");

    estimate.innerHTML = `Estimation indicative : <strong>${escapeHtml(payload.estimateText)}</strong><br><small>${escapeHtml(payload.estimateDetail)}</small>`;

    const extras = [];
    if (payload.surface) extras.push(`Surface : ${payload.surface} m²`);
    if (payload.service === "chantier") {
      extras.push(`Agents : ${payload.agents}`);
      extras.push(`Heures / jour : ${payload.hours}`);
      extras.push(`Nombre de jours : ${payload.workDays}`);
    }
    if (payload.bins && payload.service === "sortie_poubelles") extras.push(`Bacs : ${payload.bins}`);
    if (payload.binPasses && payload.service === "sortie_poubelles") extras.push(`Passages : ${payload.binPasses} / semaine`);
    if (payload.plan) extras.push(`Formule : ${payload.plan}`);
    if(payload.service === "airbnb"){
      extras.push(`Niveaux : ${payload.airbnbLevels}`);
      extras.push(`Chambres : ${payload.airbnbBedrooms}`);
      extras.push(`Salles d’eau / douches : ${payload.airbnbBathrooms}`);
      extras.push(`WC : ${payload.airbnbToilets}`);
      extras.push(`Cuisines : ${payload.airbnbKitchens}`);
      extras.push(`Salons / séjours : ${payload.airbnbLiving}`);
      extras.push(`Rotations : ${payload.airbnbRotations}`);
    }

    if (state.lastPhotoAnalysis) extras.push("Photos analysées par l'IA : oui");
    const analysisForWa = state.lastPhotoAnalysis ? `\nSynthèse IA photos : ${state.lastPhotoAnalysis.replace(/\s+/g, " ").slice(0, 900)}` : "";
    const waMessage = `Bonjour Clean-Cité, je souhaite recevoir un devis.\n\nService : ${payload.serviceLabel}\n${extras.length ? extras.join("\n") + "\n" : ""}Ville : ${payload.city || "non précisée"}\nÉtat du lieu : ${payload.condition || "non précisé"}\nFréquence : ${payload.frequency || "non précisée"}\nEstimation indicative : ${payload.estimateText}\nDétail : ${payload.estimateDetail}${analysisForWa}\nNom : ${payload.name || "non renseigné"}\nTéléphone : ${payload.phone || "non renseigné"}\nEmail : ${payload.email || "non renseigné"}\nMessage : ${payload.message || "aucun"}`;
    whatsapp.href = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(waMessage)}`;
  }

  function showStatus(root, type, message) {
    const status = root.querySelector("#ccai-status");
    status.className = `ccai-status ${type}`;
    status.textContent = message;
  }

  async function submitLead(root) {
    if (state.photos.length) {
      showStatus(root, "err", "Vous avez ajouté des photos. Cliquez d’abord sur « Analyser la demande avec l’IA » afin de les intégrer au pré-devis avant l’envoi.");
      return;
    }
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
    window.__cleanCiteAIRoot = root;
    window.openCleanCiteAI = function(view = "chat") {
      const r = window.__cleanCiteAIRoot || document.querySelector(".ccai-root");
      if (!r) return;
      r.classList.add("open");
      switchView(r, view === "devis" ? "devis" : "chat");
      const input = r.querySelector("#ccai-input");
      if (view !== "devis" && input) setTimeout(() => input.focus(), 120);
    };
    renderMessages(root);
    updateDynamicFields(root);
    updateEstimate(root);
    bindPhotoInputs(root);

    root.querySelector(".ccai-bubble").addEventListener("click", () => root.classList.toggle("open"));
    root.querySelector(".ccai-close").addEventListener("click", () => root.classList.remove("open"));
    root.querySelectorAll(".ccai-tab").forEach((btn) => btn.addEventListener("click", () => switchView(root, btn.dataset.view)));
    root.querySelector("#ccai-send").addEventListener("click", () => sendChat(root));
    initVoice(root);
    root.querySelector("#ccai-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendChat(root);
    });
    root.querySelectorAll(".ccai-chip").forEach((btn) => btn.addEventListener("click", () => sendChat(root, btn.dataset.q)));
    root.querySelectorAll("#ccai-service,#ccai-surface,#ccai-city,#ccai-condition,#ccai-frequency,#ccai-agents,#ccai-hours,#ccai-workdays,#ccai-bins,#ccai-bin-passes,#ccai-name,#ccai-phone,#ccai-email,#ccai-extra").forEach((field) => {
      field.addEventListener("input", () => updateEstimate(root));
      field.addEventListener("change", () => updateEstimate(root));
    });
    root.querySelector("#ccai-form").addEventListener("submit", (e) => {
      e.preventDefault();
      updateEstimate(root);
      submitLead(root);
    });
    const devisStep = document.querySelector("#devis-step1");
    if (devisStep && !devisStep.querySelector(".ccai-gemini-bridge")) {
      const bridge = document.createElement("div");
      bridge.className = "ccai-gemini-bridge";
      bridge.innerHTML = `<div><strong>✨ Gemini — Assistance intelligente</strong><small>Besoin d’aide pour préciser le devis ? Parlez à Gemini ou envoyez des photos.</small></div><button type="button">Ouvrir Gemini</button>`;
      const calcBtn = Array.from(devisStep.querySelectorAll("button")).find(b => /Calculer mon pré-devis/i.test(b.textContent || ""));
      if (calcBtn) calcBtn.insertAdjacentElement("afterend", bridge); else devisStep.appendChild(bridge);
      bridge.querySelector("button").addEventListener("click", () => {
        if (typeof window.closeAll === "function") window.closeAll();
        window.openCleanCiteAI("chat");
      });
    }

    root.querySelector("#ccai-ask-ai").addEventListener("click", () => {
      const p = getEstimatePayload(root);
      const photoCount = state.photos.length;
      switchView(root, "chat");
      const details = [
        `Service : ${p.serviceLabel}`,
        p.surface ? `surface déclarée : ${p.surface} m²` : "surface non précisée",
        p.service === "chantier" ? `agents : ${p.agents}, ${p.hours} h/jour, ${p.workDays} jour(s)` : "",
        p.bins && p.service === "sortie_poubelles" ? `bacs : ${p.bins}` : "",
        p.binPasses && p.service === "sortie_poubelles" ? `passages : ${p.binPasses}/semaine` : "",
        `ville : ${p.city || "non précisée"}`,
        `état déclaré : ${p.condition || "non précisé"}`,
        `fréquence : ${p.frequency || "non précisée"}`,
        `estimation calculateur : ${p.estimateText}`,
        photoCount ? `${photoCount} photo(s) jointe(s)` : "aucune photo jointe",
        p.message || ""
      ].filter(Boolean).join(", ");
      const instruction = photoCount
        ? "Analyse les photos jointes en te concentrant uniquement sur l'état visible du lieu, puis prépare un PRÉ-DEVIS IA ESTIMATIF. Compare les observations visibles avec les informations saisies et la grille Clean-Cité. N'invente jamais la surface, la hauteur, l'accès ou des travaux non visibles. Donne le niveau de confiance et les points à confirmer."
        : "Conseilles-moi sur cette demande et indique les informations manquantes pour rendre le pré-devis plus précis.";
      sendChat(root, `${instruction} Données : ${details}`);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
