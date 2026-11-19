import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Article, Categorie } from '../../models/api.models';
import { ErreurBoutique } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CatalogueService } from '../../services/catalogue.service';
import { PanierService } from '../../services/panier.service';
import { ParametresService } from '../../services/parametres.service';
import { Alerte } from '../../ui/alerte/alerte';
import { CarteArticle } from '../../ui/carte-article/carte-article';
import { Carrousel, Diapositive } from '../../ui/carrousel/carrousel';
import { EtatVide } from '../../ui/etat-vide/etat-vide';
import { Squelette } from '../../ui/squelette/squelette';

/** Un rayon mis en avant sur l'accueil. */
interface Rayon {
  idCategorie: number;
  nom: string;
  articles: Article[];
  total: number;
}

/**
 * Accueil.
 *
 * Composition volontairement conventionnelle — c'est ce que les acheteurs
 * connaissent et ce que l'utilisateur a demandé : carrousel de mises en
 * avant, puis une sélection, puis les rayons. L'ambition se joue sur
 * l'exécution, pas sur l'écart au modèle.
 *
 * Peu d'éléments par écran, grandes cartes, beaucoup de blanc : le registre
 * est celui des boutiques soignées, pas celui des portails denses.
 */
@Component({
  selector: 'app-accueil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CarteArticle, Carrousel, Squelette, EtatVide, Alerte],
  templateUrl: './accueil.html',
  styleUrl: './accueil.css',
})
export class Accueil {
  private readonly catalogue = inject(CatalogueService);
  private readonly panier = inject(PanierService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly parametresService = inject(ParametresService);

  /** Cartes par rayon sur l'accueil : au-delà, la page devient un listing. */
  private static readonly PAR_RAYON = 4;
  private static readonly EN_VEDETTE = 8;

  protected readonly nom = this.parametresService.nom;
  protected readonly connecte = this.auth.connecte;

  protected readonly articles = signal<Article[] | null>(null);
  protected readonly categories = signal<Categorie[]>([]);
  protected readonly erreur = signal<string | null>(null);

  protected readonly ajoutEnCours = signal<number | null>(null);
  protected readonly ajoute = signal<number | null>(null);

  private readonly nomsRayons = computed(
    () => new Map(this.categories().map((c) => [c.idCategorie, c.nomCategorie])),
  );

  /**
   * Diapositives du carrousel.
   *
   * Construites à partir de données réelles : le nombre d'articles et les
   * rayons existants. Aucun slogan commercial inventé, aucune promotion
   * fictive. Quand des photos seront fournies, elles se poseront ici via
   * `imageUrl` sans changer la structure.
   */
  protected readonly diapositives = computed<Diapositive[]>(() => {
    const liste = this.articles();
    if (!liste || liste.length === 0) {
      return [];
    }

    // Une photo ne sert qu'une fois : deux diapositives qui montrent la
    // meme image donnent l'impression d'un carrousel cassé, et c'est ce
    // qui arrivait quand l'adresse était écrite dans la boucle.
    const deja = new Set<string>();
    const photoDe = (articles: Article[]): string | null => {
      const trouve = articles.find((a) => a.imageUrl && !deja.has(a.imageUrl));
      if (!trouve?.imageUrl) {
        return null;
      }
      deja.add(trouve.imageUrl);
      return trouve.imageUrl;
    };

    // Les deux rayons les plus fournis : une mise en avant qui dit vrai.
    const parTaille = [...this.rayons()].sort((a, b) => b.total - a.total).slice(0, 2);

    // Les rayons choisissent leur photo en premier : chacun prend une
    // image de ses propres articles, ce qui est la seule façon d'illustrer
    // « Vêtement » avec un vêtement sans écrire de correspondance en dur.
    // Une table id-de-rayon vers adresse ne survivrait pas au premier
    // marchand qui renomme ou réordonne ses rayons.
    const diaposRayons: Diapositive[] = parTaille.map((rayon) => ({
      id: `rayon-${rayon.idCategorie}`,
      titre: rayon.nom,
      texte: `${rayon.total} article${rayon.total > 1 ? 's' : ''} dans ce rayon.`,
      lien: '/catalogue',
      // Sans ce filtre, les diapositives menaient toutes au catalogue
      // entier : « Voir le rayon » promettait ce que le clic ne tenait pas.
      parametresLien: { categorie: rayon.idCategorie },
      libelleLien: 'Voir le rayon',
      imageUrl: photoDe(this.articlesDuRayon(rayon.idCategorie)),
    }));

    return [
      {
        id: 'catalogue',
        titre: `${liste.length} articles à découvrir`,
        texte: 'Payez avec MTN Mobile Money ou Orange Money, depuis votre téléphone.',
        lien: '/catalogue',
        libelleLien: 'Voir le catalogue',
        imageUrl: photoDe(liste),
      },
      ...diaposRayons,
    ];
  });

  /** Tous les articles d'un rayon, et pas seulement les quatre affichés. */
  private articlesDuRayon(idCategorie: number): Article[] {
    return (this.articles() ?? []).filter((a) => a.categorieId === idCategorie);
  }

  /** Sélection d'ouverture : les articles les mieux approvisionnés. */
  protected readonly vedettes = computed(() =>
    (this.articles() ?? []).slice(0, Accueil.EN_VEDETTE),
  );

  protected readonly rayons = computed<Rayon[]>(() => {
    const liste = this.articles();
    if (!liste) {
      return [];
    }
    const groupes = new Map<number, Article[]>();
    for (const article of liste) {
      const existant = groupes.get(article.categorieId);
      if (existant) {
        existant.push(article);
      } else {
        groupes.set(article.categorieId, [article]);
      }
    }
    const noms = this.nomsRayons();
    return [...groupes.entries()]
      .map(([idCategorie, articles]) => ({
        idCategorie,
        nom: noms.get(idCategorie) ?? '',
        articles: articles.slice(0, Accueil.PAR_RAYON),
        total: articles.length,
      }))
      // Tant que le nom du rayon n'est pas connu, on ne montre pas la
      // section : mieux vaut attendre que d'afficher un titre vide.
      .filter((rayon) => rayon.nom !== '')
      .sort((a, b) => b.total - a.total);
  });

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.erreur.set(null);
    this.articles.set(null);

    this.catalogue.tousLesArticles().subscribe({
      next: (liste) => this.articles.set(liste),
      error: (erreur: ErreurBoutique) => this.erreur.set(erreur.message),
    });

    this.catalogue.categories().subscribe({
      next: (liste) => this.categories.set(liste),
      error: () => undefined, // Les rayons restent masqués, le reste tient.
    });
  }

  protected nomRayon(idCategorie: number): string {
    return this.nomsRayons().get(idCategorie) ?? '';
  }

  protected ajouterAuPanier(article: Article): void {
    if (!this.connecte()) {
      // On garde la destination : après connexion, le visiteur revient ici.
      this.router.navigate(['/connexion'], { queryParams: { suite: '/' } });
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
