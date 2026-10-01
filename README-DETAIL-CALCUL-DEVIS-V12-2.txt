CLEAN-CITÉ — DÉTAIL DU CALCUL PAR PRESTATION — V12.2
====================================================

Cette mise à jour améliore uniquement le module existant Admin > Créer un devis.
Elle ne crée aucune nouvelle page et ne modifie ni les tarifs, ni les totaux,
ni la TVA, ni le fonctionnement général du devis.

AJOUTS
• Bouton « Ajouter détail du calcul » sous chaque ligne de prestation.
• Grande zone « Détail du calcul » acceptant texte libre, calculs, puces,
  explications longues et retours à la ligne.
• Bouton « Supprimer détail du calcul » pour effacer le bloc concerné.
• Enregistrement du champ calculationDetail avec sa ligne dans l'historique
  local des devis.
• Restauration automatique du détail lors du rechargement et de la modification
  d'un devis existant. Les anciens devis sans ce champ restent compatibles.
• Affichage dans le PDF directement sous la prestation, dans un encadré gris
  discret avec une police plus petite. Aucun bloc n'apparaît si le champ est vide.
• Reprise du détail dans l'e-mail de devis et le résumé WhatsApp.

VÉRIFICATIONS
• Création d'un nouveau devis.
• Ajout et suppression d'un détail.
• Sauvegarde et rechargement d'un devis existant.
• Conservation des puces et retours à la ligne.
• Affichage dans le document destiné au téléchargement PDF.
• Conservation des prix, totaux, remise, TVA et acompte.

FICHIERS MODIFIÉS
admin/devis.html
netlify/functions/admin-send-devis.mjs
package.json
version.txt

FICHIERS AJOUTÉS
tests/admin-quote-calculation-detail.test.mjs
README-DETAIL-CALCUL-DEVIS-V12-2.txt
