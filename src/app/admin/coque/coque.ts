import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ParametresService } from '../../services/parametres.service';

interface Rubrique {
  chemin: string;
  libelle: string;
  cle: string;
}

/**
 * Coque du back-office.
 *
 * Elle est montée par le routeur sur son propre arbre, séparée de celle de
 * la boutique : les deux n'ont ni la même densité ni la même navigation, et
 * les faire cohabiter dans une coque unique obligerait à tester l'URL à la
 * main — un test qu'on oublie de mettre à jour.
 *
 * La navigation est une colonne sur grand écran et une barre qui défile
 * horizontalement sur téléphone. Pas de tiroir à ouvrir : huit rubriques
 * tiennent dans une barre, et un tiroir ajoute un geste avant chaque
 * changement d'écran.
 */
@Component({
  selector: 'app-coque-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './coque.html',
  styleUrl: './coque.css',
})
export class CoqueAdmin {
  private readonly parametres = inject(ParametresService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly nom = this.parametres.nom;
  protected readonly monogramme = this.parametres.monogramme;
  protected readonly logo = this.parametres.logoAffiche;

  protected readonly rubriques: Rubrique[] = [
    { chemin: 'tableau-de-bord', libelle: 'Tableau de bord', cle: 'bord' },
    { chemin: 'commandes', libelle: 'Commandes', cle: 'commandes' },
    { chemin: 'paiements', libelle: 'Paiements', cle: 'paiements' },
    { chemin: 'articles', libelle: 'Catalogue', cle: 'articles' },
    { chemin: 'clients', libelle: 'Clients', cle: 'clients' },
    { chemin: 'avis', libelle: 'Avis', cle: 'avis' },
    { chemin: 'journal', libelle: 'Journal', cle: 'journal' },
    { chemin: 'identite', libelle: 'Identité', cle: 'identite' },
  ];

  protected seDeconnecter(): void {
    this.auth.deconnexion().subscribe({
      next: () => this.apres(),
      error: () => this.apres(),
    });
  }

  private apres(): void {
    this.auth.oublier();
    this.router.navigate(['/']);
  }
}
