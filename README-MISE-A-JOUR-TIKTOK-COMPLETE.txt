MISE À JOUR COMPLÈTE CLEAN-CITÉ — AGENT TIKTOK + PHOTOS
=====================================================

Cette archive contient le site entier, prêt à être déployé sur GitHub en remplacement
de la précédente archive complète. Elle reprend la dernière archive du site retrouvée :
« Clean-Cite-MISE-A-JOUR-PROSPECTION-MULTI-ACTIVITES.zip », version 3 du 22/09/2026.

Tous les fichiers de cette base sont présents. Les seules modifications du site sont :
- admin/index.html : ajout de la carte « Agent TikTok » au tableau de bord ;
- admin/tiktok.html : agent, import de photos et programmation après validation ;
- netlify/functions/tiktok-agent.mjs : brouillons, connexion Buffer et programmation ;
- netlify/functions/tiktok-media.mjs : hébergement HTTPS des photos importées ;
- version.txt : identification de cette version.

Les fonctions de devis, factures, Mail IA, prospection, SEO et les pages publiques
proviennent de la même archive de base. Aucun changement manuel de code n'est
nécessaire : décompresser ce ZIP et déployer l'ensemble de son contenu à la racine
du dépôt GitHub du site Clean-Cité. Conserver les variables Netlify existantes,
notamment GEMINI_API_KEY. Aucune nouvelle dépendance npm n'est requise.

Après le déploiement : ouvrir https://clean-cite.org/admin/ avec le compte
administrateur, puis la carte « Agent TikTok ».

L'agent génère une publication ou trois idées pour la semaine, propose accroches,
légendes, hashtags et prises de vue, conserve les brouillons et prépare des
réponses aux commentaires ou messages collés dans le module. La date du calendrier
reste un repère ; la date et l'heure de programmation sont choisies séparément.

LIAISON TIKTOK, ÉTAPE PAR ÉTAPE
1. Créer un compte Buffer sur https://buffer.com/ et connecter le profil TikTok
   Clean-Cité depuis Buffer. Autoriser la connexion demandée par TikTok.
2. Créer une clé personnelle dans https://publish.buffer.com/settings/api.
3. Dans Netlify > configuration du site > variables d'environnement, créer
   BUFFER_API_KEY avec cette clé. Ne jamais placer la clé dans GitHub ou dans
   une page du site. Redéployer le site après l'ajout de la variable.
4. Dans /admin/tiktok.html, cliquer sur « Actualiser la connexion » ; sélectionner
   le compte TikTok trouvé. La clé ne s'affiche jamais dans la page.
5. Créer/enregistrer un brouillon au format Photo ou Carrousel, ajouter 1 à 10
   photos réelles (ou un lien HTTPS direct), relire la légende, passer le suivi à
   « validé », choisir une date et une heure, cocher l'accord, puis cliquer sur
   « Programmer dans Buffer ». Vérifier ensuite la file de publication Buffer.

Les fichiers JPG, PNG et WebP sont convertis en JPEG et réduits par le navigateur
avant d'être envoyés dans Netlify Blobs. Chaque photo importée reçoit une URL
publique stable pour que Buffer puisse y accéder. Ne téléverser que des visuels
dont Clean-Cité dispose des droits et de l'accord nécessaire. Les anciens visuels
du site restent utilisables avec un chemin /images/uploads/... ou une URL HTTPS.

L'agent ne publie jamais sans action explicite de l'administrateur. La
programmation demande un compte TikTok connecté à Buffer et la variable
BUFFER_API_KEY ; sans elles, les brouillons et l'import de photos restent
utilisables. Aucun commentaire ni message privé n'est envoyé automatiquement.
La programmation n'a pas pu être testée avec un compte réel ni une clé Buffer :
faire une première publication de contrôle et vérifier le résultat dans Buffer
et sur TikTok. Les posts programmés se corrigent dans Buffer.
