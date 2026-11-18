import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Article, Avis } from '../../models/api.models';
import { ErreurBoutique } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CatalogueService } from '../../services/catalogue.service';
import { PaiementService } from '../../services/paiement.service';
import { PanierService } from '../../services/panier.service';
import { Alerte } from '../../ui/alerte/alerte';
import { CarteArticle } from '../../ui/carte-article/carte-article';
import { Montant } from '../../ui/montant/montant';
import { Pastille } from '../../ui/pastille/pastille';
import { Squelette } from '../../ui/squelette/squelette';

/** Seuil au-delà duquel on n'alarme pas sur le stock. */
const STOCK_FAIBLE = 5;

/**
 * Fiche article.
 *
 * Le stock est annoncé ici, et c'est délibéré : découvrir la rupture au
 * moment de payer est la pire façon de l'apprendre. Quand il reste peu
 * d'exemplaires, on le dit ; quand il n'y en a plus, le bouton d'achat
 * disparaît au lieu de mener à une erreur.
 */
@Component({
  selector: 'app-article',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pastille, Montant, Squelette, Alerte, CarteArticle],
  templateUrl: './article.html',
  styleUrl: './article.css',
})
export class ArticlePage {
  private readonly catalogue = inject(CatalogueService);
  private readonly panier = inject(PanierService);
  private readonly commandes = inject(PaiementService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly connecte = this.auth.connecte;

  private readonly parametres = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly article = signal<Article | null>(null);
  protected readonly avis = signal<Avis[] | null>(null);
  protected readonly similaires = signal<Article[]>([]);
  protected readonly erreur = signal<string | null>(null);
  protected readonly introuvable = signal(false);

  /* ---------- Dépôt d'un avis ---------- */

  /** L'API n'accepte un avis que d'un client ayant acheté ET payé. */
  protected readonly peutNoter = signal(false);
  protected readonly dejaNote = signal(false);
  protected readonly formulaireOuvert = signal(false);
  protected readonly note = signal(0);
  protected readonly commentaire = signal('');
  protected readonly envoiAvis = signal(false);
  protected readonly erreurAvis = signal<string | null>(null);
  protected readonly avisEnvoye = signal(false);

  protected readonly quantite = signal(1);
  protected readonly ajoutEnCours = signal(false);
  protected readonly confirmation = signal<string | null>(null);

  protected readonly enRupture = computed(() => (this.article()?.stock ?? 0) <= 0);
  protected readonly stockFaible = computed(() => {
    const stock = this.article()?.stock ?? 0;
    return stock > 0 && stock <= STOCK_FAIBLE;
  });

  /** Plafonne la quantité au stock : proposer plus serait mentir. */
  protected readonly quantiteMax = computed(() =>
    Math.min(20, Math.max(1, this.article()?.stock ?? 1)),
  );

  protected readonly noteMoyenne = computed(() => {
    const liste = this.avis() ?? [];
    if (liste.length === 0) {
      return null;
    }
    const somme = liste.reduce((total, a) => total + (a.note ?? 0), 0);
    return Math.round((somme / liste.length) * 10) / 10;
  });

  constructor() {
    // Une navigation d'une fiche à l'autre réutilise le composant : sans
    // cet effet, l'ancien article resterait affiché.
    effect(() => {
      const id = Number(this.parametres().get('id'));
      if (Number.isNaN(id)) {
        this.introuvable.set(true);
        return;
      }
      this.charger(id);
    });
  }

  protected charger(id: number): void {
    this.erreur.set(null);
    this.introuvable.set(false);
    this.article.set(null);
    this.avis.set(null);
    this.similaires.set([]);
    this.quantite.set(1);
    this.confirmation.set(null);

    this.catalogue.article(id).subscribe({
      next: (article) => {
        this.article.set(article);
        this.chargerSimilaires(article);
      },
      error: (erreur: ErreurBoutique) => {
        if (erreur.statut === 404) {
          this.introuvable.set(true);
        } else {
          this.erreur.set(erreur.message);
        }
      },
    });

    this.catalogue.avisDeLArticle(id).subscribe({
      next: (liste) => this.avis.set(liste),
      // Un avis manquant ne doit pas empêcher d'acheter.
      error: () => this.avis.set([]),
    });

    this.verifierDroitDeNoter(id);
  }

  /**
   * Un avis n'est accepté que d'un client ayant acheté et payé l'article.
   * Plutôt que d'afficher un formulaire qui sera refusé, on vérifie dans
   * l'historique de commandes avant de le proposer : un bouton qui mène
   * systématiquement à une erreur vaut moins que pas de bouton.
   */
  private verifierDroitDeNoter(idArticle: number): void {
    this.peutNoter.set(false);
    this.dejaNote.set(false);
    if (!this.connecte()) {
      return;
    }
    this.commandes.mesCommandes().subscribe({
      next: (liste) => {
        const achete = liste.some(
          (commande) =>
            (commande.statut === 'PAYEE' ||
              commande.statut === 'EN_COURS' ||
              commande.statut === 'LIVREE') &&
            commande.lignes.some((ligne) => ligne.idArticle === idArticle),
        );
        this.peutNoter.set(achete);
      },
      error: () => undefined,
    });
  }

  protected choisirNote(valeur: number): void {
    this.note.set(valeur);
  }

  protected envoyerAvis(): void {
    const article = this.article();
    if (!article || this.note() < 1) {
      this.erreurAvis.set('Choisissez une note de 1 à 5 étoiles.');
      return;
    }
    this.envoiAvis.set(true);
    this.erreurAvis.set(null);

    this.commandes.laisserAvis(article.id, this.note(), this.commentaire().trim()).subscribe({
      next: (nouveau) => {
        this.envoiAvis.set(false);
        this.avisEnvoye.set(true);
        this.formulaireOuvert.set(false);
        this.dejaNote.set(true);
        // On insère l'avis en tête sans recharger : le client voit
        // immédiatement sa contribution.
        this.avis.update((liste) => [nouveau, ...(liste ?? [])]);
        this.note.set(0);
        this.commentaire.set('');
      },
      error: (erreur: ErreurBoutique) => {
        this.envoiAvis.set(false);
        this.erreurAvis.set(erreur.message);
        // 409 : déjà noté, ou achat non constaté. Dans les deux cas le
        // formulaire n'a plus lieu d'être.
        if (erreur.estConflitMetier) {
          this.dejaNote.set(true);
          this.formulaireOuvert.set(false);
        }
      },
    });
  }

  private chargerSimilaires(article: Article): void {
    this.catalogue.articlesParCategorie(article.categorieId).subscribe({
      next: (liste) =>
        this.similaires.set(liste.filter((a) => a.id !== article.id).slice(0, 4)),
      error: () => undefined,
    });
  }

  protected changerQuantite(delta: number): void {
    this.quantite.update((q) => Math.min(this.quantiteMax(), Math.max(1, q + delta)));
  }

  protected ajouterAuPanier(): void {
    const article = this.article();
    if (!article || this.enRupture()) {
      return;
    }
    if (!this.connecte()) {
      this.router.navigate(['/connexion'], {
        queryParams: { suite: `/article/${article.id}` },
      });
      return;
    }
    this.ajoutEnCours.set(true);
    this.erreur.set(null);
    this.panier.ajouter(article.id, this.quantite()).subscribe({
      next: () => {
        this.ajoutEnCours.set(false);
        const n = this.quantite();
        this.confirmation.set(
          `${n} article${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} au panier.`,
        );
      },
      error: (erreur: ErreurBoutique) => {
        this.ajoutEnCours.set(false);
        this.erreur.set(erreur.message);
      },
    });
  }

  protected ajouterSimilaire(article: Article): void {
    if (!this.connecte()) {
      this.router.navigate(['/connexion'], {
        queryParams: { suite: this.router.url },
      });
      return;
    }
    this.panier.ajouter(article.id, 1).subscribe({
      error: (erreur: ErreurBoutique) => this.erreur.set(erreur.message),
    });
  }

  /** Étoiles pleines d'une note, pour l'affichage. */
  protected etoiles(note: number): boolean[] {
    return [1, 2, 3, 4, 5].map((rang) => rang <= note);
  }

  /**
   * Date d'un avis. L'API renvoie de l'ISO ; l'afficher tel quel donnait
   * « 2026-11-18 » au milieu d'une page par ailleurs entièrement en
   * français.
   */
  protected dateLisible(valeur: string): string {
    const date = new Date(valeur);
    if (Number.isNaN(date.getTime())) {
      return valeur;
    }
    return date.toLocaleDateString('fr-FR', { dateStyle: 'long' });
  }
}
