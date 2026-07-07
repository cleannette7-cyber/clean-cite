Correction v7 admin Clean-Cité

Cette version corrige le bug Decap CMS dans /admin/ :
- ajoute translate="no" et meta google notranslate pour empêcher Chrome Traduction de casser React/Decap ;
- évite de charger Decap plusieurs fois ;
- garde cleannette7@gmail.com comme seul email autorisé côté page admin ;
- conserve accept_roles: admin dans admin/config.yml.

Après installation :
1. Extraire le ZIP.
2. Remplacer les fichiers dans GitHub.
3. Netlify > Deploys > Trigger deploy > Clear cache and deploy site.
4. Sur Chrome, désactiver la traduction automatique pour clean-cite.org/admin/.
5. Ouvrir https://clean-cite.org/admin/ en navigation normale ou privée.
