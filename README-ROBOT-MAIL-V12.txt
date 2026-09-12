CLEAN-CITÉ — MISE À JOUR V12 : ROBOT E-MAIL, PRÉ-DEVIS ET RELANCES
=================================================================

BASE
Archive V11 du 01/09/2026, conservée intégralement. Cette archive V12 contient
le site complet. Copier son contenu à la racine du dépôt GitHub Clean-Cité,
laisser Netlify redéployer et vérifier /version.txt.

CE QUI EST AJOUTÉ
• Grille commune assets/pricing.js pour le calculateur du site et les pré-devis
  e-mail : bureaux, fin de chantier, poubelles, Airbnb et chantier en cours.
• L'IA extrait les faits du mail. Le serveur vérifie chaque chiffre avec un
  fragment réellement présent dans le message, puis calcule le prix avec la
  grille du site. L'IA ne choisit jamais elle-même le montant.
• Si tout est présent : e-mail avec fourchette indicative et PDF clairement
  intitulé « PRÉ-DEVIS ». Le devis définitif reste à valider manuellement.
• Si une donnée manque, que la surface Airbnb sur plusieurs niveaux est ambiguë,
  qu'une option (vitres, décapage, etc.) ou plusieurs prestations sont demandées,
  le robot demande des précisions ou laisse l'étude en manuel.
• Suivi des nouveaux devis envoyés depuis Admin > Devis (via Brevo) et des
  pré-devis envoyés via Gmail. Relance après 7 jours sans réponse, puis 7 jours
  après la première relance ; arrêt si le client répond. Les envois antérieurs
  à cette mise à jour ne sont pas inscrits rétroactivement.
• Admin > Mail IA affiche les suivis et permet de suspendre chaque relance.

MISE EN SERVICE
1. Vérifier les variables Netlify Gmail/Gemini et la connexion Gmail déjà utilisées
   par l'ancienne version. Les devis Admin > Devis nécessitent BREVO_API_KEY.
2. Ouvrir /admin/mail-ia.html avec le compte administrateur. Générer un brouillon
   pour une demande test et examiner l'estimation et le PDF joint.
3. Enregistrer les réglages souhaités. « Envoyer automatiquement le PDF » et
   « Relancer automatiquement » sont désactivés après cette mise à jour tant que
   vous ne les cochez pas. Le mode « Brouillon » coupe les deux envois.
4. Les nouveaux devis doivent être envoyés via le bouton e-mail Admin > Devis
   pour que leur envoi soit certain. Le bouton WhatsApp, le PDF imprimé et le
   mailto manuel ne sont pas enregistrés comme devis envoyés.

LIMITES À CONNAÎTRE
• Les vitres demandent une superficie de vitrage, pas seulement un nombre de
  fenêtres ; les services et options non couverts restent à traiter manuellement.
• Pour un Airbnb à plusieurs niveaux, la surface doit être précisée « au total ».
• Les relances partent de la boîte Gmail connectée, même si le devis initial
  a été envoyé via Brevo. Une réponse du client depuis une autre adresse n'est
  pas reconnue automatiquement : suspendre le suivi dans Mail IA.
• Une tentative d'envoi incertaine reste bloquée pour éviter un doublon ; vérifier
  la boîte Gmail et suspendre le suivi si nécessaire.
• La tâche de relance s'exécute chaque jour à 09:00 UTC. La vérification des
  nouveaux messages existante reste programmée toutes les 5 minutes.
• Le robot ne transmet jamais automatiquement une facture, une correction de
  facture ni un devis définitif : ces documents demandent validation humaine.

FICHIERS PRINCIPAUX
assets/pricing.js, assets/fonts/*, netlify/functions/_prequote.mjs,
netlify/functions/_quote-followups.mjs,
netlify/functions/gmail-quote-followups.mjs,
netlify/functions/gmail-mail-ai.mjs,
netlify/functions/_gmail-common.mjs,
netlify/functions/admin-send-devis.mjs, admin/mail-ia.html,
admin/devis.html, index.html, package.json, netlify.toml.

VÉRIFICATION LOCALE
npm install
npm test
