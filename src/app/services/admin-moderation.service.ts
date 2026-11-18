import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AvisAdmin, EntreeJournal, PageReponse } from '../models/api.models';
import { ApiService } from './api.service';

export interface FiltreAvis {
  idArticle?: number;
  noteMin?: number;
  noteMax?: number;
  recherche?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface FiltreJournal {
  acteur?: string;
  action?: string;
  cibleType?: string;
  cibleId?: string;
  debut?: string;
  fin?: string;
  page?: number;
  size?: number;
}

/** Modération des avis et journal d'audit. */
@Injectable({ providedIn: 'root' })
export class AdminModerationService {
  private readonly api = inject(ApiService);

  rechercherAvis(filtre: FiltreAvis = {}): Observable<PageReponse<AvisAdmin>> {
    return this.api.get<PageReponse<AvisAdmin>>('/api/admin/avis', {
      ...filtre,
      sort: filtre.sort ?? 'dateAvis,desc',
    });
  }

  supprimerAvis(idAvis: number): Observable<void> {
    return this.api.delete<void>(`/api/admin/avis/${idAvis}`);
  }

  /** Qui a fait quoi, et quand. Le champ `details` dit ce qui a changé. */
  journal(filtre: FiltreJournal = {}): Observable<PageReponse<EntreeJournal>> {
    return this.api.get<PageReponse<EntreeJournal>>('/api/admin/journal', {
      size: 50,
      ...filtre,
    });
  }

  /** Libellés lisibles des actions tracées par l'API. */
  libelleAction(action: string): string {
    const libelles: Record<string, string> = {
      ARTICLE_CREE: 'Article créé',
      ARTICLE_MODIFIE: 'Article modifié',
      ARTICLE_SUPPRIME: 'Article supprimé',
      ARTICLE_RETIRE_VENTE: 'Article retiré de la vente',
      STOCK_AJUSTE: 'Stock ajusté',
      ARTICLE_IMAGE_DEPOSEE: "Photo d'article déposée",
      ARTICLE_IMAGE_RETIREE: "Photo d'article retirée",
      CATEGORIE_CREEE: 'Catégorie créée',
      CATEGORIE_MODIFIEE: 'Catégorie modifiée',
      CATEGORIE_SUPPRIMEE: 'Catégorie supprimée',
      COMMANDE_STATUT_CHANGE: 'Statut de commande changé',
      CLIENT_BLOQUE: 'Client bloqué',
      CLIENT_DEBLOQUE: 'Client débloqué',
      ROLE_CHANGE: 'Rôle changé',
      AVIS_SUPPRIME: 'Avis supprimé',
      PAIEMENT_REMBOURSE: 'Paiement remboursé',
      PARAMETRES_MODIFIES: 'Identité de la boutique modifiée',
      LOGO_MODIFIE: 'Logo modifié',
      ICONE_MODIFIEE: 'Icône modifiée',
    };
    return libelles[action] ?? action;
  }
}
