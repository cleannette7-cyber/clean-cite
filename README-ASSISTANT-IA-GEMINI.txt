ASSISTANT IA CLEAN-CITÉ - GEMINI
================================

Cette version du site contient :

1. Un assistant IA Gemini visible sur toutes les pages du site.
2. Une fonction Netlify sécurisée : netlify/functions/assistant-gemini.js
3. Un formulaire de devis rapide avec calcul indicatif.
4. Une fonction d'envoi de demande : netlify/functions/send-devis.js
5. Un bouton WhatsApp automatique avec le message pré-rempli.
6. Un fallback mailto si l'API Brevo n'est pas encore configurée.
7. Un sitemap.xml corrigé.
8. Une redirection SEO pour l'ancienne URL : /sortie-de-poubelles.htm -> /sortie-de-poubelles.html
9. Une redirection SEO pour l'ancienne URL : /ile-de-france.html -> /nettoyage-ile-de-france.html

VARIABLES NETLIFY À AJOUTER
===========================

Dans Netlify :
Site configuration -> Environment variables -> Add variable

OBLIGATOIRE POUR GEMINI :
GEMINI_API_KEY = votre clé API Google Gemini

OPTIONNEL POUR LE MODÈLE :
GEMINI_MODEL = gemini-2.5-flash

OPTIONNEL POUR L'EMAIL AUTOMATIQUE BREVO :
BREVO_API_KEY = votre clé API Brevo
BREVO_SENDER_EMAIL = email expéditeur validé dans Brevo
BREVO_SENDER_NAME = Clean-Cité
CLEAN_CITE_EMAIL = email qui reçoit les demandes

Si BREVO_API_KEY n'est pas ajouté, le bouton “Envoyer la demande par email” ouvrira simplement un email prêt à envoyer.

FICHIERS AJOUTÉS
================

assets/assistant-gemini.css
assets/assistant-gemini.js
netlify/functions/assistant-gemini.js
netlify/functions/send-devis.js
_redirects
README-ASSISTANT-IA-GEMINI.txt

FICHIERS MODIFIÉS
=================

Toutes les pages HTML racine ont reçu :
- le CSS de l'assistant dans le head
- le script JS de l'assistant avant la fermeture body

Le sitemap.xml a été corrigé pour utiliser les bonnes URL du site.
Le netlify.toml a été mis à jour pour déclarer le dossier des fonctions Netlify.
