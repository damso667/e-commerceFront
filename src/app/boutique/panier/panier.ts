import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LignePanier } from '../../models/api.models';
import { ErreurBoutique } from '../../services/api.service';
import { PanierService } from '../../services/panier.service';
import { Alerte } from '../../ui/alerte/alerte';
import { EtatVide } from '../../ui/etat-vide/etat-vide';
import { Montant } from '../../ui/montant/montant';
import { Pastille } from '../../ui/pastille/pastille';
import { Squelette } from '../../ui/squelette/squelette';

/**
 * Panier.
 *
 * Chaque modification part au serveur, qui renvoie le panier recalculé :
 * on ne tient pas de total local. Un panier dupliqué dans le navigateur
 * finirait par diverger de la base, et c'est exactement l'écart qui fait
 * vendre un article en rupture.
 *
 * La ligne en cours de modification est marquée, pour que deux clics
 * rapides sur « + » ne se marchent pas dessus.
 */
@Component({
  selector: 'app-panier',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pastille, Montant, Squelette, EtatVide, Alerte],
  templateUrl: './panier.html',
  styleUrl: './panier.css',
})
export class PanierPage {
  private readonly panierService = inject(PanierService);

  protected readonly panier = this.panierService.panier;
  protected readonly total = this.panierService.total;
  protected readonly nombreArticles = this.panierService.nombreArticles;

  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  /** Article dont la ligne est en cours de modification. */
  protected readonly ligneOccupee = signal<number | null>(null);

  protected readonly vide = computed(
    () => !this.chargement() && (this.panier()?.lignes.length ?? 0) === 0,
  );

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.panierService.charger().subscribe({
      next: () => this.chargement.set(false),
      error: (erreur: ErreurBoutique) => {
        this.chargement.set(false);
        // 404 : aucun panier n'existe encore côté serveur. Ce n'est pas une
        // erreur, c'est un panier vide.
        if (erreur.statut !== 404) {
          this.erreur.set(erreur.message);
        }
      },
    });
  }

  protected augmenter(ligne: LignePanier): void {
    this.agir(ligne.idArticle, this.panierService.ajouter(ligne.idArticle, 1));
  }

  protected diminuer(ligne: LignePanier): void {
    this.agir(ligne.idArticle, this.panierService.diminuer(ligne.idArticle));
  }

  protected retirer(ligne: LignePanier): void {
    this.agir(ligne.idArticle, this.panierService.retirer(ligne.idArticle));
  }

  protected viderTout(): void {
    this.ligneOccupee.set(-1);
    this.erreur.set(null);
    this.panierService.vider().subscribe({
      next: () => {
        this.ligneOccupee.set(null);
        this.charger();
      },
      error: (erreur: ErreurBoutique) => {
        this.ligneOccupee.set(null);
        this.erreur.set(erreur.message);
      },
    });
  }

  private agir(idArticle: number, appel: ReturnType<PanierService['ajouter']>): void {
    this.ligneOccupee.set(idArticle);
    this.erreur.set(null);
    appel.subscribe({
      next: () => this.ligneOccupee.set(null),
      error: (erreur: ErreurBoutique) => {
        this.ligneOccupee.set(null);
        this.erreur.set(erreur.message);
      },
    });
  }
}
