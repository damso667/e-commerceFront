import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formaterFcfa } from '../pipes/fcfa.pipe';

/**
 * Le montant tel qu'il apparaît sur un panneau peint : les chiffres portent
 * la ligne, la devise est une mention discrète à côté.
 *
 * Les chiffres sont tabulaires, donc deux montants l'un sous l'autre
 * s'alignent colonne par colonne et se comparent d'un coup d'œil. Sans
 * cela, « 5 000 » et « 26 600 » ne se lisent pas en liste.
 */
@Component({
  selector: 'app-montant',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './montant.html',
  styleUrl: './montant.css',
})
export class Montant {
  readonly valeur = input<number | null>(null);
  readonly devise = input<boolean>(true);

  protected readonly formate = computed(() => formaterFcfa(this.valeur()));
}
