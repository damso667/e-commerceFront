import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PageReponse } from '../../../models/api.models';

/**
 * Pagination d'une liste du back-office.
 *
 * Elle affiche toujours le compte total, pas seulement les fleches : savoir
 * qu'il y a 3 resultats ou 3 000 change ce qu'on fait ensuite, et c'est la
 * premiere question qu'on se pose devant une recherche filtree.
 *
 * Les numeros de page sont fenetres autour de la page courante. Au-dela
 * d'une vingtaine de pages, les lister toutes produit une barre plus longue
 * que le tableau qu'elle commande.
 */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  readonly page = input.required<PageReponse<unknown>>();
  /** Nom de ce qui est compté, au singulier. */
  readonly unite = input<string>('résultat');
  /**
   * Pluriel, quand il ne s'obtient pas en ajoutant un s. « avis » est
   * invariable ; « aviss » se verrait.
   */
  readonly unitePluriel = input<string>('');
  readonly aller = output<number>();

  protected readonly utile = computed(() => this.page().totalPages > 1);

  protected readonly decompte = computed(() => {
    const p = this.page();
    const total = p.totalElements;
    if (total === 0) {
      return `Aucun ${this.unite()}`;
    }
    const premier = p.page * p.taille + 1;
    const dernier = Math.min(total, premier + p.contenu.length - 1);
    const mot = total > 1 ? this.unitePluriel() || `${this.unite()}s` : this.unite();
    if (total <= p.taille) {
      return `${total} ${mot}`;
    }
    return `${premier}–${dernier} sur ${total} ${mot}`;
  });

  /** Fenetre de numeros : au plus sept, centree sur la page courante. */
  protected readonly numeros = computed(() => {
    const p = this.page();
    const total = p.totalPages;
    const courante = p.page;
    const fenetre = 7;
    if (total <= fenetre) {
      return Array.from({ length: total }, (_, i) => i);
    }
    let debut = Math.max(0, courante - 3);
    const fin = Math.min(total, debut + fenetre);
    debut = Math.max(0, fin - fenetre);
    return Array.from({ length: fin - debut }, (_, i) => debut + i);
  });

  protected choisir(numero: number): void {
    if (numero !== this.page().page) {
      this.aller.emit(numero);
    }
  }
}
