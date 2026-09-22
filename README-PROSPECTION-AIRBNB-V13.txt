CLEAN-CITÉ — MISE À JOUR COMPLÈTE AVEC PROSPECTION DES CONCIERGERIES
====================================================================

CE QUE CONTIENT CE ZIP
Cette archive contient le site Clean-Cité complet avec le module de prospection
déjà intégré et visible dans le tableau de bord administrateur. Ce n'est pas un
petit correctif à placer manuellement dans un dossier séparé.

Pour mettre le projet à jour avec GitHub :
1. Dézipper l'archive sur l'ordinateur.
2. Ouvrir le dossier dézippé et sélectionner tout son contenu.
3. Dans le dépôt GitHub Clean-Cité existant, utiliser la procédure habituelle
   d'ajout/mise à jour des fichiers et remplacer les anciens fichiers concernés.
4. Valider la mise à jour (« Commit changes »). Netlify lancera alors le
   nouveau déploiement automatiquement.

Ne pas envoyer le fichier ZIP lui-même dans le dépôt : GitHub doit recevoir les
fichiers et dossiers dézippés. À la fin, index.html, netlify.toml, admin/ et
netlify/ doivent rester au premier niveau du projet, comme dans la version
actuelle du site.

BASE CONSERVÉE
Version V12.1 « quota Gemini » du 12/09/2026. Les pages, devis, factures,
Mail IA, pré-devis, relances de devis et contenus existants sont conservés.

NOUVEAU MODULE — VERSION 1
Adresse : https://clean-cite.org/admin/prospection.html

Le module est déjà relié au bouton « Prospection Airbnb » du tableau de bord
administrateur. Il n'y a aucun fichier du module à déplacer séparément.

Le module permet de :
• rechercher des conciergeries Airbnb par ville, département ou région ;
• effectuer cette recherche en tâche de fond afin d'éviter les coupures lorsque
  plusieurs sites doivent être contrôlés ;
• ouvrir leurs sites professionnels publics et détecter les e-mails publiés ;
• privilégier les boîtes génériques telles que contact@, info@ ou bonjour@ ;
• conserver la page publique d’origine afin de pouvoir vérifier chaque adresse ;
• modifier ou valider l’e-mail avant le premier envoi ;
• envoyer une sélection depuis la boîte Gmail Clean-Cité déjà reliée au Mail IA ;
• détecter une réponse et arrêter automatiquement le suivi ;
• envoyer une seule relance après 7 jours sans réponse ;
• enregistrer les désinscriptions dans une liste d’exclusion ;
• limiter l’ensemble des envois à 20 par jour par défaut (réglable de 1 à 50).

SÉCURITÉ ET CONFORMITÉ
• Aucun envoi initial n’est automatique : l’administrateur sélectionne et confirme.
• Une adresse personnelle détectée doit être validée manuellement.
• Chaque e-mail indique la source publique, l’identité de Clean-Cité et contient un
  lien gratuit de désinscription.
• La relance est annulée dès qu’une réponse, une réponse manuelle de Clean-Cité
  ou une désinscription est détectée.
• Les données de prospection sont purgées après trois ans à compter de leur
  collecte ou du dernier contact émanant du prospect.
• Les résultats Google Maps ne sont pas conservés. Seul l’identifiant du lieu,
  autorisé par les règles Google, est gardé. Les coordonnées sauvegardées
  proviennent ensuite du site professionnel public.
• Les URL sont filtrées avant lecture afin de bloquer les adresses locales,
  privées, les ports inhabituels et les redirections non sûres.

ACTIVATION DANS NETLIFY
1. Dans Google Cloud, activer « Places API (New) » sur un projet avec facturation.
2. Créer une clé API limitée à Places API (New).
3. Dans Netlify > Project configuration > Environment variables, ajouter :
   GOOGLE_PLACES_API_KEY = la clé créée à l’étape précédente.
4. Si le Mail IA fonctionne déjà, conserver simplement ses variables Gmail :
   GOOGLE_GMAIL_CLIENT_ID
   GOOGLE_GMAIL_CLIENT_SECRET
   GMAIL_OAUTH_REDIRECT_URI
   GMAIL_ALLOWED_EMAIL = cleannette7@gmail.com
5. Effectuer la mise à jour complète du dépôt GitHub avec le contenu dézippé,
   en suivant les quatre étapes indiquées au début de ce document.
6. Ouvrir /version.txt et vérifier :
   CLEAN-CITE-V13-PROSPECTION-AIRBNB-2026-09-22
7. Ouvrir Admin > Mail IA et connecter, si nécessaire, l'adresse officielle de
   Clean-Cité : cleannette7@gmail.com. Le module de prospection enverra les
   messages uniquement depuis cette adresse.
8. Ouvrir Admin > Prospection Airbnb et lancer une petite recherche test.

IMPORTANT
Le module et son bouton sont actifs dès le déploiement. La recherche ne peut
toutefois pas fonctionner avant l'ajout de GOOGLE_PLACES_API_KEY dans Netlify,
et l'envoi ne peut pas fonctionner avant la connexion Gmail de Clean-Cité. Ces
deux accès externes sont protégés et ne peuvent pas être inclus directement
dans un ZIP public.

FONCTIONNEMENT DE LA RELANCE
La tâche Netlify « prospecting-followups » s’exécute chaque jour à 08:30 UTC.
Elle ne relance que les prospects contactés depuis le module, arrivés à J+7,
sans réponse et non inscrits sur la liste d’exclusion. Une seule relance est
envoyée dans le même fil Gmail.

COÛTS ET LIMITES
• Google Places API peut être facturée selon l’usage et les champs demandés.
  Le module limite une recherche à 40 résultats et n’utilise pas les notes,
  avis, photos ou numéros de téléphone.
• Certains sites bloquent la lecture automatique ou n’affichent aucun e-mail.
  Ils sont comptés comme « sans coordonnées exploitables » et aucun e-mail
  n’est inventé.
• Une adresse détectée ne garantit pas sa délivrabilité. Il faut la vérifier
  avant une campagne importante.

FICHIERS PRINCIPAUX AJOUTÉS
admin/prospection.html
netlify/functions/_prospecting-core.mjs
netlify/functions/prospecting-api.mjs
netlify/functions/prospecting-search.mjs
netlify/functions/prospecting-followups.mjs
netlify/functions/prospecting-unsubscribe.mjs
conditions-utilisation.html

VÉRIFICATION LOCALE
npm install
npm test
