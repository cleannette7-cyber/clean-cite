/* CLEAN-CITE — Google Ads: suivi des devis validés (30/10/2026)
 * Google Ads ID and label copied from the account screenshots.
 * Consentement explicite AVANT chargement du tag : mode basique.
 * NE PAS enregistrer de conversion à l'ouverture de /merci.html.
 */
(function () {
  'use strict';
  const ADS_ID = 'AW-18531816572';
  const CONVERSION_ID = 'AW-18531816572/T6fDCOT4ya4dEPyo1IRF';
  const CONSENT_KEY = 'clean_cite_ads_consent_v1';
  const FORM_NAMES = new Set(['demande-devis', 'pre-devis-clean-cite', 'demande-devis-airbnb']);
  let adsReady = false;

  function storedConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (error) { return null; }
  }
  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (error) { /* stockage bloqué */ }
  }
  function initGoogleTag() {
    if (adsReady || storedConsent() !== 'accepted') return;
    adsReady = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    // En mode basique, le tag n'est chargé qu'APRES acceptation explicite.
    // Google Consent Mode v2 : pas de personnalisation ni de collecte avancée.
    window.gtag('consent', 'default', {
      ad_storage: 'granted',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', ADS_ID);
    const js = document.createElement('script');
    js.async = true;
    js.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ADS_ID);
    document.head.appendChild(js);
  }

  function showConsentPanel() {
    const existing = document.getElementById('cc-ads-consent-panel');
    if (existing) { existing.hidden = false; return; }
    const panel = document.createElement('section');
    panel.id = 'cc-ads-consent-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Choix des cookies publicitaires');
    panel.innerHTML = '<strong>Cookies publicitaires</strong>' +
      '<p>Avec votre accord, Clean-Cité utilise Google Ads pour mesurer les demandes de devis issues de ses annonces. ' +
      'Vous pouvez refuser sans empêcher l’utilisation du site. ' +
      '<a href="/confidentialite.html">En savoir plus</a>.</p>' +
      '<div class="cc-ads-actions"><button type="button" data-choice="refused">Refuser</button>' +
      '<button type="button" data-choice="accepted">Accepter</button></div>';
    panel.querySelectorAll('button[data-choice]').forEach(function (button) {
      button.addEventListener('click', function () {
        const choice = button.getAttribute('data-choice');
        saveConsent(choice);
        panel.hidden = true;
        if (choice === 'accepted') initGoogleTag();
        // Le refus reste effectif tant qu'il n'est pas modifié. Le changement
        // accepté -> refus recharge la page afin d'arrêter le tag déjà chargé.
        if (choice === 'refused' && adsReady) window.location.reload();
      });
    });
    document.body.appendChild(panel);
  }

  function setupConsentUI() {
    const style = document.createElement('style');
    style.textContent = `
      #cc-ads-consent-panel{position:fixed;z-index:2147483000;bottom:54px;left:50%;transform:translateX(-50%);
        box-sizing:border-box;width:min(92vw,530px);background:#fff;color:#0b2447;border:1px solid #ced8e5;
        border-radius:15px;box-shadow:0 12px 40px #0003;padding:18px 20px;font:14px/1.55 Arial,sans-serif}
      #cc-ads-consent-panel[hidden]{display:none}
      #cc-ads-consent-panel strong{font-size:17px}
      #cc-ads-consent-panel p{margin:8px 0 15px;color:#24364f}
      #cc-ads-consent-panel a{color:#0b477b;text-decoration:underline}
      #cc-ads-consent-panel .cc-ads-actions{display:flex;gap:10px}
      #cc-ads-consent-panel button{flex:1;border:2px solid #0b2447;border-radius:9px;padding:11px 12px;
        font-size:14px;font-weight:bold;cursor:pointer;background:#fff;color:#0b2447}
      #cc-ads-consent-panel button[data-choice="accepted"]{background:#0b2447;color:#fff}
      #cc-ads-manage{position:fixed;z-index:2147482000;bottom:12px;left:12px;
        border:1px solid #b7c3d7;border-radius:16px;background:#fff;color:#0b2447;
        padding:5px 10px;font:12px Arial,sans-serif;box-shadow:0 2px 8px #0002;cursor:pointer}
      @media(max-width:450px){#cc-ads-consent-panel{bottom:55px;padding:14px}#cc-ads-consent-panel .cc-ads-actions{gap:8px}}
    `;
    document.head.appendChild(style);
    const link = document.createElement('button');
    link.id = 'cc-ads-manage'; link.type = 'button'; link.textContent = 'Gérer les cookies';
    link.addEventListener('click', showConsentPanel);
    document.body.appendChild(link);
    if (storedConsent() === 'accepted') initGoogleTag();
    else if (storedConsent() !== 'refused') showConsentPanel();
  }

  function redirectAfterSuccess() {
    let redirected = false;
    function finish() {
      if (redirected) return;
      redirected = true;
      window.location.assign('/merci.html');
    }
    // Refus du consentement = aucune requête publicitaire.
    if (storedConsent() !== 'accepted' || typeof window.gtag !== 'function') {
      finish(); return;
    }
    // Le formulaire a déjà été transmis et confirmé côté Netlify.
    setTimeout(finish, 1600);
    try {
      window.gtag('event', 'conversion', {
        send_to: CONVERSION_ID,
        value: 1,
        currency: 'EUR',
        event_callback: finish,
        event_timeout: 1400
      });
    } catch (error) { finish(); }
  }

  function activateForms() {
    document.querySelectorAll('form[data-netlify="true"]').forEach(function (form) {
      if (!FORM_NAMES.has(form.getAttribute('name')) || form.dataset.ccAdsBound) return;
      form.dataset.ccAdsBound = '1';
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (form.dataset.ccAdsSubmitting === '1') return;
        form.dataset.ccAdsSubmitting = '1';
        const controls = Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]'));
        const oldDisabled = controls.map(function (el) { return el.disabled; });
        controls.forEach(function (el) { el.disabled = true; });
        try {
          const data = new FormData(form);
          if (!data.get('form-name')) data.set('form-name', form.getAttribute('name'));
          const response = await fetch('/', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams(data).toString(),
            credentials: 'same-origin'
          });
          if (!response.ok) throw new Error('Réponse serveur ' + response.status);
          redirectAfterSuccess();
        } catch (error) {
          form.dataset.ccAdsSubmitting = '0';
          controls.forEach(function (el, i) { el.disabled = oldDisabled[i]; });
          let msg = form.querySelector('.cc-ads-form-error');
          if (!msg) {
            msg = document.createElement('p');
            msg.className = 'cc-ads-form-error';
            msg.style.cssText = 'color:#9d1730;font-weight:700;margin:12px 0;';
            msg.setAttribute('role','alert');
            form.appendChild(msg);
          }
          msg.textContent = 'La demande n’a pas été confirmée. Vérifiez votre connexion et réessayez.';
        }
      });
    });
  }
  function start() { setupConsentUI(); activateForms(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
