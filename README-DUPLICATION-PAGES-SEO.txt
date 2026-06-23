PLAN POUR DUPLIQUER UNE PAGE VILLE CLEAN-CITÉ

Objectif : créer rapidement une nouvelle page locale optimisée Google.

1. Dupliquer une page existante
Exemple : copier nettoyage-bobigny.html et renommer :
- nettoyage-montreuil.html
- nettoyage-bondy.html
- nettoyage-noisy-le-sec.html
- nettoyage-aulnay-sous-bois.html
- nettoyage-le-blanc-mesnil.html

2. Remplacer partout dans la page
- Bobigny -> Nom de la ville ciblée
- bobigny -> slug de la ville en minuscule, sans accent, avec tirets
- nettoyage-bobigny.html -> nettoyage-nouvelle-ville.html

3. Ne pas modifier l'adresse officielle Clean-Cité
L'adresse de l'entreprise reste : 149 rue de Paris, 93000 Bobigny.
Même sur les pages Montreuil, Bondy ou Paris, c'est l'adresse de l'entreprise.

4. Adapter le texte pour éviter les pages copiées à 100%
Changer au minimum :
- Le titre H1
- Le paragraphe d'introduction
- La section “Pourquoi choisir Clean-Cité à [ville]”
- Le placeholder du formulaire
- Le lien WhatsApp pré-rempli

5. Ajouter la page dans sitemap.xml
Ajouter un bloc :
<url>
  <loc>https://clean-cite.org/nettoyage-nouvelle-ville.html</loc>
</url>

6. Ajouter la carte dans la section Zones de index.html
Créer une carte identique aux autres avec le bon lien.

7. Contrôle final
Avant publication, vérifier :
- La balise title contient la ville.
- La meta description contient la ville.
- Le canonical correspond au nouveau fichier.
- Le H1 contient “Entreprise de nettoyage à [ville]”.
- Le formulaire fonctionne.
- Le lien WhatsApp contient la bonne ville.
