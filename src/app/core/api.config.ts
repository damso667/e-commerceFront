import { InjectionToken } from '@angular/core';

/**
 * Où vit l'API.
 *
 * Demande explicite : « le serveur qui est sur render, pour celui du local
 * si il est démarré ». La détection est donc automatique et faite une seule
 * fois au démarrage, par {@link detecterApi} :
 *
 *  1. si l'application elle-même tourne en local (`localhost`), on essaie
 *     `http://localhost:8080` et on l'adopte s'il répond ;
 *  2. sinon, ou si le local ne répond pas, on prend Render.
 *
 * On ne teste jamais le local depuis un domaine public : ce serait une
 * requête vouée à l'échec sur le téléphone de chaque visiteur.
 */
export const API_LOCALE = 'http://localhost:8080';
export const API_RENDER = 'https://ecommerce-api-60sl.onrender.com';

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
 * Choisit l'API à utiliser. Appelée une fois, avant le démarrage d'Angular.
 *
 * La sonde est volontairement brève : si le serveur local ne répond pas en
 * 1,5 s, c'est qu'il n'est pas démarré. On ne veut pas retarder le
 * démarrage de l'application pour une hypothèse.
 */
export async function detecterApi(): Promise<string> {
  if (!tourneEnLocal()) {
    return API_RENDER;
  }
  try {
    const abandon = new AbortController();
    const minuteur = setTimeout(() => abandon.abort(), 1_500);
    const reponse = await fetch(`${API_LOCALE}/actuator/health`, {
      signal: abandon.signal,
      credentials: 'omit',
    });
    clearTimeout(minuteur);
    if (reponse.ok) {
      console.info('[api] serveur local détecté, utilisation de', API_LOCALE);
      return API_LOCALE;
    }
  } catch {
    // Pas démarré : on bascule sur Render sans bruit.
  }
  console.info('[api] pas de serveur local, utilisation de', API_RENDER);
  return API_RENDER;
}
