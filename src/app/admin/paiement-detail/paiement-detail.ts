import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PaiementDetailAdmin } from '../../models/api.models';
import { AdminPaiementsService } from '../../services/admin-paiements.service';
import { ErreurBoutique } from '../../services/api.service';
import { Alerte } from '../../ui/alerte/alerte';
import { MarquePaiement } from '../../ui/marque-paiement/marque-paiement';
import { Montant } from '../../ui/montant/montant';
import { Squelette } from '../../ui/squelette/squelette';
import { Tampon } from '../../ui/tampon/tampon';

/**
 * Fiche d'un paiement.
 *
 * Trois choses y sont réunies parce qu'on ne peut rien conclure avec une
 * seule : le paiement courant, **toutes les tentatives** de la commande, et
 * **les événements reçus de l'opérateur**. Un client qui dit avoir été
 * débité alors que la commande est en échec se tranche en regardant les
 * callbacks, pas le statut.
 *
 * Le remboursement est derrière une confirmation explicite, et son
 * résultat est affiché tel quel : quand `automatique` est faux, le paiement
 * est marqué remboursé mais **l'argent n'a pas bougé**. Afficher un succès
 * sans cette nuance ferait croire le virement fait.
 */
@Component({
  selector: 'app-admin-paiement-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Montant, Tampon, Squelette, Alerte, MarquePaiement],
  templateUrl: './paiement-detail.html',
  styleUrl: './paiement-detail.css',
})
export class AdminPaiementDetail {
  private readonly service = inject(AdminPaiementsService);
  private readonly route = inject(ActivatedRoute);

  private readonly parametres = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly detail = signal<PaiementDetailAdmin | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  /* ---------- Remboursement ---------- */

  protected readonly formulaireOuvert = signal(false);
  protected readonly motif = signal('');
  protected readonly envoi = signal(false);
  protected readonly erreurRemboursement = signal<string | null>(null);
  protected readonly consigne = signal<string | null>(null);
  protected readonly remboursementAutomatique = signal(true);

  protected readonly remboursable = computed(() => this.detail()?.paiement.statut === 'PAYE');

  protected readonly peutRembourser = computed(
    () => !this.envoi() && this.motif().trim().length >= 3,
  );

  constructor() {
    effect(() => {
      const reference = this.parametres().get('reference');
      if (reference) {
        this.charger(reference);
      }
    });
  }

  protected charger(reference: string): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.service.detail(reference).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.chargement.set(false);
      },
      error: (erreur: ErreurBoutique) => {
        this.chargement.set(false);
        this.erreur.set(erreur.message);
      },
    });
  }

  protected rembourser(): void {
    const courant = this.detail();
    if (!courant || !this.peutRembourser()) {
      return;
    }
    this.envoi.set(true);
    this.erreurRemboursement.set(null);

    this.service.rembourser(courant.paiement.reference, this.motif().trim()).subscribe({
      next: (resultat) => {
        this.envoi.set(false);
        this.formulaireOuvert.set(false);
        this.motif.set('');
        this.remboursementAutomatique.set(resultat.automatique);
        this.consigne.set(resultat.consigne);
        this.charger(courant.paiement.reference);
      },
      error: (erreur: ErreurBoutique) => {
        this.envoi.set(false);
        this.erreurRemboursement.set(erreur.message);
      },
    });
  }

  protected horodatage(valeur: string | null): string {
    if (!valeur) {
      return '—';
    }
    const date = new Date(valeur);
    if (Number.isNaN(date.getTime())) {
      return valeur;
    }
    return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' });
  }

  /** La charge du callback est du JSON brut : on la remet en forme. */
  protected lisible(charge: string | null): string {
    if (!charge) {
      return '';
    }
    try {
      return JSON.stringify(JSON.parse(charge), null, 2);
    } catch {
      return charge;
    }
  }
}
