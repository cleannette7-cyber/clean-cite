CLEAN-CITÉ — Déploiement AIRBNB + JIMMY V8

Cette archive contient bien :
- la page /nettoyage-airbnb.html ;
- Airbnb dans le menu Services et les cartes de la page d’accueil ;
- Airbnb dans le pré-devis public et /admin/devis.html ;
- calcul détaillé Airbnb : surface, niveaux, chambres, salles d’eau/douches, WC, cuisines, salons/séjours, rotations ;
- Jimmy avec Gemini + secours local si Gemini est indisponible ;
- Node Netlify 22.12.0 pour compatibilité @netlify/identity 2.0.0 ;
- nouvel asset /assets/assistant-gemini-v8.js pour éviter un ancien cache.

Après déploiement, vérifier :
1) https://clean-cite.org/version.txt doit afficher AIRBNB-JIMMY-V8.
2) https://clean-cite.org/nettoyage-airbnb.html doit s’ouvrir.
3) La page d’accueil doit afficher 12 Services et la carte Airbnb.
4) Admin > Devis doit proposer “Airbnb / location courte durée — calcul détaillé”.
5) Jimmy : “Airbnb 140 m², 3 niveaux, 6 chambres, 5 salles d’eau, 1 cuisine, 1 séjour”.
