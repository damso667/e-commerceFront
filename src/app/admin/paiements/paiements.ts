import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FournisseurPaiement,
  PageReponse,
  PaiementAdmin,
  StatutPaiement,
  pageVide,
} from '../../models/api.models';
import { AdminPaiementsService, FiltrePaiements } from '../../services/admin-paiements.service';
import { ErreurBoutique } from '../../services/api.service';
import { Alerte } from '../../ui/alerte/alerte';
import { MarquePaiement } from '../../ui/marque-paiement/marque-paiement';
import { Montant } from '../../ui/montant/montant';
import { Squelette } from '../../ui/squelette/squelette';
import { Tampon } from '../../ui/tampon/tampon';
import { Pagination } from '../ui/pagination/pagination';

const STATUTS: { valeur: StatutPaiement; libelle: string }[] = [
  { valeur: 'EN_ATTENTE', libelle: 'En attente' },
  { valeur: 'EN_COURS', libelle: 'En cours de validation' },
  { valeur: 'PAYE', libelle: 'Payé' },
  { valeur: 'ECHOUE', libelle: 'Échoué' },
  { valeur: 'EXPIRE', libelle: 'Expiré' },
  { valeur: 'ANNULE', libelle: 'Annulé' },
  { valeur: 'REMBOURSE', libelle: 'Remboursé' },
];

/**
 * Liste des paiements : c'est l'outil du support.
 *
 * Le champ de recherche est unique et couvre à lui seul la référence
 * interne, la référence opérateur, le numéro payeur, le nom et l'email du
 * client. Au téléphone avec un client, on tape ce qu'il donne sans avoir à
 * deviner dans quelle case ça va.
 *
 * Changer un filtre ramène à la première page : rester en page 7 d'un
 * résultat qui n'en compte plus que 2 affiche une liste vide et laisse
 * croire qu'il n'y a rien.
 */
@Component({
  selector: 'app-admin-paiements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Montant, Tampon, Squelette, Alerte, Pagination, MarquePaiement],
  templateUrl: './paiements.html',
  styleUrl: './paiements.css',
})
export class AdminPaiements {
  private readonly service = inject(AdminPaiementsService);

  protected readonly statuts = STATUTS;

  protected readonly recherche = signal('');
  protected readonly statut = signal<StatutPaiement | ''>('');
  protected readonly fournisseur = signal<FournisseurPaiement | ''>('');
  protected readonly debut = signal('');
  protected readonly fin = signal('');

  protected readonly page = signal<PageReponse<PaiementAdmin>>(pageVide<PaiementAdmin>());
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  protected readonly aucunResultat = computed(
    () => !this.chargement() && this.page().contenu.length === 0,
  );

  protected readonly filtreActif = computed(
    () =>
      this.recherche().trim() !== '' ||
      this.statut() !== '' ||
      this.fournisseur() !== '' ||
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
    this.fournisseur.set('');
    this.debut.set('');
    this.fin.set('');
    this.charger(0);
  }

  protected charger(numeroPage: number): void {
    this.chargement.set(true);
    this.erreur.set(null);

    const filtre: FiltrePaiements = { page: numeroPage, size: 20 };
    const terme = this.recherche().trim();
    if (terme) {
      filtre.recherche = terme;
    }
    if (this.statut()) {
      filtre.statut = this.statut() as StatutPaiement;
    }
    if (this.fournisseur()) {
      filtre.fournisseur = this.fournisseur() as FournisseurPaiement;
    }
    if (this.debut()) {
      filtre.debut = this.debut();
    }
    if (this.fin()) {
      filtre.fin = this.fin();
    }

    this.service.rechercher(filtre).subscribe({
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
