import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvisAdmin, PageReponse, pageVide } from '../../models/api.models';
import { AdminModerationService, FiltreAvis } from '../../services/admin-moderation.service';
import { ErreurBoutique } from '../../services/api.service';
import { Alerte } from '../../ui/alerte/alerte';
import { Squelette } from '../../ui/squelette/squelette';
import { Pagination } from '../ui/pagination/pagination';

/**
 * Modération des avis.
 *
 * Le filtre par note existe parce que c'est la façon dont on modère
 * réellement : on relit d'abord les 1 et 2 étoiles. Il ne sert pas à faire
 * disparaître les mauvais avis — supprimer un avis fondé se voit, et tout
 * passage ici est tracé au journal d'audit avec le nom de qui l'a fait.
 *
 * La suppression demande une confirmation : elle est définitive, et seul
 * un client ayant acheté et payé pouvait écrire cet avis.
 */
@Component({
  selector: 'app-admin-avis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Squelette, Alerte, Pagination],
  templateUrl: './avis.html',
  styleUrl: './avis.css',
})
export class AdminAvis {
  private readonly service = inject(AdminModerationService);

  protected readonly recherche = signal('');
  protected readonly note = signal('');

  protected readonly page = signal<PageReponse<AvisAdmin>>(pageVide<AvisAdmin>());
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly aConfirmer = signal<number | null>(null);

  protected readonly aucunResultat = computed(
    () => !this.chargement() && this.page().contenu.length === 0,
  );

  protected readonly filtreActif = computed(
    () => this.recherche().trim() !== '' || this.note() !== '',
  );

  constructor() {
    this.charger(0);
  }

  protected appliquer(): void {
    this.charger(0);
  }

  protected reinitialiser(): void {
    this.recherche.set('');
    this.note.set('');
    this.charger(0);
  }

  protected charger(numeroPage: number): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.aConfirmer.set(null);

    const filtre: FiltreAvis = { page: numeroPage, size: 20 };
    const terme = this.recherche().trim();
    if (terme) {
      filtre.recherche = terme;
    }
    if (this.note()) {
      const valeur = Number(this.note());
      filtre.noteMin = valeur;
      filtre.noteMax = valeur;
    }

    this.service.rechercherAvis(filtre).subscribe({
      next: (reponse) => {
        this.page.set(reponse);
        this.chargement.set(false);
      },
      error: (erreur: ErreurBoutique) => {
        this.chargement.set(false);
        this.erreur.set(erreur.message);
      },
    });
  }

  /** Les avis sévères d'abord : c'est par là qu'on commence à modérer. */
  protected montrerSeveres(): void {
    this.recherche.set('');
    this.note.set('1');
    this.charger(0);
  }

  protected demanderSuppression(avis: AvisAdmin): void {
    this.aConfirmer.set(this.aConfirmer() === avis.idAvis ? null : avis.idAvis);
  }

  protected supprimer(avis: AvisAdmin): void {
    this.erreur.set(null);
    this.aConfirmer.set(null);

    this.service.supprimerAvis(avis.idAvis).subscribe({
      next: () => {
        this.message.set(`Avis de ${avis.nomAuteur} supprimé.`);
        this.charger(this.page().page);
      },
      error: (erreur: ErreurBoutique) => this.erreur.set(erreur.message),
    });
  }

  protected etoiles(note: number): boolean[] {
    return [1, 2, 3, 4, 5].map((rang) => rang <= note);
  }

  protected date(valeur: string): string {
    const date = new Date(valeur);
    if (Number.isNaN(date.getTime())) {
      return valeur;
    }
    return date.toLocaleDateString('fr-FR', { dateStyle: 'medium' });
  }
}
