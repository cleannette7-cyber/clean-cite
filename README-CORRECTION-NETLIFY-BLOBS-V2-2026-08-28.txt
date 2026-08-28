CORRECTION FACTURES — NETLIFY BLOBS / FUNCTIONS V2
Date : 28/08/2026

Cause confirmée :
La fonction admin-invoices utilisait le format Netlify Functions v1 (export handler).
Dans ce format, Netlify Blobs ne reçoit pas automatiquement le contexte sécurisé siteID/token.
Cela provoquait :
"The environment has not been configured to use Netlify Blobs... siteID, token"

Correction :
- admin-invoices.mjs convertie en Netlify Functions v2 avec export default.
- getStore() reste créé à l'intérieur de la requête.
- authentification serveur migrée vers @netlify/identity getUser().
- aucune clé Netlify Blobs, aucun siteID et aucun Personal Access Token à mettre dans GitHub.
- @netlify/blobs verrouillé en 10.7.13.
- @netlify/identity ajouté en 2.0.0.

Après mise à jour :
Netlify > Deploys > Trigger deploy > Clear cache and deploy site.
Puis se reconnecter à /admin/ et tester Factures.
