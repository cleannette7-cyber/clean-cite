CORRECTION ADMIN — BOUTON DEVIS

Problème constaté :
Decap CMS pouvait recouvrir le raccourci "Créer un devis client" dans /admin/.

Correction :
- /admin/ est maintenant un vrai tableau de bord administrateur.
- Bouton principal visible : "Créer et envoyer un devis" -> /admin/devis.html
- Bouton "Gérer le site" -> /admin/cms.html
- Le CMS est déplacé sur sa propre page et ne masque plus le module devis.
- Accès limité au compte administrateur cleannette7@gmail.com.

Après déploiement :
1. Netlify > Deploys > Clear cache and deploy site.
2. Ouvrir https://clean-cite.org/admin/
3. Se connecter avec cleannette7@gmail.com
4. Le bouton "Créer et envoyer un devis" doit apparaître au centre du tableau de bord.

Accès direct de secours :
https://clean-cite.org/admin/devis.html
