import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ClientDetail, PageReponse, Personne, Role, pageVide } from '../../models/api.models';
import { AdminClientsService, FiltreClients } from '../../services/admin-clients.service';
import { ErreurBoutique } from '../../services/api.service';
import { Alerte } from '../../ui/alerte/alerte';
import { Montant } from '../../ui/montant/montant';
import { Squelette } from '../../ui/squelette/squelette';
import { Tampon } from '../../ui/tampon/tampon';
import { Pagination } from '../ui/pagination/pagination';

/**
 * Clients.
 *
 * Deux refus de l'API sont volontairement laissés remonter tels quels,
 * parce qu'ils disent exactement ce qu'il faut savoir :
 *
 *  - on ne modifie pas son propre rôle (403) ;
 *  - on ne rétrograde pas le dernier administrateur (409), sinon plus
 *    personne ne peut administrer la boutique.
 *
 * Bloquer un compte le désactive côté authentification : le client ne peut
 * plus se connecter, mais ses commandes et son historique restent.
 */
@Component({
  selector: 'app-admin-clients',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Montant, Tampon, Squelette, Alerte, Pagination],
  templateUrl: './clients.html',
  styleUrl: './clients.css',
})
export class AdminClients {
  private readonly service = inject(AdminClientsService);

  protected readonly recherche = signal('');
  protected readonly role = signal<Role | ''>('');
  protected readonly actif = signal<'' | 'oui' | 'non'>('');

  protected readonly page = signal<PageReponse<Personne>>(pageVide<Personne>());
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);

  protected readonly ouvert = signal<number | null>(null);
  protected readonly detail = signal<ClientDetail | null>(null);
  protected readonly detailEnCours = signal(false);
  protected readonly actionEnCours = signal(false);

  protected readonly aucunResultat = computed(
    () => !this.chargement() && this.page().contenu.length === 0,
  );

  protected readonly filtreActif = computed(
    () => this.recherche().trim() !== '' || this.role() !== '' || this.actif() !== '',
  );

  constructor() {
    this.charger(0);
  }

  protected appliquer(): void {
    this.charger(0);
  }

  protected reinitialiser(): void {
    this.recherche.set('');
    this.role.set('');
    this.actif.set('');
    this.charger(0);
  }

  protected charger(numeroPage: number): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.ouvert.set(null);

    const filtre: FiltreClients = { page: numeroPage, size: 20 };
    const terme = this.recherche().trim();
    if (terme) {
      filtre.recherche = terme;
    }
    if (this.role()) {
      filtre.role = this.role() as Role;
    }
    if (this.actif()) {
      filtre.actif = this.actif() === 'oui';
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

  protected basculer(idClient: number): void {
    if (this.ouvert() === idClient) {
      this.ouvert.set(null);
      return;
    }
    this.ouvert.set(idClient);
    this.detail.set(null);
    this.detailEnCours.set(true);

    this.service.detail(idClient).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.detailEnCours.set(false);
      },
      error: (erreur: ErreurBoutique) => {
        this.detailEnCours.set(false);
        this.erreur.set(erreur.message);
      },
    });
  }

  protected basculerActivation(client: Personne): void {
    this.actionEnCours.set(true);
    this.erreur.set(null);
    this.message.set(null);

    this.service.basculerActivation(client.id).subscribe({
      next: (misAJour) => {
        this.actionEnCours.set(false);
        this.remplacer(misAJour);
        this.message.set(
          misAJour.actif
            ? `${misAJour.nom} peut de nouveau se connecter.`
            : `${misAJour.nom} ne peut plus se connecter. Ses commandes sont conservées.`,
        );
      },
      error: (erreur: ErreurBoutique) => {
        this.actionEnCours.set(false);
        this.erreur.set(erreur.message);
      },
    });
  }

  protected changerRole(client: Personne, role: Role): void {
    this.actionEnCours.set(true);
    this.erreur.set(null);
    this.message.set(null);

    this.service.changerRole(client.id, role).subscribe({
      next: (misAJour) => {
        this.actionEnCours.set(false);
        this.remplacer(misAJour);
        this.message.set(
          role === 'ADMIN'
            ? `${misAJour.nom} est maintenant administrateur.`
            : `${misAJour.nom} est redevenu un client ordinaire.`,
        );
      },
      error: (erreur: ErreurBoutique) => {
        this.actionEnCours.set(false);
        this.erreur.set(erreur.message);
      },
    });
  }

  /** Met à jour la ligne sur place : recharger ferait perdre la position. */
  private remplacer(personne: Personne): void {
    this.page.update((p) => ({
      ...p,
      contenu: p.contenu.map((ligne) => (ligne.id === personne.id ? personne : ligne)),
    }));
    this.detail.update((d) => (d && d.client.id === personne.id ? { ...d, client: personne } : d));
  }

  protected date(valeur: string | null): string {
    if (!valeur) {
      return '—';
    }
    const date = new Date(valeur);
    if (Number.isNaN(date.getTime())) {
      return valeur;
    }
    return date.toLocaleDateString('fr-FR', { dateStyle: 'medium' });
  }

  protected nomComplet(personne: Personne): string {
    return personne.prenom ? `${personne.prenom} ${personne.nom}` : personne.nom;
  }
}
