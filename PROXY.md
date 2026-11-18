# Pourquoi l'API passe par un relais

L'API authentifie par **cookie de session**. Appelée directement depuis le
domaine du front, ce cookie devient un **cookie tiers**, que Chrome et
Safari bloquent par défaut — indépendamment de `SameSite` et de CORS.

Le symptôme est déroutant : la connexion réussit, l'interface affiche
« connecté », puis chaque action protégée échoue. Le cookie a bien été
émis, il n'accompagne simplement aucune requête.

## La solution retenue

Faire passer `/api` par le domaine du front, pour que le cookie soit
*first-party*.

| Environnement | Mécanisme |
|---|---|
| Développement | `proxy.conf.json`, branché dans `angular.json` |
| Vercel | `rewrites` dans `vercel.json` |
| Autre hébergeur | une règle de réécriture `/api/*` vers l'API |

`core/api.config.ts` essaie dans l'ordre : l'API locale sur le port 8080,
puis la même origine, puis l'URL absolue en dernier recours. Le repli
fonctionne, mais la session y dépendra du réglage des cookies tiers du
navigateur — c'est un filet, pas une cible.

## Si vous changez d'URL d'API

Trois endroits à mettre à jour :

1. `proxy.conf.json` — cible du relais de développement ;
2. `vercel.json` — destination des réécritures ;
3. `core/api.config.ts` — constante `API_RENDER`, utilisée en repli.

Et côté API, ajouter la nouvelle origine du front à
`CORS_ALLOWED_ORIGINS` : le repli direct en a besoin.

## Ce qui est réglé côté API

- `server.servlet.session.cookie.same-site=none` et `secure=true` : requis
  dès que le front et l'API ne partagent pas le même site, y compris avec
  un relais en développement.
- Un point d'entrée renvoie **401** pour une absence de session et **403**
  pour des droits insuffisants. Sans cette distinction, l'interface ne
  pouvait pas savoir s'il fallait proposer une reconnexion.
