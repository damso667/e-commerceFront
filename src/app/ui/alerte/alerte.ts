import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Message d'erreur ou de confirmation.
 *
 * `role="alert"` est là pour une raison : une erreur signalée seulement par
 * une bordure rouge n'existe pas pour un lecteur d'écran. Et « Réessayer »
 * est proposé dès qu'un rappel est possible, parce qu'une erreur sans porte
 * de sortie laisse le visiteur bloqué.
 */
@Component({
  selector: 'app-alerte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alerte.html',
  styleUrl: './alerte.css',
})
export class Alerte {
  readonly message = input.required<string>();
  readonly ton = input<'echec' | 'succes' | 'attente' | 'neutre'>('echec');
  readonly reessayable = input<boolean>(false);
  /** Erreurs de validation par champ, telles que l'API les renvoie. */
  readonly champs = input<[string, string][] | null>(null);
  readonly reessayer = output<void>();
}
