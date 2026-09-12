CLEAN-CITÉ — CORRECTION QUOTA GEMINI V12.1
=========================================

Le quota de l'API Gemini dépend du projet Google et du modèle configuré dans
Netlify. Une erreur 429 n'indique pas une panne Gmail et aucun e-mail n'est
envoyé quand la génération échoue.

En attendant que le quota se libère, passer Admin > Mail IA > Mode en
« Brouillon · validation obligatoire », puis enregistrer. Cela arrête les
analyses automatiques toutes les cinq minutes. Vérifier les limites et l'usage
réels du projet dans Google AI Studio. Un délai « Please retry in » n'assure
pas à lui seul que le quota quotidien est disponible.

Cette correction réutilise les brouillons déjà enregistrés pour un message,
au lieu de rappeler Gemini à chaque passage automatique. L'administration
affiche quand un brouillon vient du cache et permet de le régénérer
explicitement. Après une erreur de quota, les analyses automatiques sont
suspendues au moins 30 minutes ; la génération manuelle reste possible.
L'erreur 429 est présentée clairement sans exposer le message technique brut.

Le code du site, du pré-devis et de l'envoi Gmail reste identique à la V12
en dehors des fichiers Admin > Mail IA et de sa fonction serveur. Cette
correction a été vérifiée localement mais pas encore par un envoi Gmail réel.

Pour installer : copier le contenu de l'archive à la racine du dépôt sur
une branche de test, vérifier /version.txt puis l'aperçu Netlify avant fusion.
