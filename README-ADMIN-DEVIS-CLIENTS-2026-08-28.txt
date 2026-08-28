CLEAN-CITÉ — MODULE ADMIN DEVIS CLIENTS
Mise à jour : 28/08/2026

NOUVEAU
- Accès admin : /admin/devis.html
- Raccourci "Créer un devis client" visible dans l'administration Decap.
- Accès protégé par Netlify Identity : seul cleannette7@gmail.com est autorisé.
- Saisie client : nom/société, email, téléphone, ville, adresse.
- Tarifs Clean-Cité synchronisés avec le site.
- Chantier en cours : nombre d'agents × heures/jour × jours × 28 € HT/h.
- Plusieurs lignes de prestations possibles + lignes libres.
- TVA sélectionnable, remise, acompte, validité, observations et conditions.
- Envoi direct par email via Brevo au client + copie Clean-Cité.
- WhatsApp prérempli.
- Bouton Imprimer / PDF via la fonction d'impression du navigateur.
- Historique local des 20 derniers devis sur l'appareil utilisé.

CONFIGURATION EMAIL
Le module réutilise les variables déjà prévues par Clean-Cité :
- BREVO_API_KEY
- BREVO_SENDER_EMAIL (optionnel)
- BREVO_SENDER_NAME (optionnel)
- CLEAN_CITE_EMAIL (optionnel)
- CLEAN_CITE_ADMIN_EMAIL (optionnel ; défaut : cleannette7@gmail.com)

Si BREVO_API_KEY existe déjà sur Netlify, aucune nouvelle clé n'est nécessaire.
Sans Brevo, le module propose un email manuel en secours.


MISE À JOUR 28/08/2026 — PDF SANS E-MAIL
- Le téléphone client est obligatoire pour créer un devis.
- L'e-mail client est facultatif.
- Le devis peut être enregistré/imprimé en PDF sans e-mail.
- L'e-mail n'est requis que lorsque l'administrateur clique sur « Envoyer par e-mail ».
- WhatsApp utilise uniquement le numéro de téléphone du client.
