import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, tap, timer } from 'rxjs';
import { SEUIL_MESSAGE_REVEIL_MS } from './api.config';
import { EtatReseauService } from './etat-reseau.service';

/**
 * Ce que chaque requête doit porter, et qu'on ne veut pas répéter dans
 * quinze services.
 *
 * 1. **`withCredentials`.** L'API authentifie par session et cookie, pas par
 *    jeton : sans ce drapeau, le cookie ne part pas sur une origine
 *    différente et toutes les routes protégées sont refusées. C'est le piège
 *    numéro un de ce type d'intégration.
 *
 *    Attention, la moitié du travail est côté serveur : le cookie doit être
 *    émis avec `SameSite=None; Secure`, sinon le navigateur le garde pour
 *    lui et la session paraît ouverte alors qu'elle ne voyage pas.
 *
 * 2. **Le suivi de l'attente.** Au-delà de quelques secondes sans réponse,
 *    on annonce que le serveur se réveille au lieu de laisser croire à une
 *    panne.
 *
 * 3. **La session périmée.** Un 401 signifie que le navigateur n'a plus de
 *    session valide, alors que l'application croyait l'utilisateur connecté.
 *    On efface cette mémoire et on l'emmène se reconnecter, en gardant sa
 *    destination — plutôt que de lui afficher un refus qu'il ne peut pas
 *    comprendre.
 */
export const apiInterceptor: HttpInterceptorFn = (requete, suivant) => {
  const etat = inject(EtatReseauService);
  // Résolution paresseuse : AuthService dépend d'ApiService, qui dépend du
  // client HTTP, qui dépend de cet intercepteur. L'injecter directement
  // formerait un cycle à l'amorçage.
  const injecteur = inject(Injector);

  const avecCookie = requete.clone({ withCredentials: true });

  etat.debutRequete();
  let repondu = false;

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
      error: (erreur: unknown) => {
        // Même une erreur HTTP prouve que le serveur répond : seule une
        // panne réseau (statut 0) laisse le doute sur son réveil.
        if (erreur instanceof HttpErrorResponse && erreur.status !== 0) {
          repondu = true;
          if (erreur.status === 401) {
            reconnecter(injecteur);
          }
        }
      },
    }),
    finalize(() => {
      abonnementSeuil.unsubscribe();
      etat.finRequete(repondu);
    }),
  );
};

/**
 * Efface la session mémorisée et emmène se reconnecter.
 *
 * Importé à la demande pour la même raison que plus haut : éviter le cycle
 * de dépendances au démarrage.
 */
function reconnecter(injecteur: Injector): void {
  void import('../services/auth.service').then(({ AuthService }) => {
    const auth = injecteur.get(AuthService);
    if (!auth.connecte()) {
      // Déjà déconnecté : la requête venait d'une page publique, il n'y a
      // rien à annoncer et surtout rien à interrompre.
      return;
    }
    auth.oublier();

    const router = injecteur.get(Router);
    const destination = router.url;
    // On ne renvoie pas vers la connexion depuis la connexion elle-même.
    if (destination.startsWith('/connexion')) {
      return;
    }
    void router.navigate(['/connexion'], {
      queryParams: { suite: destination, expiree: 1 },
    });
  });
}
