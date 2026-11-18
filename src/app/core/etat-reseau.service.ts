import { Injectable, computed, signal } from '@angular/core';

/**
 * Ce que l'application sait de l'état du réseau et du serveur.
 *
 * Elle existe pour une raison précise : sur le plan gratuit de Render,
 * l'instance s'endort après quinze minutes et met environ 150 secondes à se
 * réveiller. Une requête qui met deux minutes n'est donc pas une panne, mais
 * sans le dire l'interface paraît cassée. Ce service permet d'afficher
 * « le serveur se réveille » au bout de quelques secondes, puis de revenir
 * au silence dès la première réponse.
 */
@Injectable({ providedIn: 'root' })
export class EtatReseauService {
  /** Nombre de requêtes en vol. */
  private readonly enVol = signal(0);

  /** Passe à true quand une requête dépasse le seuil d'attente normale. */
  private readonly reveilEnCours = signal(false);

  /** true dès qu'une réponse est revenue : on ne réaffiche plus le message. */
  private readonly serveurDejaRepondu = signal(false);

  private readonly horsLigne = signal(!navigator.onLine);

  readonly chargement = computed(() => this.enVol() > 0);
  readonly serveurSeReveille = computed(() => this.reveilEnCours() && !this.serveurDejaRepondu());
  readonly estHorsLigne = this.horsLigne.asReadonly();

  constructor() {
    addEventListener('online', () => this.horsLigne.set(false));
    addEventListener('offline', () => this.horsLigne.set(true));
  }

  debutRequete(): void {
    this.enVol.update((n) => n + 1);
  }

  finRequete(repondu: boolean): void {
    this.enVol.update((n) => Math.max(0, n - 1));
    if (repondu) {
      this.serveurDejaRepondu.set(true);
      this.reveilEnCours.set(false);
    }
    if (this.enVol() === 0) {
      this.reveilEnCours.set(false);
    }
  }

  signalerAttenteLongue(): void {
    if (!this.serveurDejaRepondu()) {
      this.reveilEnCours.set(true);
    }
  }
}
