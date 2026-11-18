import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { VisionneuseService } from '../../core/visionneuse.service';

/**
 * Image d'un produit, affichée en grand.
 *
 * Une seule instance existe, posée par la coque de la boutique ; n'importe
 * quelle carte ou fiche l'ouvre par {@link VisionneuseService}.
 *
 * Ce qu'une superposition doit faire et qu'on oublie souvent :
 *
 *  - **Échap ferme**, et le clic sur le fond aussi. Une image qu'on ne
 *    peut refermer qu'avec une petite croix est une impasse au doigt.
 *  - **Le focus entre dedans et n'en sort pas** tant qu'elle est ouverte.
 *    Sans cela, la tabulation continue dans la page masquée derrière, et
 *    au lecteur d'écran l'image agrandie n'existe tout simplement pas.
 *  - **Le focus revient d'où il venait** à la fermeture, sinon on repart
 *    du haut de la page après avoir regardé le douzième produit.
 *  - **Le défilement de la page est gelé**, sinon la grille défile sous
 *    l'image au moindre geste.
 */
@Component({
  selector: 'app-visionneuse',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visionneuse.html',
  styleUrl: './visionneuse.css',
})
export class Visionneuse {
  private readonly service = inject(VisionneuseService);

  protected readonly image = this.service.image;
  protected readonly chargee = signal(false);

  private readonly boite = viewChild<ElementRef<HTMLElement>>('boite');
  private declencheur: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const ouverte = this.image() !== null;
      document.body.classList.toggle('defilement-gele', ouverte);

      if (ouverte) {
        this.chargee.set(false);
        // Mémorisé avant que le focus ne bouge : c'est l'élément auquel on
        // doit rendre la main à la fermeture.
        this.declencheur = document.activeElement as HTMLElement | null;
        queueMicrotask(() => this.boite()?.nativeElement.focus());
      } else if (this.declencheur) {
        this.declencheur.focus();
        this.declencheur = null;
      }
    });
  }

  protected fermer(): void {
    this.service.fermer();
  }

  /** Le clic ne ferme que sur le fond, pas sur l'image elle-même. */
  protected surFond(evenement: MouseEvent): void {
    if (evenement.target === evenement.currentTarget) {
      this.fermer();
    }
  }

  protected surClavier(evenement: KeyboardEvent): void {
    if (evenement.key === 'Escape') {
      evenement.preventDefault();
      this.fermer();
      return;
    }
    // Piège à focus : deux éléments focusables seulement, la boîte et le
    // bouton de fermeture. On garde la tabulation entre les deux.
    if (evenement.key === 'Tab') {
      const boite = this.boite()?.nativeElement;
      if (!boite) {
        return;
      }
      const focusables = boite.querySelectorAll<HTMLElement>('button');
      if (focusables.length === 0) {
        evenement.preventDefault();
        return;
      }
      const premier = focusables[0];
      const dernier = focusables[focusables.length - 1];
      if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault();
        premier.focus();
      }
    }
  }
}
