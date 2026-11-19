import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

/** Une diapositive du carrousel. */
export interface Diapositive {
  id: string;
  titre: string;
  texte?: string;
  lien?: string;
  /**
   * Paramètres de requête du lien, par exemple le rayon à filtrer.
   *
   * Ils ne peuvent pas être collés dans `lien` : `routerLink` traite une
   * chaîne comme un chemin et encoderait `?categorie=3` en segment. Sans
   * ce champ, une diapositive « Voir le rayon » atterrit sur le catalogue
   * entier — elle annonce un filtre qu'elle n'applique pas.
   */
  parametresLien?: Record<string, string | number>;
  libelleLien?: string;
  /**
   * Photo pleine largeur. Tant qu'aucune photo n'est fournie, la
   * diapositive se rend en composition typographique : pas de rectangle
   * gris, pas de « image à venir ».
   */
  imageUrl?: string | null;
}

/**
 * Carrousel de bannières.
 *
 * **Défilement natif par `scroll-snap`** plutôt qu'un glissement piloté en
 * JavaScript : on récupère le geste tactile, l'inertie et le rappel du
 * système sans écrire une ligne de gestion de pointeur, et le défilement
 * reste fluide sur un téléphone d'entrée de gamme.
 *
 * Ce que l'accessibilité impose ici, et qui manque à la plupart des
 * carrousels :
 *
 *  - **Un bouton pause.** Un contenu qui défile tout seul plus de cinq
 *    secondes doit pouvoir être arrêté (WCAG 2.2.2). Sans cela, un
 *    visiteur qui lit lentement perd le texte en cours de lecture.
 *  - **Arrêt au survol et au focus clavier**, pour la même raison.
 *  - **Aucun défilement automatique** si le système demande de réduire les
 *    animations.
 *  - Les diapositives hors écran restent atteignables au clavier, et
 *    chacune annonce son rang.
 */
@Component({
  selector: 'app-carrousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './carrousel.html',
  styleUrl: './carrousel.css',
})
export class Carrousel implements AfterViewInit, OnDestroy {
  readonly diapositives = input.required<Diapositive[]>();
  /** Délai entre deux diapositives. 0 désactive le défilement automatique. */
  readonly intervalleMs = input<number>(6000);
  readonly etiquette = input<string>('Mises en avant');

  private readonly piste = viewChild<ElementRef<HTMLDivElement>>('piste');

  protected readonly index = signal(0);
  protected readonly enPause = signal(false);
  /** Arrêt temporaire pendant un survol ou un focus, distinct de la pause. */
  private readonly suspendu = signal(false);

  private minuteur?: ReturnType<typeof setInterval>;
  private observateur?: IntersectionObserver;

  protected readonly nombre = computed(() => this.diapositives().length);
  protected readonly multiple = computed(() => this.nombre() > 1);

  protected readonly mouvementReduit =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    effect(() => {
      // Relance le minuteur quand l'état change : pause, suspension,
      // nombre de diapositives.
      this.arreterMinuteur();
      if (
        this.multiple() &&
        this.intervalleMs() > 0 &&
        !this.enPause() &&
        !this.suspendu() &&
        !this.mouvementReduit
      ) {
        this.minuteur = setInterval(() => this.aller(this.index() + 1), this.intervalleMs());
      }
    });
  }

  ngAfterViewInit(): void {
    const piste = this.piste()?.nativeElement;
    if (!piste) {
      return;
    }
    // L'index suit le défilement réel, y compris quand le visiteur fait
    // glisser au doigt : sans cela, les puces mentiraient sur la position.
    this.observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.isIntersecting) {
            const rang = Number((entree.target as HTMLElement).dataset['rang']);
            if (!Number.isNaN(rang)) {
              this.index.set(rang);
            }
          }
        }
      },
      { root: piste, threshold: 0.6 },
    );
    for (const enfant of Array.from(piste.children)) {
      this.observateur.observe(enfant);
    }
  }

  ngOnDestroy(): void {
    this.arreterMinuteur();
    this.observateur?.disconnect();
  }

  protected aller(cible: number): void {
    const total = this.nombre();
    if (total === 0) {
      return;
    }
    const rang = ((cible % total) + total) % total;
    const piste = this.piste()?.nativeElement;
    if (!piste) {
      this.index.set(rang);
      return;
    }
    // `scrollTo` sur la piste plutôt que `scrollIntoView` sur la
    // diapositive : `scrollIntoView` fait défiler **tous** les ancêtres
    // défilables, donc la page entière en plus de la piste, et la
    // diapositive s'immobilise entre deux positions d'accroche.
    piste.scrollTo({
      left: rang * piste.clientWidth,
      behavior: this.mouvementReduit ? 'auto' : 'smooth',
    });
    this.index.set(rang);
  }

  protected basculerPause(): void {
    this.enPause.update((v) => !v);
  }

  protected suspendre(): void {
    this.suspendu.set(true);
  }

  protected reprendre(): void {
    this.suspendu.set(false);
  }

  private arreterMinuteur(): void {
    if (this.minuteur) {
      clearInterval(this.minuteur);
      this.minuteur = undefined;
    }
  }
}
