import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FournisseurPaiement } from '../../models/api.models';
import { ApiService, ErreurBoutique } from '../../services/api.service';
import { PaiementService } from '../../services/paiement.service';
import { PanierService } from '../../services/panier.service';
import { Alerte } from '../../ui/alerte/alerte';
import { EtatVide } from '../../ui/etat-vide/etat-vide';
import { Montant } from '../../ui/montant/montant';
import { Squelette } from '../../ui/squelette/squelette';

/**
 * Commande et paiement.
 *
 * **L'idempotence est le point critique de cet écran.** Une clé est générée
 * pour la tentative et conservée tant que le contenu de la demande ne
 * change pas : un double-clic sur « Payer », un rechargement de page ou un
 * retry du navigateur renvoient alors la réponse d'origine au lieu de créer
 * une seconde commande et un second débit.
 *
 * La clé est renouvelée lorsque l'opérateur ou le numéro change, parce que
 * c'est alors une autre opération — et réutiliser la clé ferait répondre
 * l'API avec l'ancienne tentative.
 */
@Component({
  selector: 'app-commande',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Montant, Squelette, EtatVide, Alerte],
  templateUrl: './commande.html',
  styleUrl: './commande.css',
})
export class CommandePage {
  private readonly panierService = inject(PanierService);
  private readonly paiement = inject(PaiementService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly panier = this.panierService.panier;
  protected readonly total = this.panierService.total;
  protected readonly nombreArticles = this.panierService.nombreArticles;

  protected readonly chargement = signal(true);
  protected readonly envoiEnCours = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly champsInvalides = signal<[string, string][] | null>(null);

  protected readonly numero = signal('');
  protected readonly fournisseurChoisi = signal<FournisseurPaiement | null>(null);
  protected readonly touche = signal(false);

  /** Clé d'idempotence de la tentative en cours. */
  private readonly cle = signal(this.api.nouvelleCle());

  protected readonly vide = computed(
    () => !this.chargement() && (this.panier()?.lignes.length ?? 0) === 0,
  );

  /** Opérateur déduit du numéro saisi, affiché mais jamais imposé. */
  protected readonly fournisseurDeduit = computed(() =>
    this.paiement.deduireFournisseur(this.numero()),
  );

  protected readonly fournisseur = computed(
    () => this.fournisseurChoisi() ?? this.fournisseurDeduit(),
  );

  protected readonly numeroValide = computed(() => this.paiement.numeroValide(this.numero()));

  protected readonly erreurNumero = computed(() => {
    if (!this.touche() || this.numero() === '') {
      return null;
    }
    if (!this.numeroValide()) {
      return 'Numéro invalide. Attendu : 9 chiffres, par exemple 677 12 34 56.';
    }
    if (!this.fournisseurDeduit()) {
      return "Ce numéro n'est servi ni par MTN ni par Orange.";
    }
    return null;
  });

  protected readonly peutPayer = computed(
    () =>
      !this.envoiEnCours() &&
      this.numeroValide() &&
      this.fournisseur() !== null &&
      this.nombreArticles() > 0,
  );

  constructor() {
    this.panierService.charger().subscribe({
      next: () => this.chargement.set(false),
      error: (erreur: ErreurBoutique) => {
        this.chargement.set(false);
        if (erreur.statut !== 404) {
          this.erreur.set(erreur.message);
        }
      },
    });

    // Changer d'opérateur ou de numéro, c'est une autre opération : la clé
    // doit suivre, sinon l'API renverrait la tentative précédente.
    effect(() => {
      this.numero();
      this.fournisseurChoisi();
      this.cle.set(this.api.nouvelleCle());
    });
  }

  protected majNumero(evenement: Event): void {
    const brut = (evenement.target as HTMLInputElement).value;
    this.numero.set(this.paiement.normaliser(brut));
    // Changer de numéro peut changer d'opérateur : on laisse la déduction
    // reprendre la main plutôt que de garder un choix devenu faux.
    this.fournisseurChoisi.set(null);
  }

  protected choisirFournisseur(valeur: FournisseurPaiement): void {
    this.fournisseurChoisi.set(valeur);
  }

  protected libelle(valeur: FournisseurPaiement): string {
    return this.paiement.libelleFournisseur(valeur);
  }

  protected payer(): void {
    const fournisseur = this.fournisseur();
    if (!fournisseur || !this.peutPayer()) {
      this.touche.set(true);
      return;
    }
    this.envoiEnCours.set(true);
    this.erreur.set(null);
    this.champsInvalides.set(null);

    this.paiement.commanderEtPayer(fournisseur, this.numero(), this.cle()).subscribe({
      next: (resultat) => {
        this.envoiEnCours.set(false);
        // Le serveur a vidé le panier : on s'aligne au lieu d'attendre un
        // rechargement, sinon le compteur de l'en-tête mentirait.
        this.panierService.oublier();
        this.router.navigate(['/paiement', resultat.paiement.reference]);
      },
      error: (erreur: ErreurBoutique) => {
        this.envoiEnCours.set(false);
        this.erreur.set(erreur.message);
        if (erreur.champs) {
          this.champsInvalides.set(Object.entries(erreur.champs));
        }
      },
    });
  }
}
