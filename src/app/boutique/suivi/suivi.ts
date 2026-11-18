import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Paiement } from '../../models/api.models';
import { ApiService, ErreurBoutique } from '../../services/api.service';
import { PaiementService } from '../../services/paiement.service';
import { Alerte } from '../../ui/alerte/alerte';
import { MarquePaiement } from '../../ui/marque-paiement/marque-paiement';
import { Montant } from '../../ui/montant/montant';
import { Tampon } from '../../ui/tampon/tampon';

/**
 * Suivi d'un paiement mobile money.
 *
 * Le client valide sur son téléphone par code USSD : l'issue arrive donc de
 * façon asynchrone, quelques secondes à quelques minutes plus tard. Cet
 * écran interroge l'API jusqu'à un statut terminal, et c'est l'API qui se
 * charge de réconcilier auprès de l'opérateur.
 *
 * Ce qui compte ici : **ne jamais laisser croire que c'est fini quand ça ne
 * l'est pas**, et nommer précisément ce qui s'est passé quand ça échoue.
 * « Échec du paiement » n'aide personne ; « solde insuffisant » dit quoi
 * faire ensuite.
 */
@Component({
  selector: 'app-suivi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Montant, Tampon, Alerte, MarquePaiement],
  templateUrl: './suivi.html',
  styleUrl: './suivi.css',
})
export class Suivi {
  private readonly paiementService = inject(PaiementService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruction = inject(DestroyRef);

  protected readonly reference = this.route.snapshot.paramMap.get('reference') ?? '';

  protected readonly paiement = signal<Paiement | null>(null);
  protected readonly erreur = signal<string | null>(null);
  protected readonly suiviTermine = signal(false);
  protected readonly nouvelleTentative = signal(false);

  private readonly debut = Date.now();
  protected readonly secondes = signal(0);

  protected readonly statut = computed(() => this.paiement()?.statut ?? null);
  protected readonly enAttente = computed(() => {
    const p = this.paiement();
    return p !== null && !p.terminal;
  });
  protected readonly reussi = computed(() => this.statut() === 'PAYE');
  protected readonly echoue = computed(() => {
    const s = this.statut();
    return s === 'ECHOUE' || s === 'EXPIRE' || s === 'ANNULE';
  });

  /**
   * Message adapté au motif réel. Le code d'erreur vient de l'opérateur ;
   * le traduire en conseil est tout l'intérêt de l'afficher.
   */
  protected readonly conseil = computed(() => {
    const p = this.paiement();
    if (!p || !this.echoue()) {
      return null;
    }
    switch (p.codeErreur) {
      case 'FONDS_INSUFFISANTS':
        return "Le solde du compte mobile money n'était pas suffisant. Rechargez-le, puis relancez le paiement.";
      case 'REFUSE_PAR_UTILISATEUR':
        return 'La demande a été refusée sur le téléphone. Si c’était une erreur, relancez le paiement.';
      case 'TIMEOUT':
        return "La demande a expiré faute de validation. Gardez votre téléphone à portée et relancez le paiement.";
      case 'COMPTE_INTROUVABLE':
        return "Aucun compte mobile money actif pour ce numéro. Vérifiez le numéro, ou essayez l'autre opérateur.";
      case 'MONTANT_INCOHERENT':
        return "Le montant notifié ne correspondait pas à la commande. Le paiement a été refusé par sécurité. Contactez la boutique.";
      default:
        return "Le paiement n'a pas abouti. Vous pouvez relancer la demande.";
    }
  });

  /** Le compteur rassure : il montre que l'attente est suivie. */
  protected readonly attenteLisible = computed(() => {
    const s = this.secondes();
    if (s < 60) {
      return `${s} s`;
    }
    return `${Math.floor(s / 60)} min ${`${s % 60}`.padStart(2, '0')} s`;
  });

  constructor() {
    if (!this.reference) {
      this.erreur.set('Référence de paiement manquante.');
      return;
    }
    this.lancerSuivi();

    const minuteur = setInterval(() => {
      this.secondes.set(Math.floor((Date.now() - this.debut) / 1000));
    }, 1000);
    this.destruction.onDestroy(() => clearInterval(minuteur));
  }

  private lancerSuivi(): void {
    this.paiementService
      .suivre(this.reference)
      .pipe(takeUntilDestroyed(this.destruction))
      .subscribe({
        next: (p) => {
          this.paiement.set(p);
          if (p.terminal) {
            this.suiviTermine.set(true);
          }
        },
        error: (erreur: ErreurBoutique) => {
          this.erreur.set(erreur.message);
          this.suiviTermine.set(true);
        },
        complete: () => this.suiviTermine.set(true),
      });
  }

  /** Relance une tentative sur la même commande. */
  protected relancer(): void {
    const p = this.paiement();
    if (!p || !p.idCommande) {
      this.router.navigate(['/panier']);
      return;
    }
    this.nouvelleTentative.set(true);
    this.erreur.set(null);

    this.paiementService
      .reessayer(p.idCommande, p.fournisseur, p.numeroPayeur ?? '', this.api.nouvelleCle())
      .subscribe({
        next: (nouveau) => {
          this.nouvelleTentative.set(false);
          this.router.navigate(['/paiement', nouveau.reference]);
        },
        error: (erreur: ErreurBoutique) => {
          this.nouvelleTentative.set(false);
          this.erreur.set(erreur.message);
        },
      });
  }

  protected libelleFournisseur(): string {
    const p = this.paiement();
    return p ? this.paiementService.libelleFournisseur(p.fournisseur) : '';
  }
}
