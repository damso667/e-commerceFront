import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Commande } from '../../models/api.models';
import { ErreurBoutique } from '../../services/api.service';
import { PaiementService } from '../../services/paiement.service';
import { Alerte } from '../../ui/alerte/alerte';
import { EtatVide } from '../../ui/etat-vide/etat-vide';
import { Montant } from '../../ui/montant/montant';
import { Squelette } from '../../ui/squelette/squelette';
import { Tampon } from '../../ui/tampon/tampon';

/**
 * Historique des commandes.
 *
 * Une commande dont le paiement est encore en vol porte un lien vers son
 * suivi : c'est le cas du client qui a fermé la page pendant la validation
 * USSD, et il doit pouvoir y revenir sans chercher.
 */
@Component({
  selector: 'app-mes-commandes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Montant, Tampon, Squelette, EtatVide, Alerte],
  templateUrl: './mes-commandes.html',
  styleUrl: './mes-commandes.css',
})
export class MesCommandes {
  private readonly paiement = inject(PaiementService);

  protected readonly commandes = signal<Commande[] | null>(null);
  protected readonly erreur = signal<string | null>(null);

  /** Les plus récentes d'abord : c'est celle de tout à l'heure qu'on cherche. */
  protected readonly triees = computed(() =>
    [...(this.commandes() ?? [])].sort((a, b) => b.idCommande - a.idCommande),
  );

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.erreur.set(null);
    this.commandes.set(null);
    this.paiement.mesCommandes().subscribe({
      next: (liste) => this.commandes.set(liste),
      error: (erreur: ErreurBoutique) => this.erreur.set(erreur.message),
    });
  }

  /** Un paiement encore en vol : le suivi reste utile. */
  protected suiviUtile(commande: Commande): boolean {
    return (
      commande.referencePaiement !== null &&
      (commande.statutPaiement === 'EN_COURS' || commande.statutPaiement === 'EN_ATTENTE')
    );
  }

  /** Une commande non réglée peut repartir en paiement. */
  protected aPayer(commande: Commande): boolean {
    return commande.statut === 'EN_ATTENTE';
  }
}
