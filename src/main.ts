import { bootstrapApplication } from '@angular/platform-browser';
import { BASE_API, detecterApi } from './app/core/api.config';
import { configApplication } from './app/app.config';
import { Racine } from './app/app';
import { ParametresService } from './app/services/parametres.service';

/**
 * Amorçage en deux temps, et c'est volontaire.
 *
 * 1. On résout d'abord **où vit l'API** : serveur local s'il tourne, sinon
 *    Render. Cela doit être tranché avant qu'un service soit instancié, car
 *    l'URL de base est injectée.
 * 2. On charge ensuite **l'identité de la boutique** (nom, couleur, logo)
 *    avant le premier rendu. Sans cela, l'écran s'afficherait une fraction
 *    de seconde avec la marque par défaut puis changerait sous les yeux du
 *    visiteur — un défaut bien visible sur une connexion lente.
 */
async function demarrer(): Promise<void> {
  const base = await detecterApi();

  const app = await bootstrapApplication(Racine, {
    ...configApplication,
    providers: [...configApplication.providers, { provide: BASE_API, useValue: base }],
  });

  // Après l'amorçage : la marque est appliquée au document, et l'écran
  // d'attente du composant racine cède la place.
  await app.injector.get(ParametresService).charger();
}

demarrer().catch((erreur) => {
  console.error('[amorçage] échec', erreur);
  const racine = document.querySelector('app-racine');
  if (racine) {
    racine.innerHTML = `
      <div style="padding:32px;font-family:system-ui,sans-serif;max-width:32rem;margin:0 auto;color:#171714">
        <h1 style="font-size:20px;margin-bottom:8px">La boutique n'a pas pu démarrer</h1>
        <p style="margin-bottom:16px">Vérifiez votre connexion, puis rechargez la page.</p>
        <button onclick="location.reload()"
                style="background:#0B6B5E;color:#fff;border:0;padding:12px 18px;font:inherit;cursor:pointer">
          Recharger
        </button>
      </div>`;
  }
});
