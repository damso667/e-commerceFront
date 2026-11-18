import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ArticleAdmin,
  Categorie,
  Commande,
  CommandeResume,
  PageReponse,
  StatutCommande,
} from '../models/api.models';
import { ApiService } from './api.service';

export interface ArticleRequete {
  libelle: string;
  description?: string;
  prix: number;
  stock: number;
  imageUrl?: string;
  idCategorie: number;
}

export interface FiltreArticles {
  recherche?: string;
  idCategorie?: number;
  stockMax?: number;
  prixMin?: number;
  prixMax?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface FiltreCommandes {
  statut?: StatutCommande;
  idClient?: number;
  debut?: string;
  fin?: string;
  montantMin?: number;
  recherche?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/** Catalogue, stock, catégories et commandes côté back-office. */
@Injectable({ providedIn: 'root' })
export class AdminCatalogueService {
  private readonly api = inject(ApiService);

  // ---------------- Articles ----------------

  rechercherArticles(filtre: FiltreArticles = {}): Observable<PageReponse<ArticleAdmin>> {
    return this.api.get<PageReponse<ArticleAdmin>>('/api/admin/articles', {
      ...filtre,
      sort: filtre.sort ?? 'libelle',
    });
  }

  creerArticle(donnees: ArticleRequete): Observable<ArticleAdmin> {
    return this.api.post<ArticleAdmin>('/api/admin/articles', donnees);
  }

  modifierArticle(idArticle: number, donnees: ArticleRequete): Observable<ArticleAdmin> {
    return this.api.put<ArticleAdmin>(`/api/admin/articles/${idArticle}`, donnees);
  }

  /**
   * Ajustement de stock par **variation**, pas par valeur absolue.
   *
   * « +10 reçus » est l'opération réelle, et sous verrou côté API deux
   * réapprovisionnements simultanés s'additionnent au lieu de s'écraser.
   * Un stock qui passerait sous zéro est refusé.
   */
  ajusterStock(idArticle: number, variation: number, motif?: string): Observable<ArticleAdmin> {
    return this.api.patch<ArticleAdmin>(`/api/admin/articles/${idArticle}/stock`, {
      variation,
      motif,
    });
  }

  /**
   * Un article déjà commandé n'est pas supprimé mais retiré de la vente :
   * l'API renvoie un message qui le dit, et il faut l'afficher tel quel.
   */
  supprimerArticle(idArticle: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`/api/admin/articles/${idArticle}`);
  }

  // ---------------- Catégories ----------------

  categories(): Observable<Categorie[]> {
    return this.api.get<Categorie[]>('/api/admin/categories');
  }

  creerCategorie(nomCategorie: string, description?: string): Observable<Categorie> {
    return this.api.post<Categorie>('/api/admin/categories', { nomCategorie, description });
  }

  modifierCategorie(
    idCategorie: number,
    nomCategorie: string,
    description?: string,
  ): Observable<Categorie> {
    return this.api.put<Categorie>(`/api/admin/categories/${idCategorie}`, {
      nomCategorie,
      description,
    });
  }

  supprimerCategorie(idCategorie: number): Observable<void> {
    return this.api.delete<void>(`/api/admin/categories/${idCategorie}`);
  }

  // ---------------- Commandes ----------------

  rechercherCommandes(filtre: FiltreCommandes = {}): Observable<PageReponse<CommandeResume>> {
    return this.api.get<PageReponse<CommandeResume>>('/api/admin/commandes', {
      ...filtre,
      sort: filtre.sort ?? 'dateCreation,desc',
    });
  }

  detailCommande(idCommande: number): Observable<Commande> {
    return this.api.get<Commande>(`/api/admin/commandes/${idCommande}`);
  }

  /**
   * Changement de statut. L'API applique une machine à états :
   * `EN_ATTENTE -> PAYEE` est interdit, seul un paiement confirmé fait
   * passer une commande à PAYEE. Les transitions refusées remontent en 409
   * avec leur raison.
   */
  changerStatut(idCommande: number, statut: StatutCommande): Observable<Commande> {
    return this.api.patch<Commande>(
      `/api/admin/commandes/${idCommande}/statut?statut=${statut}`,
    );
  }

  /** Transitions que l'API acceptera, pour n'afficher que des actions valides. */
  transitionsPossibles(statut: StatutCommande): StatutCommande[] {
    switch (statut) {
      case 'EN_ATTENTE':
        return ['ANNULEE'];
      case 'PAYEE':
        return ['EN_COURS', 'ANNULEE'];
      case 'EN_COURS':
        return ['LIVREE', 'ANNULEE'];
      default:
        return [];
    }
  }
}
