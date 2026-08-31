CLEAN-CITÉ — CORRECTION AUTHENTIFICATION ENVOI DEVIS V11

Problème corrigé :
- L’interface admin reconnaissait bien l’utilisateur connecté.
- La fonction admin-send-devis utilisait encore Netlify Functions v1 (event.clientContext.user).
- Sur le déploiement actuel, le serveur ne récupérait donc pas correctement l’utilisateur Identity et renvoyait « Accès administrateur requis ».

Correction :
- admin-send-devis convertie en Netlify Functions v2 (.mjs).
- Authentification via @netlify/identity getUser(), identique au module Factures.
- Vérification de l’adresse admin CLEAN_CITE_ADMIN_EMAIL (ou cleannette7@gmail.com par défaut).
- Tous les calculs Airbnb V10, Gemini et autres modules conservés.

Contrôle après déploiement : /version.txt doit afficher AIRBNB-CALCUL-PRECIS-V10-AUTH-DEVIS-V11
