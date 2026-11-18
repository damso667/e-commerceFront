import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Commande,
  CommandeResume,
  PageReponse,
  StatutCommande,
  pageVide,
} from '../../models/api.models';
import { AdminCatalogueService, FiltreCommandes } from '../../services/admin-catalogue.service';
import { ErreurBoutique } from '../../services/api.service';
import { Alerte } from '../../ui/alerte/alerte';
import { Montant } from '../../ui/montant/montant';
import { Squelette } from '../../ui/squelette/squelette';
import { Tampon } from '../../ui/tampon/tampon';
import { Pagination } from '../ui/pagination/pagination';

const STATUTS: { valeur: StatutCommande; libelle: string }[] = [
  { valeur: 'EN_ATTENTE', libelle: 'En attente de paiement' },
  { valeur: 'PAYEE', libelle: 'Payée, à préparer' },
  { valeur: 'EN_COURS', libelle: 'En préparation' },
  { valeur: 'LIVREE', libelle: 'Livrée' },
  { valeur: 'ANNULEE', libelle: 'Annulée' },
];

const LIBELLES: Record<StatutCommande, string> = {
  EN_ATTENTE: 'En attente',
  PAYEE: 'Payée',
  EN_COURS: 'En préparation',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

/**
 * Commandes.
 *
 * Une ligne se déplie au lieu d'ouvrir un écran : préparer les commandes du
 * jour, c'est en parcourir dix d'affilée. Un aller-retour vers une fiche à
 * chaque fois ferait perdre la place dans la liste et le filtre en cours.
 *
 * Les actions proposées sont **seulement les transitions que l'API
 * acceptera**. La machine à états refuse par exemple de passer une commande
 * de EN_ATTENTE à PAYEE : seul un paiement confirmé le fait. Afficher le
 * bouton quand même reviendrait à promettre une action qui finira en 409.
 */
@Component({
  selector: 'app-admin-commandes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Montant, Tampon, Squelette, Alerte, Pagination],
  templateUrl: './commandes.html',
  styleUrl: './commandes.css',
})
export class AdminCommandes {
  private readonly service = inject(AdminCatalogueService);

  protected readonly statuts = STATUTS;

  protected readonly recherche = signal('');
  protected readonly statut = signal<StatutCommande | ''>('');
  protected readonly debut = signal('');
  protected readonly fin = signal('');

  protected readonly page = signal<PageReponse<CommandeResume>>(pageVide<CommandeResume>());
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  /** Commande dépliée, et son détail une fois chargé. */
  protected readonly ouverte = signal<number | null>(null);
  protected readonly detail = signal<Commande | null>(null);
  protected readonly detailEnCours = signal(false);
  protected readonly erreurDetail = signal<string | null>(null);
  protected readonly changementEnCours = signal(false);

  protected readonly aucunResultat = computed(
    () => !this.chargement() && this.page().contenu.length === 0,
  );

  protected readonly filtreActif = computed(
    () =>
      this.recherche().trim() !== '' ||
      this.statut() !== '' ||
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
    this.recherche.set('');
    this.statut.set('');
    this.debut.set('');
    this.fin.set('');
    this.charger(0);
  }

  /** Raccourci du tableau de bord : ce qui attend d'être préparé. */
  protected montrerAPreparer(): void {
    this.recherche.set('');
    this.debut.set('');
    this.fin.set('');
    this.statut.set('PAYEE');
    this.charger(0);
  }

  protected charger(numeroPage: number): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.ouverte.set(null);

    const filtre: FiltreCommandes = { page: numeroPage, size: 20 };
    const terme = this.recherche().trim();
    if (terme) {
      filtre.recherche = terme;
    }
    if (this.statut()) {
      filtre.statut = this.statut() as StatutCommande;
    }
    if (this.debut()) {
      filtre.debut = this.debut();
    }
    if (this.fin()) {
      filtre.fin = this.fin();
    }

    this.service.rechercherCommandes(filtre).subscribe({
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

  protected basculer(idCommande: number): void {
    if (this.ouverte() === idCommande) {
      this.ouverte.set(null);
      return;
    }
    this.ouverte.set(idCommande);
    this.detail.set(null);
    this.erreurDetail.set(null);
    this.detailEnCours.set(true);

    this.service.detailCommande(idCommande).subscribe({
      next: (commande) => {
        this.detail.set(commande);
        this.detailEnCours.set(false);
      },
      error: (erreur: ErreurBoutique) => {
        this.detailEnCours.set(false);
        this.erreurDetail.set(erreur.message);
      },
    });
  }

  protected transitions(statut: StatutCommande): StatutCommande[] {
    return this.service.transitionsPossibles(statut);
  }

  protected libelle(statut: StatutCommande): string {
    return LIBELLES[statut] ?? statut;
  }

  /** Le libellé du bouton dit l'action, pas l'état d'arrivée. */
  protected libelleAction(statut: StatutCommande): string {
    switch (statut) {
      case 'EN_COURS':
        return 'Mettre en préparation';
      case 'LIVREE':
        return 'Marquer livrée';
      case 'ANNULEE':
        return 'Annuler la commande';
      default:
        return this.libelle(statut);
    }
  }

  protected changerStatut(idCommande: number, statut: StatutCommande): void {
    this.changementEnCours.set(true);
    this.erreurDetail.set(null);

    this.service.changerStatut(idCommande, statut).subscribe({
      next: (commande) => {
        this.changementEnCours.set(false);
        this.detail.set(commande);
        // La ligne du tableau porte l'ancien statut : on la remet à jour
        // sur place plutôt que de recharger et perdre la position.
        this.page.update((p) => ({
          ...p,
          contenu: p.contenu.map((ligne) =>
            ligne.idCommande === idCommande ? { ...ligne, statut: commande.statut } : ligne,
          ),
        }));
      },
      error: (erreur: ErreurBoutique) => {
        this.changementEnCours.set(false);
        this.erreurDetail.set(erreur.message);
      },
    });
  }

  protected horodatage(valeur: string | null): string {
    if (!valeur) {
      return '—';
    }
    const date = new Date(valeur);
    if (Number.isNaN(date.getTime())) {
      return valeur;
    }
    return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }
}
