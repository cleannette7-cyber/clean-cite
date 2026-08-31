CLEAN-CITÉ — CORRECTION ASSISTANT IA DU SITE — 31/08/2026

Correction appliquée sur la fonction Netlify : netlify/functions/assistant-gemini.js

- Gemini 2.5 Flash : réflexion désactivée pour cette tâche (thinkingBudget: 0).
- Budget de sortie augmenté et délai maximum de réponse ajouté.
- Extraction de réponse renforcée.
- En cas d'erreur Gemini, quota, timeout ou réponse vide, l'assistant ne reste plus bloqué : un moteur local de secours répond avec la grille tarifaire Clean-Cité.
- Le mode de secours couvre notamment : fin de chantier, chantier en cours, bureaux, poubelles, terrasse/balcon, vitrerie, parties communes et remise en état.
- La grille tarifaire et les règles de calcul restent identiques à la version validée.
- Aucune modification requise dans Google Cloud, Gmail ou les variables Netlify existantes.

Après mise à jour GitHub : lancer un nouveau déploiement Netlify (Clear cache and deploy site recommandé), puis tester :
« J'ai besoin d'un nettoyage de fin de chantier à Bobigny. »
