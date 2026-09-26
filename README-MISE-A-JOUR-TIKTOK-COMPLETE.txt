MISE À JOUR COMPLÈTE CLEAN-CITÉ — AGENT TIKTOK
============================================

Cette archive contient le site entier, prêt à être déployé sur GitHub en remplacement
de la précédente archive complète. Elle reprend la dernière archive du site retrouvée :
« Clean-Cite-MISE-A-JOUR-PROSPECTION-MULTI-ACTIVITES.zip », version 3 du 22/09/2026.

Tous les fichiers de cette base sont présents. Les seules modifications du site sont :
- admin/index.html : ajout de la carte « Agent TikTok » au tableau de bord ;
- admin/tiktok.html : nouvelle page de l'agent ;
- netlify/functions/tiktok-agent.mjs : génération IA et sauvegarde des brouillons ;
- version.txt : identification de cette version.

Les fonctions de devis, factures, Mail IA, prospection, SEO et les pages publiques
proviennent de la même archive de base. Aucun changement manuel de code n'est
nécessaire : décompresser ce ZIP et déployer l'ensemble de son contenu à la racine
du dépôt GitHub du site Clean-Cité. Conserver les variables Netlify existantes,
notamment GEMINI_API_KEY. Aucune nouvelle dépendance npm n'est requise.

Après le déploiement : ouvrir https://clean-cite.org/admin/ avec le compte
administrateur, puis la carte « Agent TikTok ».

L'agent génère une publication ou trois idées pour la semaine, propose accroches,
légendes, hashtags et prises de vue, conserve les brouillons et prépare des
réponses aux commentaires ou messages collés dans le module. Les dates sont des
repères éditoriaux. Aucun compte TikTok n'est encore connecté : aucune publication
ou réponse n'est envoyée automatiquement par cette version.
