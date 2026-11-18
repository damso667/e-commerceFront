import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ParametresBoutique } from '../models/api.models';
import { ApiService } from './api.service';
import { ParametresService } from './parametres.service';

export interface ParametresRequete {
  nom: string;
  slogan?: string;
  couleurPrimaire: string;
  telephoneContact?: string;
  emailContact?: string;
  adresse?: string;
  messageAccueil?: string;
}

/**
 * Modification de l'identité de la boutique par l'administrateur.
 *
 * C'est l'écran qui rend la plateforme revendable : nom, couleur, logo et
 * icône de l'application installée. Chaque réponse est réinjectée dans
 * {@link ParametresService}, donc l'interface entière change de marque sans
 * rechargement.
 */
@Injectable({ providedIn: 'root' })
export class AdminParametresService {
  private readonly api = inject(ApiService);
  private readonly parametres = inject(ParametresService);

  modifier(donnees: ParametresRequete): Observable<ParametresBoutique> {
    return this.api
      .put<ParametresBoutique>('/api/admin/parametres', donnees)
      .pipe(tap((recus) => this.parametres.remplacer(recus)));
  }

  /**
   * Dépôt du logo. L'API accepte PNG, JPEG et WebP jusqu'à 512 Ko, et
   * **refuse le SVG** : un SVG peut contenir du script et serait servi
   * depuis l'origine de l'API.
   */
  deposerLogo(fichier: File): Observable<ParametresBoutique> {
    return this.api
      .postFichier<ParametresBoutique>('/api/admin/parametres/logo', 'fichier', fichier)
      .pipe(tap((recus) => this.parametres.remplacer(recus)));
  }

  /** Icône de l'application installée : carrée, 512×512 de préférence. */
  deposerIcone(fichier: File): Observable<ParametresBoutique> {
    return this.api
      .postFichier<ParametresBoutique>('/api/admin/parametres/icone', 'fichier', fichier)
      .pipe(tap((recus) => this.parametres.remplacer(recus)));
  }

  retirerLogo(): Observable<ParametresBoutique> {
    return this.api
      .delete<ParametresBoutique>('/api/admin/parametres/logo')
      .pipe(tap((recus) => this.parametres.remplacer(recus)));
  }

  retirerIcone(): Observable<ParametresBoutique> {
    return this.api
      .delete<ParametresBoutique>('/api/admin/parametres/icone')
      .pipe(tap((recus) => this.parametres.remplacer(recus)));
  }

  /** Contrôles faits avant l'envoi, pour éviter un aller-retour inutile. */
  verifierImage(fichier: File): string | null {
    const acceptes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!acceptes.includes(fichier.type)) {
      return 'Formats acceptés : PNG, JPEG ou WebP. Le SVG est refusé pour des raisons de sécurité.';
    }
    if (fichier.size > 512 * 1024) {
      return `Fichier trop lourd : ${Math.round(fichier.size / 1024)} Ko, maximum 512 Ko.`;
    }
    return null;
  }
}
