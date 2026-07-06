VERSION V5 — Comptes clients libres + admin sécurisé

Objectif :
- Les visiteurs peuvent créer leur compte client librement depuis /espace-client.html.
- Aucun compte client ne voit le bouton Administration.
- Seul l’email cleannette7@gmail.com peut accéder à /admin/.

Réglage Netlify recommandé :
1. Project configuration > Identity > Registration > Configure.
2. Registration : Open.
3. Email confirmation : Required.
4. Ne pas donner volontairement le rôle admin aux clients.

Sécurité dans le code :
- /espace-client.html affiche le bouton Administration uniquement si user.email === cleannette7@gmail.com.
- /admin/index.html refuse tous les autres emails, même si l’utilisateur est connecté.

Après installation :
- Remplacer les fichiers du dépôt GitHub par ceux de ce ZIP.
- Netlify > Deploys > Trigger deploy > Clear cache and deploy site.
- Tester avec un compte client différent de cleannette7@gmail.com : il ne doit pas voir Administration.
- Tester avec cleannette7@gmail.com : le bouton Administration doit apparaître.
