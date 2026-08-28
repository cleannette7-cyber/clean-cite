CLEAN-CITÉ — CORRECTION AVANT / APRÈS ACCUEIL
Date : 28/08/2026

PROBLÈME IDENTIFIÉ
La page d'administration enregistrait correctement les interventions dans data/interventions.json,
mais la section Avant / Après de la page d'accueil utilisait encore des URL d'images Cloudinary codées en dur.
Les nouvelles photos publiées depuis l'admin ne pouvaient donc jamais remplacer les anciennes sur l'accueil.

CORRECTIONS
- Suppression du texte interne « Ajoutez ici vos vraies photos... » de la page publique.
- Suppression des anciennes images codées en dur dans la section Avant / Après de l'accueil.
- Liaison directe de l'accueil avec /data/interventions.json, le même fichier piloté par Admin > Avant / Après.
- Les interventions avec « Publier sur le site » activé apparaissent automatiquement.
- Tri des réalisations les plus récentes en premier.
- Affichage de 3 réalisations à la fois sur ordinateur.
- S'il y a plus de 3 interventions, les groupes défilent automatiquement toutes les 8 secondes.
- Chaque réalisation alterne automatiquement sa photo Avant et sa photo Après.
- Chargement sans cache du JSON pour éviter qu'une ancienne liste reste affichée après déploiement.
- La page avant-apres.html continue d'afficher la galerie complète.

UTILISATION
1. Ouvrir Admin > Gérer le site > Avant / Après de mes interventions.
2. Ajouter ou modifier une intervention.
3. Vérifier « Publier sur le site ».
4. Enregistrer / publier dans Decap CMS.
5. Attendre la fin du déploiement Netlify.
6. Recharger la page d'accueil. La nouvelle intervention doit être reprise automatiquement.

IMPORTANT
L'admin modifie le dépôt GitHub via Decap CMS. La photo n'est visible publiquement qu'après le déploiement Netlify correspondant.
