import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatage d'un montant en FCFA.
 *
 * Deux décisions qui comptent sur ce marché :
 *
 *  - **Aucune décimale.** Le franc CFA n'a pas de sous-unité ; afficher
 *    « 26 600,00 » serait faux et ajouterait du bruit sur quatre chiffres
 *    utiles.
 *  - **Séparateur de milliers français**, jamais le point anglo-saxon.
 *    `fr-FR` s'en charge et produit l'espace insécable attendu.
 */
export function formaterFcfa(montant: number | null | undefined): string {
  if (montant === null || montant === undefined || Number.isNaN(montant)) {
    return '—';
  }
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(montant));
}

@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  transform(montant: number | null | undefined): string {
    return formaterFcfa(montant);
  }
}
