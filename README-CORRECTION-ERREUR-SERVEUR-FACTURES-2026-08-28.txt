CLEAN-CITÉ — CORRECTION ERREUR SERVEUR FACTURES

Cause identifiée :
- package.json utilisait @netlify/blobs = latest
- la branche latest est passée à v11, qui exige Node.js 22.12+
- le site Clean-Cité est configuré en Node.js 20
- la fonction admin-invoices pouvait donc échouer avant de retourner une réponse JSON.

Corrections :
- @netlify/blobs verrouillé sur 10.7.13, compatible Node 20
- création du store déplacée dans le try/catch
- erreurs serveur désormais remontées proprement à l'interface
- endpoint interne health ajouté pour diagnostic

Après mise en ligne :
1. Netlify > Deploys
2. Trigger deploy > Clear cache and deploy site
3. Revenir sur /admin/factures.html
4. Vérifier que la zone Factures enregistrées affiche soit la liste, soit « Aucune facture finalisée ».
