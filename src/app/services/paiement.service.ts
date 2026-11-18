import { Injectable, inject } from '@angular/core';
import { Observable, concatMap, filter, of, take, takeWhile, timer } from 'rxjs';
import {
  Avis,
  Commande,
  CommandePayee,
  FournisseurPaiement,
  Paiement,
} from '../models/api.models';
import { ApiService } from './api.service';

/** Préfixes réellement servis par chaque opérateur au Cameroun. */
const PREFIXES: Record<FournisseurPaiement, readonly string[]> = {
  MTN_MOMO: ['67', '680', '681', '682', '683', '684', '650', '651', '652', '653', '654'],
  ORANGE_MONEY: ['69', '655', '656', '657', '658', '659', '685', '686', '687', '688', '689'],
};

@Injectable({ providedIn: 'root' })
export class PaiementService {
  private readonly api = inject(ApiService);

  // ==================================================================
  //  Commander et payer
  // ==================================================================

  /**
   * Crée la commande depuis le panier et lance le paiement, en un appel.
   *
   * La clé d'idempotence est **indispensable** ici : sans elle, un
   * double-clic sur « Payer », un retry du navigateur ou un rechargement de
   * page créerait une seconde commande et un second débit. Avec elle, l'API
   * renvoie la réponse d'origine.
   *
   * La clé est générée par l'appelant et conservée pendant toute la durée de
   * la tentative, y compris pendant les réessais : en changer reviendrait à
   * demander une nouvelle opération.
   */
  commanderEtPayer(
    fournisseur: FournisseurPaiement,
    numeroPayeur: string,
    cleIdempotence: string,
  ): Observable<CommandePayee> {
    return this.api.post<CommandePayee>(
      '/api/user/commandes',
      { fournisseur, numeroPayeur },
      cleIdempotence,
    );
  }

  /** Nouvelle tentative sur une commande dont le paiement a échoué. */
  reessayer(
    idCommande: number,
    fournisseur: FournisseurPaiement,
    numeroPayeur: string,
    cleIdempotence: string,
  ): Observable<Paiement> {
    return this.api.post<Paiement>(
      `/api/user/commandes/${idCommande}/paiements`,
      { fournisseur, numeroPayeur },
      cleIdempotence,
    );
  }

  statut(reference: string): Observable<Paiement> {
    return this.api.get<Paiement>(`/api/user/paiements/${reference}`);
  }

  /**
   * Interroge le statut jusqu'à ce qu'il devienne terminal, puis s'arrête.
   *
   * En mobile money, le client valide sur son téléphone par code USSD :
   * l'issue arrive donc de façon asynchrone, plusieurs secondes à plusieurs
   * minutes plus tard. L'interrogation répétée est la façon normale de la
   * suivre, et l'API réconcilie elle-même auprès de l'opérateur à chaque
   * appel.
   *
   * Émet chaque état intermédiaire pour que l'écran puisse les afficher, et
   * se termine sur le premier statut terminal.
   *
   * @param intervalleSecondes cadence conseillée par l'API (`intervallePollingSecondes`)
   * @param plafondTentatives garde-fou : on n'interroge pas indéfiniment
   */
  suivre(
    reference: string,
    intervalleSecondes = 3,
    plafondTentatives = 100,
  ): Observable<Paiement> {
    return timer(0, intervalleSecondes * 1000).pipe(
      take(plafondTentatives),
      concatMap(() => this.statut(reference)),
      // `inclusive` fait passer le statut terminal avant de fermer le flux :
      // sans cela, l'écran ne verrait jamais le résultat final.
      takeWhile((paiement) => !paiement.terminal, true),
    );
  }

  // ==================================================================
  //  Commandes du client
  // ==================================================================

  mesCommandes(): Observable<Commande[]> {
    return this.api.get<Commande[]>('/api/user/mesCommandes');
  }

  laisserAvis(idArticle: number, note: number, commentaire: string): Observable<Avis> {
    return this.api.post<Avis>('/api/user/laisserAvis', { idArticle, note, commentaire });
  }

  // ==================================================================
  //  Aide à la saisie
  // ==================================================================

  /** Ramène un numéro à ses 9 chiffres, sans indicatif ni ponctuation. */
  normaliser(numero: string): string {
    const chiffres = (numero ?? '').replace(/[^0-9]/g, '');
    return chiffres.startsWith('237') && chiffres.length > 9 ? chiffres.slice(3) : chiffres;
  }

  /**
   * Déduit l'opérateur d'un numéro, pour le pré-sélectionner.
   *
   * On ne devine jamais à la place du client sans le montrer : l'écran
   * affiche l'opérateur déduit et le laisse corriger. L'API refuse de toute
   * façon un numéro Orange envoyé à MTN.
   */
  deduireFournisseur(numero: string): FournisseurPaiement | null {
    const n = this.normaliser(numero);
    if (n.length !== 9) {
      return null;
    }
    for (const [fournisseur, prefixes] of Object.entries(PREFIXES)) {
      if (prefixes.some((p) => n.startsWith(p))) {
        return fournisseur as FournisseurPaiement;
      }
    }
    return null;
  }

  numeroValide(numero: string): boolean {
    return /^[26][0-9]{8}$/.test(this.normaliser(numero));
  }

  /** Affichage lisible : 6 77 12 34 56 */
  formater(numero: string): string {
    const n = this.normaliser(numero);
    if (n.length !== 9) {
      return numero;
    }
    return `${n[0]} ${n.slice(1, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`;
  }

  libelleFournisseur(fournisseur: FournisseurPaiement): string {
    return fournisseur === 'MTN_MOMO' ? 'MTN Mobile Money' : 'Orange Money';
  }
}
