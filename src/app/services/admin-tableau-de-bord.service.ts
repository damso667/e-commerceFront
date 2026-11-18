import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TableauDeBord } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminTableauDeBordService {
  private readonly api = inject(ApiService);

  /**
   * Tableau de bord sur une période. Sans dates : les 30 derniers jours.
   * L'API refuse une période de plus de 366 jours et un début postérieur à
   * la fin ; on laisse ces refus remonter tels quels plutôt que de les
   * dupliquer ici, pour qu'il n'y ait qu'une seule règle.
   */
  charger(debut?: string, fin?: string): Observable<TableauDeBord> {
    return this.api.get<TableauDeBord>('/api/admin/tableau-de-bord', { debut, fin });
  }

  /** Bornes d'une période relative, au format attendu par l'API (AAAA-MM-JJ). */
  periodeDerniersJours(jours: number): { debut: string; fin: string } {
    const fin = new Date();
    const debut = new Date();
    debut.setDate(fin.getDate() - (jours - 1));
    return { debut: iso(debut), fin: iso(fin) };
  }
}

function iso(date: Date): string {
  const mois = `${date.getMonth() + 1}`.padStart(2, '0');
  const jour = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}
