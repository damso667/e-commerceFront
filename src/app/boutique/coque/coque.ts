import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EtatReseauService } from '../../core/etat-reseau.service';
import { Categorie } from '../../models/api.models';
import { AuthService } from '../../services/auth.service';
import { CatalogueService } from '../../services/catalogue.service';
import { PanierService } from '../../services/panier.service';
import { ParametresService } from '../../services/parametres.service';
import { MarquePaiement } from '../../ui/marque-paiement/marque-paiement';

/**
 * Coque de la boutique : en-tête, contenu, pied de page.
 *
 * Deux exigences qui gouvernent l'en-tête, et qui manquaient à la version
 * précédente :
 *
 *  - **La recherche est visible en permanence**, pas cachée derrière une
 *    loupe. C'est le premier geste d'un acheteur qui sait ce qu'il veut.
 *  - **Le panier est toujours là**, même déconnecté. Le masquer tant qu'on
 *    n'a pas de compte revient à cacher la sortie de caisse : un visiteur
 *    non connecté doit voir où atterrissent ses articles. Le clic l'emmène
 *    se connecter, puis le ramène au panier.
 *
 * Le back-office a sa propre coque : les deux sont montées par le routeur,
 * ce qui évite de tester l'URL à la main — un test qui ne se mettrait pas à
 * jour à la navigation.
 */
@Component({
  selector: 'app-coque-boutique',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MarquePaiement],
  templateUrl: './coque.html',
  styleUrl: './coque.css',
})
export class CoqueBoutique {
  private readonly parametresService = inject(ParametresService);
  private readonly authService = inject(AuthService);
  private readonly panierService = inject(PanierService);
  private readonly catalogue = inject(CatalogueService);
  private readonly reseau = inject(EtatReseauService);
  private readonly router = inject(Router);

  protected readonly nom = this.parametresService.nom;
  protected readonly monogramme = this.parametresService.monogramme;
  protected readonly logo = this.parametresService.logoAffiche;
  protected readonly paiementSimule = this.parametresService.paiementSimule;
  protected readonly slogan = computed(() => this.parametresService.parametres().slogan);
  protected readonly telephone = computed(
    () => this.parametresService.parametres().telephoneContact,
  );
  protected readonly email = computed(() => this.parametresService.parametres().emailContact);
  protected readonly adresse = computed(() => this.parametresService.parametres().adresse);

  protected readonly connecte = this.authService.connecte;
  protected readonly estAdmin = this.authService.estAdmin;
  protected readonly nombreArticles = this.panierService.nombreArticles;

  protected readonly horsLigne = this.reseau.estHorsLigne;
  protected readonly serveurSeReveille = this.reseau.serveurSeReveille;

  /** Annee du bas de page. Calculee une fois : elle ne change pas en
   *  cours de session, et un signal ici n'apporterait rien. */
  protected readonly annee = new Date().getFullYear();

  protected readonly rayons = signal<Categorie[]>([]);
  protected readonly recherche = signal('');
  protected readonly menuOuvert = signal(false);

  protected readonly libellePanier = computed(() => {
    const n = this.nombreArticles();
    return n === 0 ? 'Panier, vide' : `Panier, ${n} article${n > 1 ? 's' : ''}`;
  });

  constructor() {
    // Les rayons alimentent la navigation : une seule requête pour toute
    // la session, partagée par tous les écrans de la boutique.
    this.catalogue.categories().subscribe({
      next: (liste) => this.rayons.set(liste),
      error: () => undefined, // La boutique reste utilisable sans la barre de rayons.
    });

    // Le panier n'est chargé que si une session existe : l'appeler sans
    // compte produirait un 403 à chaque ouverture de page.
    if (this.connecte()) {
      this.panierService.charger().subscribe({
        error: () => this.authService.oublier(),
      });
    }
  }

  protected lancerRecherche(evenement: Event): void {
    evenement.preventDefault();
    const terme = this.recherche().trim();
    this.menuOuvert.set(false);
    this.router.navigate(['/catalogue'], {
      queryParams: terme ? { q: terme } : {},
    });
  }

  protected basculerMenu(): void {
    this.menuOuvert.update((v) => !v);
  }

  protected fermerMenu(): void {
    this.menuOuvert.set(false);
  }

  /** Déconnecté, le panier mène d'abord à la connexion, puis y revient. */
  protected cheminPanier(): unknown[] {
    return this.connecte() ? ['/panier'] : ['/connexion'];
  }

  protected parametresPanier(): Record<string, string> {
    return this.connecte() ? {} : { suite: '/panier' };
  }

  protected seDeconnecter(): void {
    this.authService.deconnexion().subscribe({
      next: () => this.apresDeconnexion(),
      // Même si l'API refuse, la session locale doit partir : sinon
      // l'interface prétend qu'on est connecté alors qu'on ne l'est plus.
      error: () => this.apresDeconnexion(),
    });
  }

  private apresDeconnexion(): void {
    this.authService.oublier();
    this.panierService.oublier();
    this.router.navigate(['/']);
  }
}
