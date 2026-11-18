import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Gardes de route.
 *
 * Ce qu'elles font : éviter d'afficher un écran qui ne pourra rien charger,
 * et emmener le visiteur là où il doit aller.
 *
 * Ce qu'elles ne font **pas** : protéger quoi que ce soit. La seule
 * autorisation qui compte est celle de l'API, vérifiée à chaque requête.
 * Une garde côté navigateur est un confort de navigation ; la prendre pour
 * une sécurité est l'erreur classique.
 */

export const gardeConnecte: CanActivateFn = (_route, etat) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.connecte()) {
    return true;
  }
  // On mémorise la destination pour y revenir après la connexion : renvoyer
  // sur l'accueil obligerait le visiteur à refaire tout son chemin.
  return router.createUrlTree(['/connexion'], {
    queryParams: { suite: etat.url },
  });
};

export const gardeAdmin: CanActivateFn = (_route, etat) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estAdmin()) {
    return true;
  }
  if (auth.connecte()) {
    // Connecté mais pas administrateur : ce n'est pas un problème de
    // connexion, inutile de redemander un mot de passe.
    return router.createUrlTree(['/acces-refuse']);
  }
  return router.createUrlTree(['/connexion'], {
    queryParams: { suite: etat.url },
  });
};
