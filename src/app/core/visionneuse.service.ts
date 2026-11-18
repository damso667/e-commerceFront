import { Injectable, signal } from '@angular/core';

export interface ImageAgrandie {
  src: string;
  alt: string;
}

/**
 * Image affichée en grand, pour toute l'application.
 *
 * Un service plutôt qu'un composant par carte : une grille de vingt
 * produits monterait vingt superpositions inertes, chacune avec son piège
 * à focus et son écouteur de clavier. Il n'y en a qu'une, posée par la
 * coque de la boutique, et n'importe quel écran l'ouvre en appelant
 * {@link ouvrir}.
 */
@Injectable({ providedIn: 'root' })
export class VisionneuseService {
  private readonly etat = signal<ImageAgrandie | null>(null);

  readonly image = this.etat.asReadonly();

  ouvrir(src: string | null | undefined, alt: string): void {
    if (!src) {
      return;
    }
    this.etat.set({ src, alt });
  }

  fermer(): void {
    this.etat.set(null);
  }
}
