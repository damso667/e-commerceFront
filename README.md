# QALF SHOP — interface

Front Angular 20 d'une boutique en ligne avec paiement mobile money
(MTN Mobile Money, Orange Money). Progressive Web App, pensée pour un
téléphone Android et une connexion irrégulière.

L'API est dans un dépôt séparé : [e-commerceBd](https://github.com/damso667/e-commerceBd)
(Spring Boot 4, PostgreSQL), déployée sur Render.

---

## Démarrer

```bash
npm install
```

```bash
npm start
```

L'application écoute sur `http://localhost:4200`.

**Aucune configuration n'est nécessaire.** Au démarrage, l'application
cherche une API locale sur `http://localhost:8080` ; si elle ne répond pas
en 1,5 s, elle bascule sur l'API déployée. Cette sonde n'est tentée que
lorsque l'application tourne elle-même en local, jamais depuis un domaine
public.

---

## Ce que fait l'application

**Boutique** — catalogue, recherche, fiche article, panier, commande et
paiement mobile money avec suivi du statut, historique des commandes,
compte client.

**Back-office** `/admin` — tableau de bord, suivi des paiements et
remboursements, catalogue et stock, commandes, clients, modération des
avis, journal d'audit, et l'identité de la boutique.

---

## Identité modifiable sans redéploiement

Le nom, le slogan, la couleur, le logo et l'icône de l'application
installée viennent de l'API et se changent depuis le back-office. Rien de
tout cela n'est écrit dans le code.

Le manifeste PWA est lui-même engendré par l'API : le nom et l'icône de
l'application installée sur le téléphone suivent donc les réglages, là où
un manifeste statique les figerait au moment du build.

Un logo et des icônes par défaut sont livrés dans `public/` ; ils cèdent la
place dès qu'un logo est déposé.

---

## Organisation

```
src/app/
  core/        configuration de l'API, intercepteur HTTP, gardes de route,
               état réseau
  models/      types miroirs des réponses de l'API
  services/    tous les appels serveur, un fichier par domaine
  ui/          composants réutilisables : carte produit, carrousel,
               squelettes, placeholders, alertes, montants
  boutique/    coque et pages client
  admin/       coque et pages du back-office
  introuvable/ page 404 et accès refusé
```

Chaque composant tient en trois fichiers : `nom.ts`, `nom.html`,
`nom.css`.

---

## Points d'attention

**Authentification par session.** L'API utilise un cookie de session, pas
un jeton. L'intercepteur pose `withCredentials` sur chaque requête ; sans
lui, toutes les routes protégées répondent 403.

**Paiements idempotents.** Les requêtes de commande, de nouvelle tentative
et de remboursement portent un en-tête `Idempotency-Key`. Un double-clic,
un rechargement ou un retry réseau ne déclenche donc jamais un second
débit.

**Réveil du serveur.** L'API est hébergée sur une offre gratuite : après
quinze minutes sans trafic, elle s'endort et met environ deux minutes à
redémarrer. L'interface l'annonce au lieu de laisser croire à une panne.

**Images.** Aucune photo produit n'est fournie pour l'instant : le
catalogue affiche des pastilles à monogramme, conçues pour cet usage.
L'espace de l'image est réservé à l'avance, donc rien ne saute lorsqu'une
photo arrive.

---

## Commandes

```bash
npm start
```

```bash
npm run build
```

Le service worker n'est actif qu'en production : en développement il
masquerait les changements de code derrière son cache.
