import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * État vide.
 *
 * Un écran blanc laisse le visiteur se demander si la page est cassée. Un
 * état vide nomme la situation **et** propose la sortie : c'est la différence
 * entre « aucun résultat » et « aucun résultat, élargissez la recherche ».
 */
@Component({
  selector: 'app-etat-vide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './etat-vide.html',
  styleUrl: './etat-vide.css',
})
export class EtatVide {
  readonly titre = input.required<string>();
  readonly detail = input<string>('');
  readonly action = input<string>('');
  readonly agir = output<void>();
}
