# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existant, non négociable : Angular 20.3 (standalone, signals), CSS natif
(pas de préprocesseur), PWA. Dépôt `damso667/e-commerceFront`, public.

API consommée : Spring Boot 4 / PostgreSQL (Supabase), dépôt séparé
`damso667/e-commerceBd`, déployée sur Render.

## Users

Trois publics, tous distincts :

1. **L'acheteur** — particulier camerounais, sur téléphone Android d'entrée
   ou milieu de gamme, connexion mobile irrégulière, souvent en déplacement.
   Il cherche un article, compare quelques prix, et paie par mobile money
   (MTN MoMo ou Orange Money) depuis le même téléphone. Il ne possède pas de
   carte bancaire.
2. **Le marchand / administrateur** — exploite une boutique. Il gère
   catalogue, stock, commandes, paiements et remboursements depuis le
   back-office. Il n'est pas développeur.
3. **L'acquéreur de la plateforme** — achète l'application pour l'exploiter
   sous sa propre marque. Confirmé par l'utilisateur : « je vends l'app à
   plusieurs personnes ». Il doit pouvoir tout rebrander sans toucher au
   code ni redéployer.

## Product Purpose

Vendre en ligne sur un marché où le mobile money est le moyen de paiement
courant et la carte bancaire l'exception.

Le produit est vendu deux fois : comme boutique à ses acheteurs, et comme
plateforme réutilisable à des marchands. Le succès se mesure donc à deux
endroits : une commande qui aboutit malgré une connexion instable, et un
marchand qui installe sa marque sans assistance.

## Positioning

Deux mécanismes qu'un concurrent ne pourrait pas copier sans les construire :

- **Un paiement mobile money correct.** Idempotence à quatre niveaux,
  machine à états où un statut terminal n'est jamais réécrit, réconciliation
  active parce qu'aucun opérateur ne garantit la livraison de ses webhooks.
  L'implémentation existe déjà côté API et est éprouvée en simulation.
- **White-label par configuration, pas par fork.** Le marchand change nom,
  logo et icônes depuis le back-office. Aucune recompilation.

## Operating Context

- **Réseau.** 3G irrégulière, latence élevée, coupures. Tout écran doit
  rester lisible pendant l'attente et survivre à un échec de requête.
- **Appareils.** Android majoritaire, écrans à partir de 360 px, usage à une
  main. Le bureau existe surtout pour le back-office.
- **Paiement.** Hors de l'application : le client valide sur son téléphone
  via un code USSD. L'interface doit donc assumer une attente de plusieurs
  secondes à plusieurs minutes, puis un résultat qui arrive de façon
  asynchrone — succès, refus, ou expiration.
- **Hébergement actuel.** Plan gratuit Render : l'API s'endort après 15 min
  d'inactivité et son réveil prend environ 150 s. Le front doit rendre cette
  attente compréhensible au lieu de paraître cassé.
- **Devise.** FCFA (XAF), sans sous-unité. Montants entiers.

## Capabilities and Constraints

**Déjà disponible côté API** (vérifié, testé) :

- catalogue public, catégories, avis ;
- inscription, connexion par **session + cookie** (pas de JWT) — le front
  doit donc envoyer `withCredentials` sur chaque appel ;
- panier, commande, paiement MTN / Orange avec en-tête `Idempotency-Key`,
  suivi de statut par interrogation répétée ;
- back-office : tableau de bord par période, séries journalières, paiements
  et remboursements, articles et stock, catégories, clients, avis, journal
  d'audit. Listes paginées (`page`, `size`, `sort`), enveloppe `PageReponse`.

**À construire côté API pour tenir la promesse white-label** (n'existe pas
encore, identifié pendant cet entretien) :

- paramètres de boutique lisibles publiquement et modifiables par l'admin :
  nom, logo, icônes de l'application ;
- stockage du logo. Le disque Render est éphémère : le binaire doit vivre en
  base ou chez un tiers, pas sur le système de fichiers.

**Contraintes à respecter :**

- `PAIEMENT_MODE=simulation` en production actuellement : aucun argent réel
  ne circule. L'interface ne doit pas laisser croire le contraire.
- CORS restreint à une liste d'origines ; toute nouvelle origine de
  déploiement doit être ajoutée côté API.
- Aucune image produit n'existe. Confirmé par l'utilisateur : « rien pour
  l'instant ». L'interface doit être présentable sans une seule photo.

**Terminologie du domaine** (celle de l'API, à conserver dans l'interface) :
article, catégorie, panier, commande, paiement, avis, fournisseur de
paiement. Statuts de commande : `EN_ATTENTE`, `PAYEE`, `EN_COURS`,
`LIVREE`, `ANNULEE`. Statuts de paiement : `EN_ATTENTE`, `EN_COURS`,
`PAYE`, `ECHOUE`, `EXPIRE`, `ANNULE`, `REMBOURSE`.

## Brand Commitments

- **Nom par défaut : QALF SHOP.** Contrainte explicite de l'utilisateur : ce
  nom est une valeur par défaut, pas une constante. L'administrateur doit
  pouvoir le changer, ainsi que le logo et « jusqu'aux images natives de
  l'app ». Aucun nom ni logo ne doit être codé en dur dans un composant.
- **Langue : français.** L'interface, les messages d'erreur et les libellés
  sont en français.
- **Couleur unique : émeraude profond `#0B6B5E`.** Contrainte explicite :
  une seule couleur de marque, pas de multicouleur. Les couleurs de statut
  (succès, erreur) restent permises car elles portent du sens.
- **Registre visuel : le standard du e-commerce, joué droit.** Préférence
  durable établie par l'utilisateur après avoir vu et rejeté une direction
  plus singulière : « fais ça en cartes », « c'est quelle manière de
  présenter un produit e-commerce », « le visuel c'est zéro », « pas de
  barre de recherche », « pas de panier », « même un carrousel d'images ».
  Les conventions que les acheteurs connaissent déjà — cartes produit,
  recherche visible en permanence, panier toujours accessible, carrousel —
  sont donc **acquises et non rediscutées**. L'ambition se joue sur la
  qualité d'exécution, pas sur l'écart au modèle.
- Aucun logo, aucune charte, aucune police imposée n'existe aujourd'hui.

## Evidence on Hand

- **API réelle et déployée** : https://ecommerce-api-60sl.onrender.com —
  c'est la seule source de données. Aucune donnée ne doit être simulée côté
  front.
- **Catalogue d'amorçage** : 4 articles sur 5 catégories, à étoffer
  (demande explicite de l'utilisateur : « ajoute le maximum d'articles à la
  création initiale »).
- **Aucune photo produit.** Les URL actuelles pointent vers le cache
  d'images Google : temporaires, ratios irréguliers, à ne pas considérer
  comme un actif.
- **Aucun avis client réel, aucun témoignage, aucun chiffre de vente,
  aucune mention légale.** Rien de tout cela ne doit être inventé pour
  remplir une page.

## Product Principles

1. **L'attente est un état de l'interface, pas un accident.** Réveil de
   l'API, validation USSD, 3G lente : chaque attente a sa forme, stable et
   explicite. Jamais d'écran figé ni de spinner seul sans explication.
2. **Présentable sans photo.** Le placeholder est un composant de premier
   plan, conçu, pas un rectangle gris de secours.
3. **Rien de la marque n'est codé en dur.** Nom, logo, icônes viennent de
   l'API. C'est ce qui rend l'application revendable.
4. **Ne jamais inventer de preuve.** Pas de faux avis, pas de fausses
   statistiques, pas de mentions légales fabriquées. Un emplacement vide et
   annoncé vaut mieux qu'un contenu faux.
5. **Le téléphone d'abord, et le pouce.** Cibles tactiles confortables,
   actions principales à portée, aucun défilement horizontal.

## Accessibility & Inclusion

Aucune norme contractuelle n'a été établie par l'utilisateur. Exigences
retenues comme plancher, cohérentes avec le contexte d'usage : contraste du
texte à 4,5:1 minimum, cibles tactiles de 44 px, navigation clavier
possible avec focus visible, erreurs annoncées aux lecteurs d'écran,
`prefers-reduced-motion` respecté.
