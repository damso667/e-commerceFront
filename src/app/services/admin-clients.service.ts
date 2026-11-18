import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ClientDetail, PageReponse, Personne, Role } from '../models/api.models';
import { ApiService } from './api.service';

export interface FiltreClients {
  recherche?: string;
  role?: Role;
  actif?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminClientsService {
  private readonly api = inject(ApiService);

  /** `recherche` couvre nom, prénom, email et téléphone. */
  rechercher(filtre: FiltreClients = {}): Observable<PageReponse<Personne>> {
    return this.api.get<PageReponse<Personne>>('/api/admin/clients', {
      ...filtre,
      sort: filtre.sort ?? 'nom',
    });
  }

  /** Fiche complète : achats, panier en cours, dernières commandes. */
  detail(idClient: number): Observable<ClientDetail> {
    return this.api.get<ClientDetail>(`/api/admin/clients/${idClient}`);
  }

  /** Bascule actif / inactif. L'API refuse de bloquer un compte ADMIN. */
  basculerActivation(idClient: number): Observable<Personne> {
    return this.api.patch<Personne>(`/api/admin/clients/${idClient}/activation`);
  }

  /**
   * Promotion ou rétrogradation.
   *
   * Deux refus que l'interface doit savoir expliquer : on ne modifie pas son
   * propre rôle (403), et on ne rétrograde pas le dernier administrateur de
   * la plateforme (409).
   */
  changerRole(idClient: number, role: Role): Observable<Personne> {
    return this.api.patch<Personne>(`/api/admin/clients/${idClient}/role`, { role });
  }
}
