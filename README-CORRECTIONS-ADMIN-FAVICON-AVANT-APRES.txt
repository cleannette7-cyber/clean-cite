CORRECTIONS APPLIQUÉES - CLEAN-CITÉ

1) Admin Decap CMS corrigé
- admin/index.html remplacé par une version complète avec Netlify Identity.
- admin/config.yml réécrit proprement sans erreur YAML.
- Le dossier images/uploads est présent pour les photos ajoutées depuis l’admin.

2) Confirmation email Netlify Identity corrigée
- Le script Netlify Identity a été ajouté aux pages publiques.
- Quand le mail renvoie vers clean-cite.org/#confirmation_token ou #recovery_token, le widget peut traiter le lien.

3) Favicon forcé
- Les liens favicon utilisent ?v=4 pour forcer le navigateur à recharger l’icône.

4) Avant / Après
- La structure admin permet d’ajouter : titre, type de prestation, ville, date, description, photo avant, photo après.

APRÈS DÉPLOIEMENT
1. Attendre le déploiement Netlify complet.
2. Ouvrir https://clean-cite.org en navigation privée.
3. Cliquer le lien reçu par mail ou relancer une invitation Netlify Identity.
4. Aller ensuite sur https://clean-cite.org/admin/

PARAMÈTRES NETLIFY À VÉRIFIER
- Identity : enabled
- Registration : Invite only ou Open
- Email confirmation : Required ou Disabled selon ton choix
- Git Gateway : enabled
- Rôle utilisateur : admin
