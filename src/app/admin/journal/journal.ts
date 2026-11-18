import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EntreeJournal, PageReponse, pageVide } from '../../models/api.models';
import { AdminModerationService, FiltreJournal } from '../../services/admin-moderation.service';
import { ErreurBoutique } from '../../services/api.service';
import { Alerte } from '../../ui/alerte/alerte';
import { Squelette } from '../../ui/squelette/squelette';
import { Pagination } from '../ui/pagination/pagination';

const ACTIONS = [
  'ARTICLE_CREE',
  'ARTICLE_MODIFIE',
  'ARTICLE_SUPPRIME',
  'ARTICLE_RETIRE_VENTE',
  'STOCK_AJUSTE',
  'ARTICLE_IMAGE_DEPOSEE',
  'ARTICLE_IMAGE_RETIREE',
  'CATEGORIE_CREEE',
  'CATEGORIE_MODIFIEE',
  'CATEGORIE_SUPPRIMEE',
  'COMMANDE_STATUT_CHANGE',
  'CLIENT_BLOQUE',
  'CLIENT_DEBLOQUE',
  'ROLE_CHANGE',
  'AVIS_SUPPRIME',
  'PAIEMENT_REMBOURSE',
  'PARAMETRES_MODIFIES',
  'LOGO_MODIFIE',
  'ICONE_MODIFIEE',
];

/**
 * Journal d'audit.
 *
 * Il répond à une seule question, mais celle qu'on se pose vraiment quand
 * quelque chose a changé sans qu'on sache pourquoi : **qui a fait quoi, et
 * quand**. Le champ `details` porte ce qui a changé, pas juste « modifié » —
 * un journal qui dit « article modifié » sans dire quoi n'aide personne.
 *
 * Le journal est en lecture seule, délibérément : une trace qu'on peut
 * effacer n'est pas une trace.
 */
@Component({
  selector: 'app-admin-journal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Squelette, Alerte, Pagination],
  templateUrl: './journal.html',
  styleUrl: './journal.css',
})
export class AdminJournal {
  private readonly service = inject(AdminModerationService);

  protected readonly actionsConnues = ACTIONS.map((cle) => ({
    cle,
    libelle: this.service.libelleAction(cle),
  })).sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));

  protected readonly acteur = signal('');
  protected readonly action = signal('');
  protected readonly debut = signal('');
  protected readonly fin = signal('');

  protected readonly page = signal<PageReponse<EntreeJournal>>(pageVide<EntreeJournal>(50));
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  protected readonly aucunResultat = computed(
    () => !this.chargement() && this.page().contenu.length === 0,
  );

  protected readonly filtreActif = computed(
    () =>
      this.acteur().trim() !== '' ||
      this.action() !== '' ||
      this.debut() !== '' ||
      this.fin() !== '',
  );

  constructor() {
    this.charger(0);
  }

  protected appliquer(): void {
    this.charger(0);
  }

  protected reinitialiser(): void {
    this.acteur.set('');
    this.action.set('');
    this.debut.set('');
    this.fin.set('');
    this.charger(0);
  }

  protected charger(numeroPage: number): void {
    this.chargement.set(true);
    this.erreur.set(null);

    const filtre: FiltreJournal = { page: numeroPage, size: 50 };
    const qui = this.acteur().trim();
    if (qui) {
      filtre.acteur = qui;
    }
    if (this.action()) {
      filtre.action = this.action();
    }
    if (this.debut()) {
      filtre.debut = this.debut();
    }
    if (this.fin()) {
      filtre.fin = this.fin();
    }

    this.service.journal(filtre).subscribe({
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

  protected libelle(action: string): string {
    return this.service.libelleAction(action);
  }

  /** Les actions qui défont ou retirent quelque chose méritent d'être vues. */
  protected estSensible(action: string): boolean {
    return (
      action.includes('SUPPRIM') ||
      action.includes('RETIRE') ||
      action === 'PAIEMENT_REMBOURSE' ||
      action === 'CLIENT_BLOQUE' ||
      action === 'ROLE_CHANGE'
    );
  }

  protected cible(entree: EntreeJournal): string {
    if (!entree.cibleType) {
      return '—';
    }
    return entree.cibleId ? `${entree.cibleType} nº ${entree.cibleId}` : entree.cibleType;
  }

  protected horodatage(valeur: string): string {
    const date = new Date(valeur);
    if (Number.isNaN(date.getTime())) {
      return valeur;
    }
    return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
  }
}
