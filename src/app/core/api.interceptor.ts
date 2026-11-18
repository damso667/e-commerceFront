import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap, timer } from 'rxjs';
import { SEUIL_MESSAGE_REVEIL_MS } from './api.config';
import { EtatReseauService } from './etat-reseau.service';

/**
 * Deux choses que chaque requête doit porter, et qu'on ne veut pas répéter
 * dans quinze services.
 *
 * 1. **`withCredentials`.** L'API authentifie par session et cookie, pas par
 *    jeton : sans ce drapeau, le cookie ne part pas sur une origine
 *    différente et toutes les routes protégées répondent 403. C'est le piège
 *    numéro un de ce type d'intégration.
 * 2. **Le suivi de l'attente.** Au-delà de quelques secondes sans réponse,
 *    on prévient que le serveur se réveille au lieu de laisser croire à une
 *    panne.
 */
export const apiInterceptor: HttpInterceptorFn = (requete, suivant) => {
  const etat = inject(EtatReseauService);

  const avecCookie = requete.clone({ withCredentials: true });

  etat.debutRequete();
  let repondu = false;

  // Minuteur indépendant : si rien n'est revenu au bout du seuil, on le dit.
  const abonnementSeuil = timer(SEUIL_MESSAGE_REVEIL_MS).subscribe(() => {
    if (!repondu) {
      etat.signalerAttenteLongue();
    }
  });

  return suivant(avecCookie).pipe(
    tap({
      next: (evenement: HttpEvent<unknown>) => {
        if (evenement.type !== 0) {
          repondu = true;
        }
      },
      // Même une erreur HTTP prouve que le serveur répond : seule une panne
      // réseau (statut 0) laisse le doute sur son réveil.
      error: (erreur: unknown) => {
        if (erreur instanceof HttpErrorResponse && erreur.status !== 0) {
          repondu = true;
        }
      },
    }),
    finalize(() => {
      abonnementSeuil.unsubscribe();
      etat.finRequete(repondu);
    }),
  );
};
