import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AdminParametresService,
  ParametresRequete,
} from '../../services/admin-parametres.service';
import { ErreurBoutique } from '../../services/api.service';
import { ParametresService } from '../../services/parametres.service';
import { Alerte } from '../../ui/alerte/alerte';

/** Couleurs proposées : une seule encre par boutique, jamais un dégradé. */
const SUGGESTIONS = [
  { valeur: '#0B6B5E', nom: 'Émeraude profond' },
  { valeur: '#1B4F8A', nom: 'Bleu encre' },
  { valeur: '#8A2B2B', nom: 'Terre brûlée' },
  { valeur: '#4A3A86', nom: 'Prune' },
  { valeur: '#1F6B2E', nom: 'Vert forêt' },
  { valeur: '#1A1A18', nom: 'Noir' },
];

/**
 * Identité de la boutique.
 *
 * **C'est l'écran qui rend la plateforme revendable.** Un marchand doit
 * pouvoir exploiter la boutique sous sa propre marque sans toucher au code
 * ni redéployer : nom, slogan, couleur, contacts, logo — et jusqu'à
 * l'icône de l'application une fois installée sur le téléphone, puisque le
 * manifeste PWA est engendré depuis la base.
 *
 * Chaque enregistrement est réinjecté dans {@link ParametresService}, donc
 * l'interface entière change de marque immédiatement, en-tête et pied de
 * page compris. Pas de rechargement à demander : voir l'effet tout de
 * suite est ce qui permet de juger une couleur.
 *
 * Le SVG est refusé à l'upload. Ce n'est pas une limitation technique : un
 * SVG peut contenir du script, et il serait servi depuis l'origine de
 * l'API.
 */
@Component({
  selector: 'app-admin-identite',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alerte],
  templateUrl: './identite.html',
  styleUrl: './identite.css',
})
export class AdminIdentite {
  private readonly service = inject(AdminParametresService);
  private readonly parametresService = inject(ParametresService);

  protected readonly suggestions = SUGGESTIONS;
  protected readonly parametres = this.parametresService.parametres;
  protected readonly logoAffiche = this.parametresService.logoAffiche;

  protected readonly nom = signal(this.parametres().nom);
  protected readonly slogan = signal(this.parametres().slogan ?? '');
  protected readonly couleur = signal(this.parametres().couleurPrimaire);
  protected readonly telephone = signal(this.parametres().telephoneContact ?? '');
  protected readonly email = signal(this.parametres().emailContact ?? '');
  protected readonly adresse = signal(this.parametres().adresse ?? '');
  protected readonly messageAccueil = signal(this.parametres().messageAccueil ?? '');

  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly champsInvalides = signal<[string, string][] | null>(null);
  protected readonly message = signal<string | null>(null);

  protected readonly envoiLogo = signal(false);
  protected readonly envoiIcone = signal(false);
  protected readonly erreurFichier = signal<string | null>(null);

  protected readonly couleurValide = computed(() => /^#[0-9a-fA-F]{6}$/.test(this.couleur()));

  protected readonly valide = computed(
    () => this.nom().trim().length >= 2 && this.couleurValide(),
  );

  /** Initiales affichées tant qu'aucun logo n'est déposé. */
  protected readonly monogramme = computed(() => {
    const mots = this.nom().trim().split(/\s+/).filter(Boolean);
    if (mots.length === 0) {
      return '?';
    }
    if (mots.length === 1) {
      return mots[0].slice(0, 2).toUpperCase();
    }
    return (mots[0][0] + mots[1][0]).toUpperCase();
  });

  protected enregistrer(): void {
    if (!this.valide()) {
      return;
    }
    const donnees: ParametresRequete = {
      nom: this.nom().trim(),
      couleurPrimaire: this.couleur().toUpperCase(),
    };
    if (this.slogan().trim()) {
      donnees.slogan = this.slogan().trim();
    }
    if (this.telephone().trim()) {
      donnees.telephoneContact = this.telephone().trim();
    }
    if (this.email().trim()) {
      donnees.emailContact = this.email().trim();
    }
    if (this.adresse().trim()) {
      donnees.adresse = this.adresse().trim();
    }
    if (this.messageAccueil().trim()) {
      donnees.messageAccueil = this.messageAccueil().trim();
    }

    this.envoi.set(true);
    this.erreur.set(null);
    this.champsInvalides.set(null);
    this.message.set(null);

    this.service.modifier(donnees).subscribe({
      next: () => {
        this.envoi.set(false);
        this.message.set(
          "Identité enregistrée. L'en-tête, le pied de page et le manifeste de l'application suivent déjà.",
        );
      },
      error: (erreur: ErreurBoutique) => {
        this.envoi.set(false);
        this.erreur.set(erreur.message);
        if (erreur.champs) {
          this.champsInvalides.set(Object.entries(erreur.champs));
        }
      },
    });
  }

  protected deposerLogo(evenement: Event): void {
    const fichier = fichierDe(evenement);
    if (!fichier) {
      return;
    }
    const probleme = this.service.verifierImage(fichier);
    if (probleme) {
      this.erreurFichier.set(probleme);
      return;
    }
    this.envoiLogo.set(true);
    this.erreurFichier.set(null);
    this.message.set(null);

    this.service.deposerLogo(fichier).subscribe({
      next: () => {
        this.envoiLogo.set(false);
        this.message.set('Logo mis à jour.');
      },
      error: (erreur: ErreurBoutique) => {
        this.envoiLogo.set(false);
        this.erreurFichier.set(erreur.message);
      },
    });
  }

  protected deposerIcone(evenement: Event): void {
    const fichier = fichierDe(evenement);
    if (!fichier) {
      return;
    }
    const probleme = this.service.verifierImage(fichier);
    if (probleme) {
      this.erreurFichier.set(probleme);
      return;
    }
    this.envoiIcone.set(true);
    this.erreurFichier.set(null);
    this.message.set(null);

    this.service.deposerIcone(fichier).subscribe({
      next: () => {
        this.envoiIcone.set(false);
        this.message.set(
          "Icône mise à jour. Les téléphones où l'application est déjà installée la reprendront à la prochaine mise à jour du manifeste.",
        );
      },
      error: (erreur: ErreurBoutique) => {
        this.envoiIcone.set(false);
        this.erreurFichier.set(erreur.message);
      },
    });
  }

  protected retirerLogo(): void {
    this.erreurFichier.set(null);
    this.service.retirerLogo().subscribe({
      next: () => this.message.set('Logo retiré : le nom de la boutique reprend sa place.'),
      error: (erreur: ErreurBoutique) => this.erreurFichier.set(erreur.message),
    });
  }

  protected retirerIcone(): void {
    this.erreurFichier.set(null);
    this.service.retirerIcone().subscribe({
      next: () => this.message.set("Icône retirée : l'icône livrée avec l'application reprend."),
      error: (erreur: ErreurBoutique) => this.erreurFichier.set(erreur.message),
    });
  }
}

function fichierDe(evenement: Event): File | null {
  const champ = evenement.target as HTMLInputElement;
  const fichier = champ.files?.[0] ?? null;
  // Remettre le champ à zéro permet de redéposer le même fichier après
  // une correction : sinon le navigateur n'émet plus d'événement.
  champ.value = '';
  return fichier;
}
