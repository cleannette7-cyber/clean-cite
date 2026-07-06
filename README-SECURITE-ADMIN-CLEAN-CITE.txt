Sécurité admin Clean-Cité

Cette version bloque l'accès à /admin/ pour tous les comptes sauf :
cleannette7@gmail.com

À faire dans Netlify pour terminer la sécurisation :
1. Project configuration > Identity > Registration > Configure
2. Mettre Registration sur Open / Ouvert pour autoriser la création libre de comptes clients
3. Project configuration > Identity > Users
4. Garder le rôle admin uniquement sur cleannette7@gmail.com
5. Pour tous les autres comptes clients : retirer le rôle admin ou mettre client
6. Redéployer le site : Deploys > Trigger deploy > Clear cache and deploy site

Important : le code empêche l'affichage de l'administration à tout autre email, mais la bonne pratique reste aussi de corriger les rôles dans Netlify Identity.
