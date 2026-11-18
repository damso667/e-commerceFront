import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Racine de l'application : rien d'autre qu'une sortie de routeur.
 *
 * Les deux mondes visuels ont chacun leur coque, montée par le routeur :
 * `CoqueBoutique` pour la boutique (aplat d'encre), `CoqueAdmin` pour le
 * back-office (fond émail clair). Mettre l'en-tête de la boutique ici
 * obligerait à tester l'URL à la main pour le masquer sur `/admin`, et ce
 * test ne se mettrait pas à jour à la navigation.
 */
@Component({
  selector: 'app-racine',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class Racine {}
