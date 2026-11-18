import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Chiffre-cle du tableau de bord.
 *
 * L'evolution est affichee **seulement quand elle existe**. L'API renvoie
 * null lorsque la periode precedente etait a zero : afficher « +100 % »
 * dans ce cas serait une invention, et « 0 % » un mensonge. On dit alors
 * qu'il n'y a pas de comparaison possible.
 *
 * La fleche est doublee d'un signe et d'un mot : une hausse signalee par la
 * seule couleur verte n'existe pas pour qui ne distingue pas le vert.
 */
@Component({
  selector: 'app-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stat.html',
  styleUrl: './stat.css',
})
export class Stat {
  readonly libelle = input.required<string>();
  readonly valeur = input.required<string>();
  readonly detail = input<string>('');
  /** Variation en pourcentage ; null quand elle n'a pas de sens. */
  readonly evolution = input<number | null>(null);
  /** Pour les indicateurs ou la baisse est une bonne nouvelle. */
  readonly baisseEstBonne = input<boolean>(false);
  readonly accent = input<boolean>(false);

  protected readonly sens = computed(() => {
    const e = this.evolution();
    if (e === null || Math.abs(e) < 0.05) {
      return 'stable' as const;
    }
    return e > 0 ? ('hausse' as const) : ('baisse' as const);
  });

  protected readonly bonne = computed(() => {
    const s = this.sens();
    if (s === 'stable') {
      return null;
    }
    return this.baisseEstBonne() ? s === 'baisse' : s === 'hausse';
  });

  protected readonly evolutionLisible = computed(() => {
    const e = this.evolution();
    if (e === null) {
      return null;
    }
    const signe = e > 0 ? '+' : '';
    return `${signe}${e.toFixed(1).replace('.0', '')} %`;
  });
}
