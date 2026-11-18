import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StatutCommande, StatutPaiement } from '../../models/api.models';

type Ton = 'succes' | 'echec' | 'attente' | 'neutre';

/**
 * Statut imprimé comme un tampon de validation, pas comme une pastille.
 *
 * Choix du monde : le bordereau tamponné. Un statut y est une marque
 * détourée, légèrement inclinée, apposée sur le document — pas une gélule
 * colorée à coins ronds, qui est le tic de toutes les interfaces.
 *
 * Le ton porte du sens (réussi, échoué, en attente), donc la couleur est
 * ici légitime malgré la contrainte d'une encre unique. Mais elle ne suffit
 * jamais : le libellé dit toujours l'état en mots, parce qu'une information
 * portée par la seule couleur n'existe pas pour une partie des visiteurs.
 */
@Component({
  selector: 'app-tampon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tampon.html',
  styleUrl: './tampon.css',
})
export class Tampon {
  readonly statutPaiement = input<StatutPaiement | null>(null);
  readonly statutCommande = input<StatutCommande | null>(null);
  /** Libellé libre, quand le statut ne vient pas de l'API. */
  readonly texte = input<string>('');
  readonly petit = input<boolean>(false);

  protected readonly libelle = computed(() => {
    if (this.texte()) {
      return this.texte();
    }
    const paiement = this.statutPaiement();
    if (paiement) {
      return LIBELLES_PAIEMENT[paiement] ?? paiement;
    }
    const commande = this.statutCommande();
    if (commande) {
      return LIBELLES_COMMANDE[commande] ?? commande;
    }
    return '—';
  });

  protected readonly ton = computed<Ton>(() => {
    const paiement = this.statutPaiement();
    if (paiement) {
      return TONS_PAIEMENT[paiement] ?? 'neutre';
    }
    const commande = this.statutCommande();
    if (commande) {
      return TONS_COMMANDE[commande] ?? 'neutre';
    }
    return 'neutre';
  });
}

/* Libellés en clair : « EXPIRE » ne dit rien à un client, « non validé à
   temps » lui dit ce qui s'est passé. */
const LIBELLES_PAIEMENT: Record<StatutPaiement, string> = {
  EN_ATTENTE: 'en attente',
  EN_COURS: 'à valider',
  PAYE: 'payé',
  ECHOUE: 'échoué',
  EXPIRE: 'expiré',
  ANNULE: 'annulé',
  REMBOURSE: 'remboursé',
};

const TONS_PAIEMENT: Record<StatutPaiement, Ton> = {
  EN_ATTENTE: 'attente',
  EN_COURS: 'attente',
  PAYE: 'succes',
  ECHOUE: 'echec',
  EXPIRE: 'echec',
  ANNULE: 'echec',
  REMBOURSE: 'neutre',
};

const LIBELLES_COMMANDE: Record<StatutCommande, string> = {
  EN_ATTENTE: 'à payer',
  PAYEE: 'payée',
  EN_COURS: 'en préparation',
  LIVREE: 'livrée',
  ANNULEE: 'annulée',
};

const TONS_COMMANDE: Record<StatutCommande, Ton> = {
  EN_ATTENTE: 'attente',
  PAYEE: 'succes',
  EN_COURS: 'neutre',
  LIVREE: 'succes',
  ANNULEE: 'echec',
};
