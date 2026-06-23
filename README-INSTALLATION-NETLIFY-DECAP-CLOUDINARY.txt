INSTALLATION PRO - CLEAN-CITÉ
Netlify + Decap CMS + Cloudinary

CONTENU DU ZIP
- index.html : accueil
- avant-apres.html : page Avant / Après connectée au fichier data/interventions.json
- planning.html : page planning
- admin/index.html : espace admin privé
- admin/config.yml : configuration Decap CMS + Cloudinary
- data/interventions.json : base des interventions avant/après
- images/ : logo, agent et images du site

ÉTAPE 1 — METTRE LE SITE SUR GITHUB
1. Créez un compte GitHub si besoin.
2. Créez un nouveau dépôt, par exemple : cleancite-site.
3. Envoyez tout le contenu du ZIP dans le dépôt, en gardant index.html à la racine.

ÉTAPE 2 — CONNECTER GITHUB À NETLIFY
1. Connectez-vous à Netlify.
2. Cliquez sur Add new site > Import an existing project.
3. Choisissez GitHub puis sélectionnez le dépôt cleancite-site.
4. Build command : laissez vide.
5. Publish directory : .
6. Déployez le site.

ÉTAPE 3 — ACTIVER L’ESPACE ADMIN
1. Dans Netlify, ouvrez votre site.
2. Allez dans Identity et cliquez sur Enable Identity.
3. Dans Registration preferences, choisissez Invite only.
4. Allez dans Services puis activez Git Gateway.
5. Dans Identity > Invite users, invitez votre adresse email.
6. Acceptez l’invitation reçue par email.
7. Ouvrez : https://votre-site.netlify.app/admin/

ÉTAPE 4 — CONNECTER CLOUDINARY
1. Créez un compte Cloudinary.
2. Dans le tableau de bord Cloudinary, récupérez : Cloud name et API Key.
3. Ouvrez le fichier admin/config.yml.
4. Remplacez :
   A_REMPLACER_PAR_VOTRE_CLOUD_NAME
   A_REMPLACER_PAR_VOTRE_API_KEY
5. Remplacez aussi les lignes site_url et display_url avec l’adresse réelle du site Netlify.
6. Enregistrez et publiez les changements sur GitHub.

ÉTAPE 5 — AJOUTER UNE INTERVENTION AVANT / APRÈS
1. Ouvrez /admin.
2. Connectez-vous.
3. Cliquez sur Gestion du site > Avant / Après de mes interventions.
4. Ajoutez une intervention.
5. Remplissez : titre, type, ville, date, description, photo avant, photo après.
6. Activez Publier sur le site.
7. Cliquez sur Publish.
8. Netlify republiera le site automatiquement.

IMPORTANT
- Ne mettez jamais votre API Secret Cloudinary dans le site.
- Le fichier admin/config.yml utilise seulement Cloud name + API Key.
- L’espace /admin est protégé par Netlify Identity. Ne laissez pas l’inscription ouverte au public.
