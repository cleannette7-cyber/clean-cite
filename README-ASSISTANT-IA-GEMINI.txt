ASSISTANT IA CLEAN-CITÉ — GEMINI — VERSION TARIFS 2026
======================================================

L'assistant IA est déjà intégré dans le code du site et chargé sur les pages HTML.
Le code frontend est dans : assets/assistant-gemini.js
La fonction Netlify sécurisée est dans : netlify/functions/assistant-gemini.js

TARIFS CONNUS PAR L'IA ET LE DEVIS RAPIDE
==========================================
- Bureaux ponctuels : dès 1,50 €/m² (minimum ponctuel 150 €).
- Bureaux réguliers : dès 1 €/m² par passage.
- Chantier en cours : 28 € HT/heure/par agent. Journée type 7 h = 196 € HT par agent. Calcul : agents × heures/jour × jours × 28 €.
- Fin de chantier : léger 4,50 €/m² ; standard 6 €/m² ; très sale 9 €/m².
- Remise en état : dès 6,50 €/m² ; très encrassé dès 8,50 €/m².
- Vitrerie : dès 4 €/m² ; très sale dès 6,50 €/m² ; hauteur/nacelle sur devis.
- Terrasse : dès 4,90 €/m² ; très encrassée dès 6,50 €/m².
- Parties communes : dès 199 €/mois.
- Poubelles Starter : 79 €/mois — jusqu'à 4 bacs — 1 passage/semaine.
- Poubelles Confort : 159 €/mois — jusqu'à 10 bacs — 2 passages/semaine.
- Poubelles Premium : dès 249 €/mois — jusqu'à 15 bacs — 3 passages/semaine.
- Au-delà : sur devis.
- Aucune formule poubelles illimitée.

IMPORTANT : ACTIVATION DE GEMINI SUR NETLIFY
=============================================
Le code de Gemini est dans le ZIP, MAIS la clé secrète GEMINI_API_KEY n'est jamais incluse automatiquement dans GitHub ou dans le ZIP.
Elle doit être enregistrée une seule fois dans les variables d'environnement Netlify.

Dans Netlify :
1. Ouvrir le projet Clean-Cité.
2. Aller dans Project configuration / Site configuration.
3. Ouvrir Environment variables.
4. Ajouter une variable :
   Key : GEMINI_API_KEY
   Value : votre clé API Google Gemini / Google AI Studio
5. Facultatif : ajouter GEMINI_MODEL = gemini-2.5-flash
6. Sauvegarder.
7. Relancer un déploiement du site pour que la fonction récupère la nouvelle variable.

IMPORTANT : ne jamais mettre GEMINI_API_KEY directement dans index.html, assets/assistant-gemini.js ou GitHub.
La clé doit rester uniquement côté Netlify dans les variables d'environnement.

SI GEMINI_API_KEY EST DÉJÀ DANS NETLIFY
=======================================
Vous n'avez rien à la recréer lors de la mise à jour GitHub. Netlify conserve normalement les variables d'environnement du même site/projet.
Après le nouveau déploiement, l'assistant utilise automatiquement la clé déjà enregistrée.

EMAIL AUTOMATIQUE (OPTIONNEL)
=============================
BREVO_API_KEY = votre clé API Brevo
BREVO_SENDER_EMAIL = email expéditeur validé dans Brevo
BREVO_SENDER_NAME = Clean-Cité
CLEAN_CITE_EMAIL = email qui reçoit les demandes

Sans BREVO_API_KEY, le formulaire ouvre un email manuel prêt à envoyer.

SÉCURITÉ
========
- La clé Gemini reste côté serveur dans la fonction Netlify.
- Le navigateur n'obtient jamais GEMINI_API_KEY.
- Les tarifs affichés par l'IA restent indicatifs.
- Le minimum de 150 € ne s'applique pas automatiquement aux contrats réguliers, parties communes ou abonnements poubelles.


MODE VOCAL / MICRO
==================
Le chat IA inclut maintenant un bouton micro.
- Au premier clic, le navigateur demande l'autorisation d'utiliser le microphone.
- Le client parle en français ; le texte est transcrit puis envoyé automatiquement à l'assistant IA.
- Les réponses de l'assistant sont lues à voix haute si le bouton haut-parleur 🔊 est activé.
- Le bouton 🔊 / 🔇 permet d'activer ou de couper la lecture vocale.
- Aucune clé API supplémentaire n'est nécessaire pour le micro : le site utilise les fonctions vocales du navigateur.
- Le site doit être ouvert en HTTPS (Netlify le fournit automatiquement) pour que l'accès au microphone fonctionne correctement.
- Si le navigateur ne prend pas en charge la reconnaissance vocale, le chat texte reste disponible.

CHANTIER EN COURS — NOUVEAU CALCUL
===================================
Le devis rapide demande maintenant :
- nombre d'agents par jour ;
- nombre d'heures par jour (7 h par défaut) ;
- nombre de jours.
Formule indicative : agents × heures/jour × jours × 28 € HT.
Exemple : 2 agents × 7 h × 3 jours × 28 € = 1 176 € HT.
