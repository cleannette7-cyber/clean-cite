CLEAN-CITÉ — MODULE FACTURES ADMIN

Accès : /admin/factures.html

Fonctions :
- Création de facture depuis zéro ou import du dernier devis local.
- Numéro de facture unique attribué à la finalisation : F-AAAA-0001, F-AAAA-0002…
- Conservation serveur via Netlify Blobs (persistante entre les déploiements).
- Client professionnel ou particulier.
- Champs préparatoires à la facturation électronique : SIREN client, catégorie de l'opération, option TVA sur les débits.
- TVA configurable ; si TVA = 0 %, une mention justificative est requise.
- Dates de facture, prestation et échéance.
- Montant payé et reste à payer.
- PDF via impression du navigateur.
- Envoi par e-mail via BREVO_API_KEY.
- Partage WhatsApp.

IMPORTANT :
Le PDF et l'envoi e-mail fonctionnent comme facturation classique. Ils ne remplacent pas la transmission via une plateforme agréée (PA) lorsque l'obligation de facturation électronique s'applique. La structure du module est préparée pour un futur connecteur PA/API.

Une facture finalisée est volontairement considérée comme verrouillée. En cas d'erreur comptable, il faut établir une facture rectificative / un avoir au lieu de modifier l'original.
