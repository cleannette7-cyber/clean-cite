Clean-Cité V6 — Planning client privé

Modifications :
- Les clients peuvent créer leur compte librement avec Netlify Identity.
- Seul cleannette7@gmail.com garde l’accès administration.
- La page /planning.html nécessite une connexion.
- Chaque client voit uniquement les interventions dont le champ client_email correspond à son email connecté.
- L’admin cleannette7@gmail.com peut voir le planning général.
- Ajout de la fonction Netlify /.netlify/functions/client-planning pour filtrer le planning côté serveur.
- Ajout des champs “Email du client” et “Nom du client / société” dans l’administration Decap CMS.

À faire dans Netlify :
1. Identity > Registration : Open.
2. Email confirmation : Required.
3. Garder uniquement cleannette7@gmail.com comme administrateur.
4. Après mise à jour GitHub : Deploys > Trigger deploy > Clear cache and deploy site.

Utilisation :
- Pour qu’un client voie son planning, il doit créer un compte avec son email.
- Dans l’admin, quand vous ajoutez une intervention au planning, renseignez exactement le même email dans “Email du client”.
- Un autre client ne verra pas cette intervention.
