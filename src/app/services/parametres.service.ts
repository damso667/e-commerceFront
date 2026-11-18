import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ParametresBoutique } from '../models/api.models';
import { ApiService } from './api.service';

/**
 * L'identité de la boutique : nom, slogan, couleur, logo, icône.
 *
 * C'est la pièce qui rend la plateforme revendable. Aucun composant n'écrit
 * « QALF SHOP » en dur : tout vient d'ici, et l'administrateur change la
 * marque depuis le back-office sans qu'on redéploie.
 *
 * Chargée une fois avant le démarrage d'Angular, puis exposée en signal.
 */
@Injectable({ providedIn: 'root' })
export class ParametresService {
  private readonly api = inject(ApiService);

  /** Valeurs de repli : l'application reste utilisable si l'API est muette. */
  private static readonly REPLI: ParametresBoutique = {
    nom: 'QALF SHOP',
    slogan: null,
    couleurPrimaire: '#0B6B5E',
    monogramme: 'QS',
    logoUrl: null,
    iconeUrl: null,
    telephoneContact: null,
    emailContact: null,
    adresse: null,
    messageAccueil: null,
    paiementSimule: true,
  };

  private readonly etat = signal<ParametresBoutique>(ParametresService.REPLI);

  readonly parametres = this.etat.asReadonly();
  readonly nom = computed(() => this.etat().nom);
  readonly monogramme = computed(() => this.etat().monogramme);
  readonly paiementSimule = computed(() => this.etat().paiementSimule);

  /**
   * Logo déposé par l'administrateur, ou `null` s'il n'en a pas déposé.
   *
   * À n'utiliser que pour savoir si un logo personnalisé existe — par
   * exemple dans l'écran d'identité du back-office, qui doit distinguer
   * « aucun logo » de « logo par défaut ». Pour afficher, prendre
   * {@link logoAffiche}.
   */
  readonly logoUrl = computed(() => {
    const chemin = this.etat().logoUrl;
    return chemin ? this.api.url(chemin) : null;
  });

  /**
   * Le logo à afficher, toujours défini.
   *
   * Chaîne de repli : logo déposé par l'administrateur, sinon le logo
   * livré avec l'application. Le monogramme ne sert plus que si même ce
   * fichier manque.
   *
   * Note pour une revente : `LOGO_LIVRE` est la marque par défaut du
   * produit. Un marchand qui déploie la plateforme dépose la sienne depuis
   * le back-office et elle prend le dessus sans toucher au code — c'est
   * tout l'intérêt de garder le logo hors des composants.
   */
  readonly logoAffiche = computed(
    () => this.logoUrl() ?? ParametresService.LOGO_LIVRE,
  );

  /** Logo livré avec l'application, servi par le front lui-même. */
  private static readonly LOGO_LIVRE = '/logo.svg';

  /** Symbole carré : avatar, favicon, cadres carrés. */
  static readonly MARQUE_CARREE = '/marque.svg';

  /**
   * Charge les paramètres et applique la marque au document : couleur de
   * thème, titre, icône. Appelée au démarrage, et après chaque modification
   * par l'administrateur.
   */
  async charger(): Promise<void> {
    try {
      const recus = await firstValueFrom(
        this.api.get<ParametresBoutique>('/api/parametres'),
      );
      this.etat.set(recus);
    } catch {
      // On garde le repli : mieux vaut une boutique au nom par défaut
      // qu'un écran blanc.
      console.warn('[parametres] API injoignable, valeurs par défaut conservées');
    }
    this.appliquerAuDocument();
  }

  /** Remplace l'état après une modification côté administration. */
  remplacer(parametres: ParametresBoutique): void {
    this.etat.set(parametres);
    this.appliquerAuDocument();
  }

  /**
   * Pose la marque sur les éléments qui vivent hors d'Angular : la couleur de
   * thème du navigateur, le titre de l'onglet, la favicon et le manifeste.
   *
   * Le manifeste est servi par l'API et non par le build : c'est ce qui rend
   * « jusqu'aux images natives de l'app » tenable, puisque le nom et l'icône
   * de l'application installée suivent alors les paramètres.
   */
  private appliquerAuDocument(): void {
    const p = this.etat();

    document.documentElement.style.setProperty('--marque', p.couleurPrimaire);
    document.title = p.slogan ? `${p.nom} — ${p.slogan}` : p.nom;

    this.poserMeta('theme-color', p.couleurPrimaire);
    if (p.slogan) {
      this.poserMeta('description', p.slogan);
    }

    this.poserLien('manifest', this.api.url('/api/parametres/manifest.webmanifest'));

    // Icône déposée par l'administrateur ; sinon celle livrée avec
    // l'application, déjà posée dans index.html.
    if (p.iconeUrl) {
      this.poserLien('icon', this.api.url(p.iconeUrl));
      this.poserLien('apple-touch-icon', this.api.url(p.iconeUrl));
    }
  }

  private poserMeta(nom: string, contenu: string): void {
    let balise = document.querySelector<HTMLMetaElement>(`meta[name="${nom}"]`);
    if (!balise) {
      balise = document.createElement('meta');
      balise.name = nom;
      document.head.appendChild(balise);
    }
    balise.content = contenu;
  }

  private poserLien(rel: string, href: string): void {
    let balise = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!balise) {
      balise = document.createElement('link');
      balise.rel = rel;
      document.head.appendChild(balise);
    }
    balise.href = href;
  }
}
