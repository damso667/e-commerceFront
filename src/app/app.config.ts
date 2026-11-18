import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  PreloadAllModules,
  provideRouter,
  withInMemoryScrolling,
  withPreloading,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { apiInterceptor } from './core/api.interceptor';
import { routes } from './app.routes';

export const configApplication: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    /* Détection de changement sans Zone.js : l'application est écrite en
       signaux, et s'en passer allège le démarrage — ce qui compte sur un
       téléphone d'entrée de gamme. */
    provideZonelessChangeDetection(),

    provideHttpClient(
      /* `withFetch` au lieu de XHR : nécessaire au mode sans zone, et
         permet l'annulation propre d'une requête. */
      withFetch(),
      withInterceptors([apiInterceptor]),
    ),

    provideRouter(
      routes,
      /* Les routes sont chargées à la demande, puis préchargées en fond dès
         que le premier écran est affiché : la navigation reste instantanée
         sans alourdir le premier chargement. */
      withPreloading(PreloadAllModules),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),

    /* Service worker : la boutique reste consultable hors ligne, et surtout
       le premier écran s'affiche sans attendre le réveil de l'API.
       Enregistré après stabilisation pour ne pas concurrencer le premier
       rendu sur une connexion lente. */
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};

function isDevMode(): boolean {
  return (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname.endsWith('.localhost')
  );
}
