CORRECTION MAIL IA GEMINI — 29/08/2026

Problème corrigé :
- Gmail était connecté et les messages se chargeaient correctement.
- Le bouton « Générer avec Gemini » pouvait afficher : « Gemini n’a pas produit de réponse exploitable. »

Corrections appliquées :
1. Gemini 2.5 Flash : réflexion interne désactivée pour cette tâche courte (thinkingBudget: 0).
2. Budget de sortie augmenté à 2400 tokens.
3. Sortie structurée imposée avec un schéma JSON strict.
4. Lecture de la réponse Gemini rendue plus robuste.
5. Mode de secours : si la sortie structurée échoue, une seconde génération produit directement le brouillon en texte.
6. Messages d’erreur améliorés avec la raison de fin Gemini en cas d’échec.

Aucune modification de la connexion Gmail/OAuth n’est nécessaire.
Après mise à jour GitHub/Netlify, faire un nouveau déploiement puis tester à nouveau « Générer avec Gemini ».
