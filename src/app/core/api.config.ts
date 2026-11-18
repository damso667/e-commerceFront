import { InjectionToken } from '@angular/core';

/**
 * Où vit l'API.
 *
 * Trois cibles possibles, essayées dans cet ordre au démarrage :
 *
 * 1. **`http://localhost:8080`** — l'API lancée sur la machine. Testée en
 *    premier pour qu'un développement local prenne toujours le dessus.
 * 2. **La même origine** (chemins relatifs) — le serveur de développement
 *    d'Angular, ou l'hébergeur du front en production, relaie `/api` vers
 *    l'API distante.
 * 3. **L'URL absolue de l'API déployée**, en dernier recours.
 *
 * **Pourquoi privilégier la même origine plutôt que l'URL absolue :**
 * l'API authentifie par cookie de session. Appelée depuis un autre domaine,
 * ce cookie devient un cookie tiers — que les navigateurs récents bloquent
 * par défaut, indépendamment de `SameSite` et de CORS. La session s'ouvre
 * alors, puis n'accompagne plus aucune requête, et toutes les routes
 * protégées répondent 401. Passer par un relais rend le cookie
 * *first-party*, ce qui supprime le problème au lieu de le contourner.
 *
 * En développement, le relais est `proxy.conf.json`. En production, c'est à
 * l'hébergeur du front de réécrire `/api` vers l'API ; sans cette
 * réécriture, l'URL absolue sert de repli et le cookie dépendra alors du
 * réglage du navigateur.
 */
export const API_LOCALE = 'http://localhost:8080';
export const API_RENDER = 'https://ecommerce-api-60sl.onrender.com';

/** Chaîne vide = même origine, donc chemins relatifs. */
export const API_MEME_ORIGINE = '';

/** Résolue au démarrage puis injectée partout. */
export const BASE_API = new InjectionToken<string>('BASE_API');

/**
 * Le plan gratuit de Render endort l'instance après 15 min et son réveil
 * mesuré est d'environ 150 s. Toute requête doit donc tolérer une attente
 * très supérieure à la normale, et l'interface doit l'expliquer plutôt que
 * de paraître cassée.
 */
export const DELAI_REVEIL_MS = 180_000;

/** Au-delà de ce délai sans réponse, on prévient que le serveur se réveille. */
export const SEUIL_MESSAGE_REVEIL_MS = 4_000;

function tourneEnLocal(): boolean {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');
}

/**
 * Teste une cible. Délai volontairement court : il s'agit de savoir si
 * quelque chose répond, pas d'attendre un réveil — le démarrage de
 * l'application ne doit pas être retardé par une hypothèse.
 */
async function repond(base: string, delaiMs: number): Promise<boolean> {
  try {
    const abandon = new AbortController();
    const minuteur = setTimeout(() => abandon.abort(), delaiMs);
    const reponse = await fetch(`${base}/actuator/health`, {
      signal: abandon.signal,
      credentials: 'omit',
    });
    clearTimeout(minuteur);
    return reponse.ok;
  } catch {
    return false;
  }
}

export async function detecterApi(): Promise<string> {
  // 1. L'API lancée sur la machine, uniquement quand l'application tourne
  //    elle-même en local : sonder localhost depuis un domaine public
  //    serait une requête vouée à l'échec sur le téléphone de chaque
  //    visiteur.
  if (tourneEnLocal() && (await repond(API_LOCALE, 1_500))) {
    console.info('[api] serveur local détecté');
    return API_LOCALE;
  }

  // 2. Un relais sur la même origine. Le délai est plus large : derrière le
  //    relais se trouve peut-être une instance endormie.
  if (await repond(API_MEME_ORIGINE, 8_000)) {
    console.info('[api] relais sur la même origine');
    return API_MEME_ORIGINE;
  }

  // 3. Repli : appel direct. La session dépendra alors du réglage des
  //    cookies tiers du navigateur.
  console.info('[api] appel direct de', API_RENDER);
  return API_RENDER;
}
