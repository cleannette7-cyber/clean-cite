CLEAN-CITÉ — ASSISTANT IA AVEC PHOTOS — 28/08/2026

Cette version ajoute l'analyse de photos à l'assistant Gemini existant.

Fonctionnement client :
- Jusqu'à 4 photos par analyse.
- Choix depuis la galerie ou prise de photo directe sur téléphone.
- Aperçu et suppression avant l'envoi.
- Les images sont redimensionnées côté navigateur avant l'envoi afin de limiter le poids de la requête.
- L'assistant Gemini analyse l'état visible du lieu et combine cette analyse avec les informations du pré-devis.
- Si une donnée essentielle manque (par exemple la surface), l'IA doit la demander au lieu de l'inventer.
- L'analyse est présentée comme un « PRÉ-DEVIS IA ESTIMATIF » et non comme un prix contractuel.

Sécurité / confidentialité :
- La clé GEMINI_API_KEY reste uniquement dans les variables d'environnement Netlify.
- La clé n'est jamais exposée dans le navigateur ni dans GitHub.
- Les photos sont transmises à la fonction Netlify, qui les envoie à Gemini pour l'analyse.
- Le site ne joint pas automatiquement les images à l'email de devis ; il transmet la synthèse IA et le nombre de photos analysées.
- Éviter de photographier des documents contenant des données personnelles qui ne sont pas utiles au devis.

Limites prévues :
- 4 photos maximum.
- JPG, PNG ou WebP.
- Les photos sont converties/redimensionnées en JPEG côté navigateur.
- L'IA ne doit jamais inventer la surface, l'accessibilité, la hauteur, le nombre d'étages ou des zones hors champ.
- Le devis final doit toujours être confirmé par Clean-Cité.

Netlify :
AUCUNE nouvelle variable n'est nécessaire.
La variable existante GEMINI_API_KEY suffit.
Le modèle par défaut reste gemini-2.5-flash sauf si GEMINI_MODEL est défini.
