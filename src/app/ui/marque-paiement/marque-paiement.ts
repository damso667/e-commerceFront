import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FournisseurPaiement } from '../../models/api.models';

/**
 * Marque de l'operateur mobile money.
 *
 * Le dessin est en SVG dans le composant, pas en fichier image, pour trois
 * raisons concretes :
 *
 *  - **Aucune requete reseau.** Un logo d'operateur apparait sur le choix de
 *    paiement, dans le pied de page, sur le suivi et dans le back-office :
 *    quatre ecrans qui n'ont pas a attendre un telechargement pour afficher
 *    un bloc de couleur et trois lettres.
 *  - **Il suit le theme.** Le nom de l'operateur est peint avec la couleur de
 *    texte de l'application, la tuile garde la couleur de la marque. Un PNG
 *    aurait son fond en dur et jurerait partout ailleurs.
 *  - **Il ne pixelise jamais**, du compteur de 20 px au bouton de 28 px.
 *
 * Les couleurs sont celles des deux operateurs : jaune MTN et orange Orange.
 * Ce sont des reconstitutions fideles, pas les fichiers officiels des charte
 * graphiques : pour une mise en production commerciale, remplacer le trace
 * par l'actif fourni par l'operateur ne touche que ce composant.
 */
@Component({
  selector: 'app-marque-paiement',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './marque-paiement.html',
  styleUrl: './marque-paiement.css',
})
export class MarquePaiement {
  readonly fournisseur = input.required<FournisseurPaiement>();

  /** Le nom complet sert de nom accessible : le SVG n'est pas decoratif. */
  protected readonly libelle = computed(() =>
    this.fournisseur() === 'MTN_MOMO' ? 'MTN Mobile Money' : 'Orange Money',
  );
}
