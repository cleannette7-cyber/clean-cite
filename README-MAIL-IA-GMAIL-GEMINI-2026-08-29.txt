CLEAN-CITÉ — MAIL IA GMAIL + GEMINI
====================================

CE QUI A ÉTÉ AJOUTÉ
- Nouvelle page /admin/mail-ia.html
- Connexion Gmail sécurisée via Google OAuth 2.0 côté serveur.
- Lecture des e-mails récents dans l'administration.
- Analyse Gemini du message sélectionné.
- Analyse de jusqu'à 3 pièces jointes image (JPG/PNG/WebP) lors de la génération du brouillon.
- Brouillon modifiable avant envoi.
- Envoi de la réponse dans le même fil Gmail après validation admin.
- Classement IA : information simple, devis, facture, réclamation, paiement, etc.
- Mode par défaut : BROUILLON, aucun envoi automatique.
- Mode semi-automatique optionnel : uniquement réponses simples et sûres, maximum configurable de 1 à 5 par heure.
- Une Scheduled Function Netlify vérifie les messages une fois par heure uniquement si ce mode a été volontairement activé.
- Devis, factures, paiements, réclamations, remises, avoirs et engagements restent toujours en validation humaine.
- Les messages déjà traités automatiquement sont mémorisés pour éviter une double réponse.
- Jeton de connexion Gmail chiffré côté serveur avec une clé dérivée du secret OAuth Google.

CONFIGURATION À FAIRE UNE SEULE FOIS
1. Aller sur Google Cloud Console.
2. Créer ou sélectionner un projet pour Clean-Cité.
3. Activer « Gmail API ».
4. Configurer l'écran de consentement OAuth.
5. Ajouter les autorisations :
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.send
6. Créer un client OAuth de type « Application Web ».
7. Dans « URI de redirection autorisés », ajouter EXACTEMENT :
   https://clean-cite.org/.netlify/functions/gmail-oauth-callback
8. Copier le Client ID et le Client Secret.
9. Dans Netlify > Project configuration > Environment variables, créer :
   GOOGLE_GMAIL_CLIENT_ID = le Client ID Google
   GOOGLE_GMAIL_CLIENT_SECRET = le Client Secret Google
   GMAIL_OAUTH_REDIRECT_URI = https://clean-cite.org/.netlify/functions/gmail-oauth-callback
   GMAIL_ALLOWED_EMAIL = adresse Gmail Clean-Cité (optionnel mais recommandé)
10. Vérifier que GEMINI_API_KEY est toujours présent.
11. Relancer un déploiement Netlify.
12. Ouvrir https://clean-cite.org/admin/mail-ia.html
13. Cliquer « Connecter Gmail » et accepter l'autorisation Google.

IMPORTANT — ÉCRAN DE CONSENTEMENT GOOGLE
- Pour un premier test, vous pouvez mettre l'application en mode Testing et ajouter votre propre adresse Gmail comme utilisateur test.
- En mode Testing, Google peut limiter la durée du refresh token (souvent 7 jours). Il faudra alors reconnecter Gmail.
- Pour un fonctionnement durable, passez l'application en production et suivez les exigences Google applicables aux scopes Gmail.
- L'intégration est prévue pour l'usage propre de Clean-Cité, pas pour connecter les boîtes Gmail de clients externes.

MODE SEMI-AUTOMATIQUE
Le mode semi-automatique est DÉSACTIVÉ par défaut.
Si vous l'activez :
- Netlify exécute gmail-auto-reply une fois par heure.
- Le serveur ne répond automatiquement qu'à une catégorie très limitée : information simple ou accusé de réception.
- Un second filtre serveur bloque l'auto-envoi si le message ou la réponse concerne prix, devis, facture, paiement, réclamation, remise, contrat, dommage, litige, etc.
- Les autres messages restent dans la boîte pour validation manuelle.

FICHIERS PRINCIPAUX
/admin/mail-ia.html
/netlify/functions/gmail-oauth.mjs
/netlify/functions/gmail-oauth-callback.mjs
/netlify/functions/gmail-mail-ai.mjs
/netlify/functions/gmail-auto-reply.mjs
/netlify/functions/_gmail-common.mjs
/confidentialite.html
