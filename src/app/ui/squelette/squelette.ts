import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Squelette de chargement.
 *
 * Trois règles tenues ici, et chacune répond à un défaut précis :
 *
 * 1. **La forme du squelette est celle du contenu réel.** Un squelette qui
 *    ne correspond pas à ce qui arrive déplace la page au moment du
 *    remplacement — c'est pire que pas de squelette du tout.
 * 2. **`aria-busy` et un texte pour lecteur d'écran.** Une animation
 *    silencieuse ne dit rien à qui n'y voit pas ; l'attente doit être
 *    annoncée.
 * 3. **Pas de scintillement pour une attente brève.** L'animation démarre
 *    avec un retard : si la réponse arrive en 200 ms, le visiteur ne voit
 *    jamais le squelette clignoter.
 */
@Component({
  selector: 'app-squelette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './squelette.html',
  styleUrl: './squelette.css',
})
export class Squelette {
  /** Forme du contenu attendu, pour que le squelette lui ressemble. */
  readonly forme = input<'tarif' | 'grille' | 'tableau' | 'chiffres' | 'texte'>('tarif');
  readonly nombre = input<number>(6);

  /** Ce qu'un lecteur d'écran annonce pendant l'attente. */
  readonly annonce = input<string>('Chargement en cours');

  protected lignes(): number[] {
    return Array.from({ length: Math.max(1, this.nombre()) }, (_, i) => i);
  }
}
