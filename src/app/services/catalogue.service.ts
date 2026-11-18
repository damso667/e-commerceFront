import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Article, Avis, Categorie } from '../models/api.models';
import { ApiService } from './api.service';

/**
 * Le catalogue public : ce qu'un visiteur voit sans compte.
 *
 * L'API n'expose pas de recherche plein texte publique : le filtrage par
 * mot-clé se fait donc dans le composant, sur la liste déjà chargée. C'est
 * tenable tant que le catalogue tient en une réponse, et c'est écrit ici
 * pour que personne ne cherche un endpoint qui n'existe pas.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private readonly api = inject(ApiService);

  tousLesArticles(): Observable<Article[]> {
    return this.api.get<Article[]>('/api/personne/Allarticle');
  }

  /**
   * Un article precis. Evite de telecharger tout le catalogue pour
   * afficher une fiche.
   */
  article(idArticle: number): Observable<Article> {
    return this.api.get<Article>(`/api/personne/article/${idArticle}`);
  }

  articlesParCategorie(idCategorie: number): Observable<Article[]> {
    return this.api.get<Article[]>(`/api/personne/articleParCategorie/${idCategorie}`);
  }

  avisDeLArticle(idArticle: number): Observable<Avis[]> {
    return this.api.get<Avis[]>(`/api/personne/avisArticle/${idArticle}`);
  }

  /**
   * Rayons de la boutique, accessibles sans compte.
   *
   * Cet endpoint a été ajouté à l'API pour cette interface : les catégories
   * n'étaient exposées que sous `/api/admin`, ce qui obligeait la boutique
   * à afficher « Catégorie 3 » en tête de rayon à tous ses clients.
   */
  categories(): Observable<Categorie[]> {
    return this.api.get<Categorie[]>('/api/personne/categories');
  }
}
