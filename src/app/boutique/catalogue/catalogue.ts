import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Article, Categorie } from '../../models/api.models';
import { ErreurBoutique } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CatalogueService } from '../../services/catalogue.service';
import { PanierService } from '../../services/panier.service';
import { Alerte } from '../../ui/alerte/alerte';
import { CarteArticle } from '../../ui/carte-article/carte-article';
import { EtatVide } from '../../ui/etat-vide/etat-vide';
import { Squelette } from '../../ui/squelette/squelette';

type Tri = 'pertinence' | 'prix-croissant' | 'prix-decroissant' | 'nom';

/**
 * Catalogue.
 *
 * **Le filtrage se fait côté navigateur**, sur la liste complète chargée
 * une fois. L'API n'expose pas de recherche plein texte publique, et le
 * catalogue tient largement en une réponse. Le jour où il ne tiendra plus,
 * c'est un endpoint de recherche paginé qu'il faudra ajouter côté API — pas
 * un bricolage ici.
 *
 * L'état des filtres vit dans l'URL (`?q=`, `?categorie=`, `?tri=`). Trois
 * conséquences voulues : le bouton Retour fonctionne, un résultat de
 * recherche se partage par lien, et un rechargement ne perd rien.
 */
@Component({
  selector: 'app-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CarteArticle, Squelette, EtatVide, Alerte],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.css',
})
export class Catalogue {
  private readonly catalogueService = inject(CatalogueService);
  private readonly panier = inject(PanierService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly connecte = this.auth.connecte;

  protected readonly articles = signal<Article[] | null>(null);
  protected readonly rayons = signal<Categorie[]>([]);
  protected readonly erreur = signal<string | null>(null);

  protected readonly ajoutEnCours = signal<number | null>(null);
  protected readonly ajoute = signal<number | null>(null);

  /** Les filtres viennent de l'URL : elle est la source de vérité. */
  private readonly parametres = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly termeRecherche = computed(() => this.parametres().get('q') ?? '');
  protected readonly categorieActive = computed(() => {
    const brut = this.parametres().get('categorie');
    const valeur = brut ? Number(brut) : NaN;
    return Number.isNaN(valeur) ? null : valeur;
  });
  protected readonly tri = computed<Tri>(() => {
    const valeur = this.parametres().get('tri');
    return valeur === 'prix-croissant' ||
      valeur === 'prix-decroissant' ||
      valeur === 'nom'
      ? valeur
      : 'pertinence';
  });

  private readonly nomsRayons = computed(
    () => new Map(this.rayons().map((r) => [r.idCategorie, r.nomCategorie])),
  );

  protected readonly nomCategorieActive = computed(() => {
    const id = this.categorieActive();
    return id === null ? null : (this.nomsRayons().get(id) ?? null);
  });

  /** Nombre d'articles par rayon, pour afficher les compteurs des onglets. */
  protected readonly comptes = computed(() => {
    const compte = new Map<number, number>();
    for (const article of this.articles() ?? []) {
      compte.set(article.categorieId, (compte.get(article.categorieId) ?? 0) + 1);
    }
    return compte;
  });

  protected readonly resultats = computed<Article[]>(() => {
    let liste = this.articles() ?? [];

    const categorie = this.categorieActive();
    if (categorie !== null) {
      liste = liste.filter((article) => article.categorieId === categorie);
    }

    const terme = normaliser(this.termeRecherche());
    if (terme) {
      // Recherche sur le nom et la description, accents et casse ignorés :
      // personne ne tape « vêtement » avec l'accent sur un clavier de
      // téléphone.
      liste = liste.filter(
        (article) =>
          normaliser(article.nom).includes(terme) ||
          normaliser(article.description ?? '').includes(terme),
      );
    }

    switch (this.tri()) {
      case 'prix-croissant':
        return [...liste].sort((a, b) => a.prix - b.prix);
      case 'prix-decroissant':
        return [...liste].sort((a, b) => b.prix - a.prix);
      case 'nom':
        return [...liste].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
      default:
        return liste;
    }
  });

  protected readonly filtreActif = computed(
    () => this.termeRecherche() !== '' || this.categorieActive() !== null,
  );

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.erreur.set(null);
    this.articles.set(null);

    this.catalogueService.tousLesArticles().subscribe({
      next: (liste) => this.articles.set(liste),
      error: (erreur: ErreurBoutique) => this.erreur.set(erreur.message),
    });

    this.catalogueService.categories().subscribe({
      next: (liste) => this.rayons.set(liste),
      error: () => undefined,
    });
  }

  protected nomRayon(idCategorie: number): string {
    return this.nomsRayons().get(idCategorie) ?? '';
  }

  /** Les filtres passent par l'URL, jamais par un état local parallèle. */
  protected filtrerParCategorie(idCategorie: number | null): void {
    this.naviguer({ categorie: idCategorie });
  }

  protected changerTri(evenement: Event): void {
    const valeur = (evenement.target as HTMLSelectElement).value as Tri;
    this.naviguer({ tri: valeur === 'pertinence' ? null : valeur });
  }

  protected viderFiltres(): void {
    this.router.navigate(['/catalogue']);
  }

  private naviguer(modifications: Record<string, string | number | null>): void {
    this.router.navigate(['/catalogue'], {
      queryParams: modifications,
      queryParamsHandling: 'merge',
    });
  }

  protected ajouterAuPanier(article: Article): void {
    if (!this.connecte()) {
      this.router.navigate(['/connexion'], {
        queryParams: { suite: this.router.url },
      });
      return;
    }
    this.ajoutEnCours.set(article.id);
    this.panier.ajouter(article.id, 1).subscribe({
      next: () => {
        this.ajoutEnCours.set(null);
        this.ajoute.set(article.id);
        setTimeout(() => {
          if (this.ajoute() === article.id) {
            this.ajoute.set(null);
          }
        }, 2200);
      },
      error: (erreur: ErreurBoutique) => {
        this.ajoutEnCours.set(null);
        this.erreur.set(erreur.message);
      },
    });
  }
}

/** Minuscules sans accents : « Vêtement » et « vetement » se valent. */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}
