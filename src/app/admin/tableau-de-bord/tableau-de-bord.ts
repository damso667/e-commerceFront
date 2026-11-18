import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TableauDeBord } from '../../models/api.models';
import { ErreurBoutique } from '../../services/api.service';
import { AdminTableauDeBordService } from '../../services/admin-tableau-de-bord.service';
import { formaterFcfa } from '../../ui/pipes/fcfa.pipe';
import { Alerte } from '../../ui/alerte/alerte';
import { MarquePaiement } from '../../ui/marque-paiement/marque-paiement';
import { Squelette } from '../../ui/squelette/squelette';
import { Stat } from '../ui/stat/stat';

/** Barre du graphique journalier, déjà mise à l'échelle. */
interface Barre {
  jour: string;
  etiquette: string;
  chiffreAffaires: number;
  nombreCommandes: number;
  hauteur: number;
}

const PERIODES = [
  { jours: 7, libelle: '7 jours' },
  { jours: 30, libelle: '30 jours' },
  { jours: 90, libelle: '90 jours' },
];

/**
 * Tableau de bord.
 *
 * Il est organisé par ce qu'on en fait, pas par ce que l'API renvoie :
 *
 *  1. **Ce qui demande une action aujourd'hui** — commandes à préparer,
 *     paiements bloqués, ruptures. En haut, parce que c'est la raison pour
 *     laquelle on ouvre cet écran le matin.
 *  2. **Ce qui dit où on en est** — chiffres de la période et courbe.
 *  3. **Ce qui explique pourquoi** — opérateurs, motifs d'échec, articles,
 *     clients, rayons.
 *
 * Les évolutions viennent de l'API, qui renvoie `null` quand la période
 * précédente était à zéro. On ne fabrique pas de pourcentage dans ce cas :
 * « +100 % » sur une base nulle ne veut rien dire.
 */
@Component({
  selector: 'app-admin-tableau-de-bord',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Stat, Squelette, Alerte, MarquePaiement],
  templateUrl: './tableau-de-bord.html',
  styleUrl: './tableau-de-bord.css',
})
export class AdminTableauDeBord {
  private readonly service = inject(AdminTableauDeBordService);

  protected readonly periodes = PERIODES;
  protected readonly jours = signal(30);
  protected readonly donnees = signal<TableauDeBord | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  protected readonly aDesAlertes = computed(() => {
    const a = this.donnees()?.alertes;
    if (!a) {
      return false;
    }
    return (
      a.commandesAPreparer > 0 ||
      a.paiementsBloques > 0 ||
      a.articlesEnRupture > 0 ||
      a.articlesStockFaible > 0
    );
  });

  /**
   * Barres du graphique. L'échelle est fixée par le meilleur jour de la
   * période : une échelle absolue écraserait toute la courbe d'une petite
   * boutique, et une échelle qui démarre ailleurs qu'à zéro exagère les
   * écarts.
   */
  protected readonly barres = computed<Barre[]>(() => {
    const serie = this.donnees()?.serie ?? [];
    const sommet = Math.max(1, ...serie.map((p) => p.chiffreAffaires));
    return serie.map((p) => ({
      jour: p.jour,
      etiquette: etiquetteJour(p.jour),
      chiffreAffaires: p.chiffreAffaires,
      nombreCommandes: p.nombreCommandes,
      hauteur: Math.max(p.chiffreAffaires > 0 ? 2 : 0, (p.chiffreAffaires / sommet) * 100),
    }));
  });

  protected readonly sommetSerie = computed(() =>
    Math.max(0, ...(this.donnees()?.serie ?? []).map((p) => p.chiffreAffaires)),
  );

  /** Statuts de commande triés dans l'ordre du parcours, pas alphabétique. */
  protected readonly statutsCommande = computed(() => {
    const parStatut = this.donnees()?.commandesParStatut ?? {};
    const ordre = ['EN_ATTENTE', 'PAYEE', 'EN_COURS', 'LIVREE', 'ANNULEE'];
    const libelles: Record<string, string> = {
      EN_ATTENTE: 'En attente de paiement',
      PAYEE: 'Payée',
      EN_COURS: 'En préparation',
      LIVREE: 'Livrée',
      ANNULEE: 'Annulée',
    };
    const total = Object.values(parStatut).reduce((s, n) => s + n, 0);
    return ordre
      .filter((cle) => (parStatut[cle] ?? 0) > 0)
      .map((cle) => ({
        cle,
        libelle: libelles[cle] ?? cle,
        nombre: parStatut[cle],
        part: total > 0 ? Math.round((parStatut[cle] / total) * 100) : 0,
      }));
  });

  protected readonly motifsEchec = computed(() => {
    const motifs = this.donnees()?.paiements.motifsEchec ?? {};
    return Object.entries(motifs)
      .map(([code, nombre]) => ({ code, libelle: libelleMotif(code), nombre }))
      .sort((a, b) => b.nombre - a.nombre);
  });

  constructor() {
    this.charger();
  }

  protected changerPeriode(jours: number): void {
    if (jours !== this.jours()) {
      this.jours.set(jours);
      this.charger();
    }
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    const { debut, fin } = this.service.periodeDerniersJours(this.jours());
    this.service.charger(debut, fin).subscribe({
      next: (donnees) => {
        this.donnees.set(donnees);
        this.chargement.set(false);
      },
      error: (erreur: ErreurBoutique) => {
        this.chargement.set(false);
        this.erreur.set(erreur.message);
      },
    });
  }

  protected fcfa(valeur: number | null): string {
    return formaterFcfa(valeur);
  }

  protected pourcent(valeur: number | null | undefined): string {
    return valeur === null || valeur === undefined ? '—' : `${valeur.toFixed(1)} %`;
  }

  protected nombre(valeur: number | null | undefined): string {
    return valeur === null || valeur === undefined ? '—' : valeur.toLocaleString('fr-FR');
  }

  protected jourLisible(iso: string): string {
    return etiquetteJour(iso, true);
  }
}

function etiquetteJour(iso: string, long = false): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString('fr-FR', long ? { dateStyle: 'long' } : { day: '2-digit', month: '2-digit' });
}

function libelleMotif(code: string): string {
  const libelles: Record<string, string> = {
    FONDS_INSUFFISANTS: 'Fonds insuffisants',
    REFUS_CLIENT: 'Refusé par le client',
    EXPIRATION: 'Pas validé à temps',
    COMPTE_INTROUVABLE: 'Compte introuvable',
    ERREUR_OPERATEUR: 'Erreur opérateur',
    ANNULATION: 'Annulé',
  };
  return libelles[code] ?? code;
}
