import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Panier } from '../models/api.models';
import { ApiService } from './api.service';

/**
 * Le panier, qui vit côté serveur.
 *
 * Choix assumé : aucun panier local. L'API tient le panier par client, et le
 * stock est vérifié à l'ajout comme au passage de commande. Un panier
 * dupliqué dans le navigateur finirait par diverger du serveur, et c'est
 * exactement le genre d'écart qui fait vendre un article en rupture.
 *
 * Le dernier panier connu est tenu en signal pour que le compteur de l'en-tête
 * soit juste partout sans recharger.
 */
@Injectable({ providedIn: 'root' })
export class PanierService {
  private readonly api = inject(ApiService);

  private readonly etat = signal<Panier | null>(null);

  readonly panier = this.etat.asReadonly();
  readonly nombreArticles = computed(
    () => this.etat()?.lignes.reduce((somme, ligne) => somme + ligne.quantite, 0) ?? 0,
  );
  readonly total = computed(() => this.etat()?.total ?? 0);
  readonly estVide = computed(() => this.nombreArticles() === 0);

  charger(): Observable<Panier> {
    return this.api.get<Panier>('/api/user/monPanier').pipe(tap((p) => this.etat.set(p)));
  }

  ajouter(idArticle: number, quantite = 1): Observable<Panier> {
    return this.api
      .post<Panier>('/api/user/ajoutPanier', { idArticle, quantite })
      .pipe(tap((p) => this.etat.set(p)));
  }

  diminuer(idArticle: number): Observable<Panier> {
    return this.api
      .patch<Panier>(`/api/user/diminuerQuantite/${idArticle}`)
      .pipe(tap((p) => this.etat.set(p)));
  }

  retirer(idArticle: number): Observable<Panier> {
    return this.api
      .delete<Panier>(`/api/user/supprimerArticlePanier/${idArticle}`)
      .pipe(tap((p) => this.etat.set(p)));
  }

  vider(): Observable<void> {
    return this.api.delete<void>('/api/user/viderPanier').pipe(tap(() => this.etat.set(null)));
  }

  /** Après une commande : le serveur a vidé le panier, on s'aligne. */
  oublier(): void {
    this.etat.set(null);
  }
}
