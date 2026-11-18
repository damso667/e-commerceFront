import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  FournisseurPaiement,
  PageReponse,
  PaiementAdmin,
  PaiementDetailAdmin,
  ResultatRemboursement,
  StatutPaiement,
} from '../models/api.models';
import { ApiService } from './api.service';

export interface FiltrePaiements {
  statut?: StatutPaiement;
  fournisseur?: FournisseurPaiement;
  debut?: string;
  fin?: string;
  recherche?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * Suivi des paiements côté back-office : c'est l'outil du support.
 */
@Injectable({ providedIn: 'root' })
export class AdminPaiementsService {
  private readonly api = inject(ApiService);

  /**
   * `recherche` couvre d'un seul coup la référence interne, la référence
   * opérateur, le numéro payeur, l'email et le nom du client : au téléphone
   * avec un client, on tape ce qu'il donne.
   */
  rechercher(filtre: FiltrePaiements = {}): Observable<PageReponse<PaiementAdmin>> {
    return this.api.get<PageReponse<PaiementAdmin>>('/api/admin/paiements', {
      ...filtre,
      sort: filtre.sort ?? 'dateCreation,desc',
    });
  }

  /** Fiche complète : paiement, commande, tentatives, callbacks reçus. */
  detail(reference: string): Observable<PaiementDetailAdmin> {
    return this.api.get<PaiementDetailAdmin>(`/api/admin/paiements/${reference}`);
  }

  tentativesDeCommande(idCommande: number): Observable<PaiementAdmin[]> {
    return this.api.get<PaiementAdmin[]>(`/api/admin/commandes/${idCommande}/paiements`);
  }

  /**
   * Remboursement.
   *
   * Deux choses que l'appelant doit savoir faire avec la réponse :
   * `automatique` à false signifie que le paiement est bien marqué
   * REMBOURSE mais que **l'argent n'a pas bougé** — il reste un transfert à
   * effectuer à la main, et `consigne` le dit. L'afficher comme un succès
   * sans cette nuance serait mentir.
   *
   * La clé d'idempotence évite un double remboursement sur double-clic ;
   * l'état terminal REMBOURSE protège de toute façon côté API.
   */
  rembourser(reference: string, motif: string): Observable<ResultatRemboursement> {
    return this.api.post<ResultatRemboursement>(
      `/api/admin/paiements/${reference}/remboursement`,
      { motif },
      this.api.nouvelleCle(),
    );
  }
}
