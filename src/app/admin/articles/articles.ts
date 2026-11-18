import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ArticleAdmin, Categorie, PageReponse, pageVide } from '../../models/api.models';
import {
  AdminCatalogueService,
  ArticleRequete,
  FiltreArticles,
} from '../../services/admin-catalogue.service';
import { ErreurBoutique } from '../../services/api.service';
import { Alerte } from '../../ui/alerte/alerte';
import { Montant } from '../../ui/montant/montant';
import { Squelette } from '../../ui/squelette/squelette';
import { Pagination } from '../ui/pagination/pagination';

/** Ce que le formulaire manipule, avant conversion pour l'API. */
interface Brouillon {
  idArticle: number | null;
  libelle: string;
  description: string;
  prix: string;
  stock: string;
  imageUrl: string;
  idCategorie: string;
}

function brouillonVide(): Brouillon {
  return {
    idArticle: null,
    libelle: '',
    description: '',
    prix: '',
    stock: '',
    imageUrl: '',
    idCategorie: '',
  };
}

/** Seuil d'alerte visuelle, aligné sur celui du tableau de bord. */
const STOCK_FAIBLE = 5;

/**
 * Catalogue : articles, stock et rayons.
 *
 * **Le stock s'ajuste par variation, jamais par valeur absolue.** « +10
 * reçus » est l'opération réelle, et sous verrou côté API deux
 * réapprovisionnements simultanés s'additionnent au lieu de s'écraser.
 * Saisir « 42 » à la place de « 32 » écraserait au contraire la vente
 * survenue entre l'affichage et l'envoi.
 *
 * La suppression n'est pas toujours une suppression : un article déjà
 * commandé est retiré de la vente pour que l'historique reste lisible.
 * L'API le dit dans sa réponse, et on affiche ce message tel quel plutôt
 * que d'annoncer une suppression qui n'a pas eu lieu.
 */
@Component({
  selector: 'app-admin-articles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Montant, Squelette, Alerte, Pagination],
  templateUrl: './articles.html',
  styleUrl: './articles.css',
})
export class AdminArticles {
  private readonly service = inject(AdminCatalogueService);

  protected readonly seuilFaible = STOCK_FAIBLE;

  protected readonly recherche = signal('');
  protected readonly idCategorie = signal('');
  protected readonly seulementFaible = signal(false);

  protected readonly page = signal<PageReponse<ArticleAdmin>>(pageVide<ArticleAdmin>());
  protected readonly categories = signal<Categorie[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);

  /* ---------- Formulaire d'article ---------- */

  protected readonly formulaireOuvert = signal(false);
  protected readonly brouillon = signal<Brouillon>(brouillonVide());
  protected readonly envoi = signal(false);
  protected readonly erreurFormulaire = signal<string | null>(null);
  protected readonly champsInvalides = signal<[string, string][] | null>(null);

  /* ---------- Ajustement de stock ---------- */

  protected readonly stockOuvert = signal<number | null>(null);
  protected readonly variation = signal('');
  protected readonly motifStock = signal('');
  protected readonly envoiStock = signal(false);

  /** Une variation nulle ou illisible n'a rien à envoyer. */
  protected readonly variationValide = computed(() => {
    const valeur = Number(this.variation());
    return this.variation().trim() !== '' && Number.isFinite(valeur) && valeur !== 0;
  });

  /**
   * Retrait en deux temps. Un article retiré par mégarde disparaît de la
   * boutique sans que personne ne s'en aperçoive avant qu'un client le
   * cherche ; une confirmation coûte un clic et évite ça.
   */
  protected readonly retraitAConfirmer = signal<number | null>(null);

  /* ---------- Rayons ---------- */

  protected readonly rayonsOuverts = signal(false);
  protected readonly nouveauRayon = signal('');
  protected readonly envoiRayon = signal(false);
  protected readonly erreurRayon = signal<string | null>(null);

  protected readonly aucunResultat = computed(
    () => !this.chargement() && this.page().contenu.length === 0,
  );

  protected readonly filtreActif = computed(
    () => this.recherche().trim() !== '' || this.idCategorie() !== '' || this.seulementFaible(),
  );

  protected readonly titreFormulaire = computed(() =>
    this.brouillon().idArticle === null ? 'Nouvel article' : 'Modifier l’article',
  );

  protected readonly formulaireValide = computed(() => {
    const b = this.brouillon();
    return (
      b.libelle.trim().length >= 2 &&
      b.idCategorie !== '' &&
      Number(b.prix) > 0 &&
      Number(b.stock) >= 0 &&
      b.stock !== ''
    );
  });

  constructor() {
    this.chargerCategories();
    this.charger(0);
  }

  // ---------------- Chargement ----------------

  protected appliquer(): void {
    this.charger(0);
  }

  protected reinitialiser(): void {
    this.recherche.set('');
    this.idCategorie.set('');
    this.seulementFaible.set(false);
    this.charger(0);
  }

  protected charger(numeroPage: number): void {
    this.chargement.set(true);
    this.erreur.set(null);

    const filtre: FiltreArticles = { page: numeroPage, size: 20 };
    const terme = this.recherche().trim();
    if (terme) {
      filtre.recherche = terme;
    }
    if (this.idCategorie()) {
      filtre.idCategorie = Number(this.idCategorie());
    }
    if (this.seulementFaible()) {
      filtre.stockMax = STOCK_FAIBLE;
    }

    this.service.rechercherArticles(filtre).subscribe({
      next: (reponse) => {
        this.page.set(reponse);
        this.chargement.set(false);
      },
      error: (erreur: ErreurBoutique) => {
        this.chargement.set(false);
        this.erreur.set(erreur.message);
      },
    });
  }

  private chargerCategories(): void {
    this.service.categories().subscribe({
      next: (liste) => this.categories.set(liste),
      error: () => undefined,
    });
  }

  // ---------------- Formulaire d'article ----------------

  protected ouvrirCreation(): void {
    this.brouillon.set(brouillonVide());
    this.erreurFormulaire.set(null);
    this.champsInvalides.set(null);
    this.formulaireOuvert.set(true);
    this.stockOuvert.set(null);
  }

  protected ouvrirModification(article: ArticleAdmin): void {
    const rayon = this.categories().find((c) => c.nomCategorie === article.nomCategorie);
    this.brouillon.set({
      idArticle: article.idArticle,
      libelle: article.libelle,
      description: article.description ?? '',
      prix: String(article.prix),
      stock: String(article.stock ?? 0),
      imageUrl: article.imageUrl ?? '',
      idCategorie: rayon ? String(rayon.idCategorie) : '',
    });
    this.erreurFormulaire.set(null);
    this.champsInvalides.set(null);
    this.formulaireOuvert.set(true);
    this.stockOuvert.set(null);
  }

  protected majBrouillon(champ: keyof Brouillon, valeur: string): void {
    this.brouillon.update((b) => ({ ...b, [champ]: valeur }));
  }

  protected enregistrer(): void {
    if (!this.formulaireValide()) {
      return;
    }
    const b = this.brouillon();
    const donnees: ArticleRequete = {
      libelle: b.libelle.trim(),
      prix: Number(b.prix),
      stock: Number(b.stock),
      idCategorie: Number(b.idCategorie),
    };
    if (b.description.trim()) {
      donnees.description = b.description.trim();
    }
    if (b.imageUrl.trim()) {
      donnees.imageUrl = b.imageUrl.trim();
    }

    this.envoi.set(true);
    this.erreurFormulaire.set(null);
    this.champsInvalides.set(null);

    const requete =
      b.idArticle === null
        ? this.service.creerArticle(donnees)
        : this.service.modifierArticle(b.idArticle, donnees);

    requete.subscribe({
      next: () => {
        this.envoi.set(false);
        this.formulaireOuvert.set(false);
        this.message.set(
          b.idArticle === null ? 'Article créé.' : 'Article modifié.',
        );
        this.charger(this.page().page);
        this.chargerCategories();
      },
      error: (erreur: ErreurBoutique) => {
        this.envoi.set(false);
        this.erreurFormulaire.set(erreur.message);
        if (erreur.champs) {
          this.champsInvalides.set(Object.entries(erreur.champs));
        }
      },
    });
  }

  // ---------------- Stock ----------------

  protected basculerStock(idArticle: number): void {
    this.stockOuvert.set(this.stockOuvert() === idArticle ? null : idArticle);
    this.variation.set('');
    this.motifStock.set('');
    this.formulaireOuvert.set(false);
  }

  protected ajusterStock(idArticle: number): void {
    const valeur = Number(this.variation());
    if (!Number.isFinite(valeur) || valeur === 0) {
      return;
    }
    this.envoiStock.set(true);
    this.erreur.set(null);

    this.service.ajusterStock(idArticle, valeur, this.motifStock().trim() || undefined).subscribe({
      next: (article) => {
        this.envoiStock.set(false);
        this.stockOuvert.set(null);
        this.message.set(
          `Stock de « ${article.libelle} » : ${article.stock} après ${valeur > 0 ? '+' : ''}${valeur}.`,
        );
        this.page.update((p) => ({
          ...p,
          contenu: p.contenu.map((ligne) =>
            ligne.idArticle === idArticle ? article : ligne,
          ),
        }));
      },
      error: (erreur: ErreurBoutique) => {
        this.envoiStock.set(false);
        this.erreur.set(erreur.message);
      },
    });
  }

  // ---------------- Retrait ----------------

  protected demanderRetrait(article: ArticleAdmin): void {
    this.retraitAConfirmer.set(
      this.retraitAConfirmer() === article.idArticle ? null : article.idArticle,
    );
  }

  protected retirer(article: ArticleAdmin): void {
    this.erreur.set(null);
    this.retraitAConfirmer.set(null);
    this.service.supprimerArticle(article.idArticle).subscribe({
      next: (reponse) => {
        // Le message de l'API distingue suppression et retrait de la
        // vente : il est affiché tel quel, c'est lui qui dit ce qui s'est
        // réellement passé.
        this.message.set(reponse.message);
        this.charger(this.page().page);
      },
      error: (erreur: ErreurBoutique) => this.erreur.set(erreur.message),
    });
  }

  // ---------------- Rayons ----------------

  protected creerRayon(): void {
    const nom = this.nouveauRayon().trim();
    if (nom.length < 2) {
      return;
    }
    this.envoiRayon.set(true);
    this.erreurRayon.set(null);

    this.service.creerCategorie(nom).subscribe({
      next: () => {
        this.envoiRayon.set(false);
        this.nouveauRayon.set('');
        this.message.set(`Rayon « ${nom} » créé.`);
        this.chargerCategories();
      },
      error: (erreur: ErreurBoutique) => {
        this.envoiRayon.set(false);
        this.erreurRayon.set(erreur.message);
      },
    });
  }

  protected supprimerRayon(rayon: Categorie): void {
    this.erreurRayon.set(null);
    this.service.supprimerCategorie(rayon.idCategorie).subscribe({
      next: () => {
        this.message.set(`Rayon « ${rayon.nomCategorie} » supprimé.`);
        this.chargerCategories();
      },
      // L'API refuse de supprimer un rayon qui contient des articles :
      // son message explique pourquoi, inutile de le reformuler.
      error: (erreur: ErreurBoutique) => this.erreurRayon.set(erreur.message),
    });
  }

  protected estFaible(stock: number | null): boolean {
    return (stock ?? 0) > 0 && (stock ?? 0) <= STOCK_FAIBLE;
  }
}
