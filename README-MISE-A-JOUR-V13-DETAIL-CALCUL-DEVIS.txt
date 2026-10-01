CLEAN-CITÉ — MISE À JOUR V13 — DÉTAIL DU CALCUL PAR PRESTATION
==================================================================

Cette mise à jour améliore uniquement le module existant Admin > Créer un devis.
Elle ne crée aucune nouvelle page, aucune section publique et aucun second module.
Les prestations, prix, remises, totaux, TVA, acompte, enregistrement et génération
du document PDF existants sont conservés.

AJOUTS
• Bouton « Ajouter détail du calcul » sous chaque ligne de prestation.
• Grande zone « Détail du calcul » acceptant texte libre, calculs, puces,
  explications longues et retours à la ligne.
• Bouton « Supprimer détail du calcul » pour effacer le bloc concerné.
• Enregistrement du champ calculationDetail avec sa ligne dans l’historique
  local des devis.
• Restauration automatique lors du rechargement d’un devis existant.
  Les anciens devis sans ce champ restent compatibles.
• Affichage sous la prestation concernée dans le document PDF, avec une
  police plus petite et un encadré gris discret.
• Aucun bloc n’apparaît dans le PDF si le champ est vide.
• Reprise du détail dans l’e-mail de devis.

BASE DE DONNÉES
Le module Devis de cette version enregistre ses devis dans l’historique local
du navigateur. Aucune migration de base de données n’est nécessaire.

VÉRIFICATIONS AUTOMATISÉES
• Création d’un nouveau devis.
• Ajout, sauvegarde, rechargement et suppression du détail.
• Modification d’un devis existant.
• Conservation des puces et retours à la ligne.
• Affichage conditionnel dans le document destiné au PDF.
• Conservation des prix, totaux, remise, TVA et acompte.
• Sécurisation du détail dans l’e-mail HTML.

FICHIERS MODIFIÉS
admin/devis.html
netlify/functions/admin-send-devis.mjs
version.txt

FICHIER DE TEST AJOUTÉ
tests/admin-quote-calculation-detail.test.mjs
