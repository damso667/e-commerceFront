import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ErreurBoutique } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PanierService } from '../../services/panier.service';
import { ParametresService } from '../../services/parametres.service';
import { Alerte } from '../../ui/alerte/alerte';

/**
 * Connexion.
 *
 * Deux détails qui changent l'expérience :
 *
 *  - **On revient d'où l'on vient.** Le paramètre `suite` porte la
 *    destination ; sans lui, un visiteur qui cliquait « Ajouter au panier »
 *    se retrouverait sur l'accueil et devrait refaire tout son chemin.
 *  - **Le panier est rechargé après la connexion**, pour que le compteur de
 *    l'en-tête soit juste immédiatement.
 */
@Component({
  selector: 'app-connexion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Alerte],
  templateUrl: './connexion.html',
  styleUrl: './connexion.css',
})
export class Connexion {
  private readonly auth = inject(AuthService);
  private readonly panier = inject(PanierService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly parametres = inject(ParametresService);

  protected readonly nom = this.parametres.nom;

  protected readonly email = signal('');
  protected readonly motDePasse = signal('');
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);

  private readonly suite = this.route.snapshot.queryParamMap.get('suite');

  /** Posé par l'intercepteur quand une session a expiré en cours de route. */
  protected readonly sessionExpiree =
    this.route.snapshot.queryParamMap.get('expiree') === '1';

  protected readonly peutEnvoyer = computed(
    () => !this.envoi() && this.email().trim() !== '' && this.motDePasse() !== '',
  );

  protected soumettre(): void {
    if (!this.peutEnvoyer()) {
      return;
    }
    this.envoi.set(true);
    this.erreur.set(null);

    this.auth.connexion(this.email().trim(), this.motDePasse()).subscribe({
      next: (session) => {
        this.envoi.set(false);
        // Le panier est propre au compte : on le charge maintenant plutôt
        // que d'attendre la première page qui en a besoin.
        this.panier.charger().subscribe({ error: () => undefined });

        if (this.suite) {
          this.router.navigateByUrl(this.suite);
        } else if (session.role === 'ROLE_ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (erreur: ErreurBoutique) => {
        this.envoi.set(false);
        this.erreur.set(erreur.message);
      },
    });
  }

  protected lienInscription(): unknown[] {
    return ['/inscription'];
  }

  protected parametresInscription(): Record<string, string> {
    return this.suite ? { suite: this.suite } : {};
  }
}
