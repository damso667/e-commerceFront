import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Article } from '../../models/api.models';
import { Montant } from '../montant/montant';
import { Pastille } from '../pastille/pastille';

/**
 * Carte produit.
 *
 * Brique centrale du catalogue. Trois décisions qui la rendent utilisable
 * plutôt que seulement jolie :
 *
 *  - **Ratio d'image fixe (4:5).** Toutes les cartes font la même hauteur
 *    d'image, donc la grille ne devient pas un escalier dès qu'une photo
 *    arrive avec d'autres proportions. L'espace est réservé avant le
 *    chargement, ce qui supprime le saut de contenu.
 *  - **L'ajout au panier est sur la carte.** Ouvrir une fiche pour un geste
 *    aussi simple coûte un aller-retour réseau, et sur 3G cela se sent.
 *  - **Le nom est coupé à deux lignes.** Sans cela, un libellé long décale
 *    le prix d'une carte par rapport à ses voisines et la grille perd sa
 *    ligne de base.
 */
@Component({
  selector: 'app-carte-article',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pastille, Montant],
  templateUrl: './carte-article.html',
  styleUrl: './carte-article.css',
})
export class CarteArticle {
  readonly article = input.required<Article>();
  /** Nom du rayon, affiché en légère surimpression sous le nom. */
  readonly categorie = input<string>('');
  /** Vrai pour les premières cartes visibles : image chargée sans délai. */
  readonly prioritaire = input<boolean>(false);
  /** Ajout en cours sur cette carte. */
  readonly enCours = input<boolean>(false);
  /** Confirmation d'ajout, brève. */
  readonly ajoute = input<boolean>(false);

  readonly ajouter = output<Article>();

  protected readonly libelleAjout = computed(() => {
    if (this.enCours()) {
      return 'Ajout…';
    }
    return this.ajoute() ? 'Ajouté au panier' : 'Ajouter au panier';
  });

  /**
   * Libellé long pour les lecteurs d'écran : « Ajouter au panier » répété
   * vingt fois dans une grille ne dit pas quel article est visé.
   */
  protected readonly libelleAccessible = computed(
    () => `${this.libelleAjout()} : ${this.article().nom}`,
  );

  protected surAjout(evenement: Event): void {
    // La carte entière est un lien vers la fiche ; le bouton doit agir
    // sans déclencher la navigation.
    evenement.preventDefault();
    evenement.stopPropagation();
    this.ajouter.emit(this.article());
  }
}
