import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ErreurBoutique } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PaiementService } from '../../services/paiement.service';
import { PanierService } from '../../services/panier.service';
import { ParametresService } from '../../services/parametres.service';
import { Alerte } from '../../ui/alerte/alerte';

/**
 * Création de compte.
 *
 * L'inscription enchaîne directement sur la connexion : demander à
 * quelqu'un de ressaisir l'email et le mot de passe qu'il vient de choisir
 * est une friction gratuite, et sur mobile elle fait abandonner.
 *
 * Les règles de validation reprennent exactement celles de l'API — huit
 * caractères, email valide, numéro camerounais — pour que l'erreur
 * s'affiche avant l'aller-retour réseau plutôt qu'après.
 */
@Component({
  selector: 'app-inscription',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Alerte],
  templateUrl: './inscription.html',
  styleUrl: './inscription.css',
})
export class Inscription {
  private readonly auth = inject(AuthService);
  private readonly panier = inject(PanierService);
  private readonly paiement = inject(PaiementService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly parametres = inject(ParametresService);

  protected readonly nomBoutique = this.parametres.nom;

  protected readonly nom = signal('');
  protected readonly prenom = signal('');
  protected readonly email = signal('');
  protected readonly motDePasse = signal('');
  protected readonly telephone = signal('');
  protected readonly adresse = signal('');

  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly champsInvalides = signal<[string, string][] | null>(null);
  protected readonly touche = signal(false);

  private readonly suite = this.route.snapshot.queryParamMap.get('suite');

  protected readonly erreurEmail = computed(() => {
    if (!this.touche() || this.email() === '') {
      return null;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email().trim())
      ? null
      : "Format d'email invalide.";
  });

  protected readonly erreurMotDePasse = computed(() => {
    if (!this.touche() || this.motDePasse() === '') {
      return null;
    }
    return this.motDePasse().length >= 8
      ? null
      : 'Le mot de passe doit faire au moins 8 caractères.';
  });

  protected readonly erreurTelephone = computed(() => {
    if (this.telephone() === '') {
      return null;
    }
    return this.paiement.numeroValide(this.telephone())
      ? null
      : 'Numéro camerounais invalide (9 chiffres).';
  });

  protected readonly peutEnvoyer = computed(
    () =>
      !this.envoi() &&
      this.nom().trim() !== '' &&
      this.email().trim() !== '' &&
      this.motDePasse().length >= 8 &&
      this.erreurEmail() === null &&
      this.erreurTelephone() === null,
  );

  protected soumettre(): void {
    this.touche.set(true);
    if (!this.peutEnvoyer()) {
      return;
    }
    this.envoi.set(true);
    this.erreur.set(null);
    this.champsInvalides.set(null);

    const email = this.email().trim();
    const motDePasse = this.motDePasse();

    this.auth
      .inscription({
        nom: this.nom().trim(),
        prenom: this.prenom().trim() || undefined,
        email,
        motDePasse,
        adresse: this.adresse().trim() || undefined,
        numeroTelephone: this.paiement.normaliser(this.telephone()) || undefined,
      })
      .subscribe({
        next: () => this.connecterEtPoursuivre(email, motDePasse),
        error: (erreur: ErreurBoutique) => {
          this.envoi.set(false);
          this.erreur.set(erreur.message);
          if (erreur.champs) {
            this.champsInvalides.set(Object.entries(erreur.champs));
          }
        },
      });
  }

  /** Le compte existe : on ouvre la session sans refaire saisir quoi que ce soit. */
  private connecterEtPoursuivre(email: string, motDePasse: string): void {
    this.auth.connexion(email, motDePasse).subscribe({
      next: () => {
        this.envoi.set(false);
        this.panier.charger().subscribe({ error: () => undefined });
        this.router.navigateByUrl(this.suite ?? '/');
      },
      error: () => {
        // Le compte a bien été créé : on ne perd pas ce travail, on invite
        // simplement à se connecter.
        this.envoi.set(false);
        this.router.navigate(['/connexion'], {
          queryParams: this.suite ? { suite: this.suite } : {},
        });
      },
    });
  }

  protected lienConnexion(): Record<string, string> {
    return this.suite ? { suite: this.suite } : {};
  }
}
