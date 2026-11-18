/**
 * Types miroirs des DTO de l'API.
 *
 * Règle tenue partout : les noms de champs sont exactement ceux que l'API
 * renvoie, et le vocabulaire du domaine reste en français (article, panier,
 * commande, paiement, avis). Aucune traduction, aucun renommage « plus
 * joli » : chaque alias serait une occasion de se tromper silencieusement.
 */

// ==================================================================
//  Énumérations
// ==================================================================

export type StatutCommande = 'EN_ATTENTE' | 'PAYEE' | 'EN_COURS' | 'LIVREE' | 'ANNULEE';

export type StatutPaiement =
  | 'EN_ATTENTE'
  | 'EN_COURS'
  | 'PAYE'
  | 'ECHOUE'
  | 'EXPIRE'
  | 'ANNULE'
  | 'REMBOURSE';

export type FournisseurPaiement = 'MTN_MOMO' | 'ORANGE_MONEY';

export type Role = 'USER' | 'ADMIN';

/** Statuts dont l'API ne changera plus jamais la valeur. */
export const STATUTS_PAIEMENT_TERMINAUX: readonly StatutPaiement[] = [
  'PAYE',
  'ECHOUE',
  'EXPIRE',
  'ANNULE',
  'REMBOURSE',
];

export function estTerminal(statut: StatutPaiement): boolean {
  return STATUTS_PAIEMENT_TERMINAUX.includes(statut);
}

// ==================================================================
//  Pagination
// ==================================================================

/** Enveloppe `PageReponse` de l'API. */
export interface PageReponse<T> {
  contenu: T[];
  page: number;
  taille: number;
  totalElements: number;
  totalPages: number;
  premiere: boolean;
  derniere: boolean;
}

export function pageVide<T>(taille = 20): PageReponse<T> {
  return {
    contenu: [],
    page: 0,
    taille,
    totalElements: 0,
    totalPages: 0,
    premiere: true,
    derniere: true,
  };
}

// ==================================================================
//  Identité de la boutique (white-label)
// ==================================================================

export interface ParametresBoutique {
  nom: string;
  slogan: string | null;
  couleurPrimaire: string;
  monogramme: string;
  logoUrl: string | null;
  iconeUrl: string | null;
  telephoneContact: string | null;
  emailContact: string | null;
  adresse: string | null;
  messageAccueil: string | null;
  paiementSimule: boolean;
}

// ==================================================================
//  Catalogue
// ==================================================================

/** Vue publique d'un article (`ArticleDto`). */
export interface Article {
  id: number;
  nom: string;
  description: string | null;
  prix: number;
  imageUrl: string | null;
  categorieId: number;
  nomCategorie: string | null;
  /** Quantité restante. 0 = rupture. */
  stock: number | null;
}

/** Vue admin d'un article (`ArticleResponseDto`). */
export interface ArticleAdmin {
  idArticle: number;
  libelle: string;
  description: string | null;
  prix: number;
  stock: number | null;
  /** Adresse de la photo : celle téléversée si elle existe, sinon l'URL externe. */
  imageUrl: string | null;
  /** Vrai quand la photo vient d'un fichier déposé, donc retirable. */
  imageTeleversee: boolean;
  nomCategorie: string;
}

export interface Categorie {
  idCategorie: number;
  nomCategorie: string;
  description: string | null;
  nombreArticles?: number;
}

export interface Avis {
  idAvis: number;
  nomAuteur: string;
  note: number;
  commentaire: string | null;
  dateAvis: string;
}

// ==================================================================
//  Panier
// ==================================================================

export interface LignePanier {
  idArticle: number;
  libelle: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export interface Panier {
  idPanier: number;
  nomClient: string;
  lignes: LignePanier[];
  total: number;
}

// ==================================================================
//  Commandes
// ==================================================================

export interface LigneCommande {
  idArticle: number;
  libelle: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export interface Commande {
  idCommande: number;
  nomClient: string;
  dateCommande: string;
  statut: StatutCommande;
  modePaiement: FournisseurPaiement | null;
  statutPaiement: StatutPaiement | null;
  referencePaiement: string | null;
  montantTotal: number;
  lignes: LigneCommande[];
}

/** Ligne de liste du back-office (`CommandeResumeDto`). */
export interface CommandeResume {
  idCommande: number;
  dateCommande: string;
  dateCreation: string | null;
  statut: StatutCommande;
  montantTotal: number;
  idClient: number | null;
  nomClient: string | null;
  emailClient: string | null;
  nombreLignes: number;
}

// ==================================================================
//  Paiement
// ==================================================================

export interface Paiement {
  reference: string;
  idCommande: number | null;
  montant: number;
  devise: string;
  fournisseur: FournisseurPaiement;
  statut: StatutPaiement;
  enAttenteDeValidation: boolean;
  terminal: boolean;
  numeroPayeur: string | null;
  message: string | null;
  codeErreur: string | null;
  tentative: number;
  dateCreation: string;
  dateExpiration: string | null;
  datePaiement: string | null;
}

export interface CommandePayee {
  commande: Commande;
  paiement: Paiement;
  intervallePollingSecondes: number;
}

export interface PaiementAdmin extends Omit<Paiement, 'enAttenteDeValidation'> {
  idClient: number | null;
  nomClient: string | null;
  emailClient: string | null;
  dateMiseAJour: string | null;
}

export interface EvenementPaiement {
  id: number;
  fournisseur: FournisseurPaiement;
  idEvenement: string;
  statutRecu: string;
  charge: string | null;
  dateReception: string;
}

export interface PaiementDetailAdmin {
  paiement: PaiementAdmin;
  commande: Commande;
  tentatives: PaiementAdmin[];
  evenements: EvenementPaiement[];
}

export interface ResultatRemboursement {
  paiement: PaiementAdmin;
  automatique: boolean;
  consigne: string;
}

// ==================================================================
//  Comptes
// ==================================================================

export interface Personne {
  id: number;
  nom: string;
  prenom: string | null;
  email: string;
  adresse: string | null;
  numeroTelephone: string | null;
  role: Role;
  actif: boolean;
}

export interface ClientDetail {
  client: Personne;
  dateInscription: string | null;
  nombreCommandes: number;
  nombreCommandesPayees: number;
  totalDepense: number;
  panierMoyen: number;
  dateDerniereCommande: string | null;
  panierEnCours: Panier | null;
  dernieresCommandes: CommandeResume[];
}

export interface SessionOuverte {
  message: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN' | string;
}

// ==================================================================
//  Back-office : tableau de bord
// ==================================================================

export interface PointJour {
  jour: string;
  chiffreAffaires: number;
  nombrePaiementsReussis: number;
  nombreCommandes: number;
}

export interface StatsFournisseur {
  fournisseur: FournisseurPaiement;
  libelle: string;
  total: number;
  reussis: number;
  echoues: number;
  expires: number;
  tauxReussite: number;
  montantEncaisse: number;
}

export interface ArticleVente {
  idArticle: number;
  libelle: string;
  quantiteTotaleVendue: number;
  chiffreAffaires: number;
}

export interface ArticleStock {
  idArticle: number;
  libelle: string;
  stock: number | null;
  nomCategorie: string;
}

export interface TableauDeBord {
  periode: { debut: string; fin: string; nombreJours: number };
  ventes: {
    chiffreAffaires: number;
    nombreCommandesPayees: number;
    nombreCommandesCreees: number;
    panierMoyen: number;
    nombreArticlesVendus: number;
    tauxConversion: number;
    /** null quand la période précédente était à zéro : pas de comparaison possible. */
    evolutionChiffreAffaires: number | null;
    evolutionCommandes: number | null;
    chiffreAffairesPeriodePrecedente: number;
  };
  aujourdhui: {
    date: string;
    chiffreAffaires: number;
    nombreCommandes: number;
    nombreCommandesPayees: number;
    nouveauxClients: number;
  };
  serie: PointJour[];
  commandesParStatut: Record<string, number>;
  paiements: {
    parStatut: Record<string, number>;
    parFournisseur: StatsFournisseur[];
    motifsEchec: Record<string, number>;
    tauxReussiteGlobal: number;
  };
  meilleursArticles: ArticleVente[];
  meilleursClients: {
    idClient: number;
    nom: string;
    email: string;
    nombreCommandes: number;
    totalDepense: number;
  }[];
  caParCategorie: {
    idCategorie: number;
    nomCategorie: string;
    chiffreAffaires: number;
    quantiteVendue: number;
  }[];
  clients: { total: number; actifs: number; bloques: number; nouveauxSurPeriode: number };
  alertes: {
    commandesAPreparer: number;
    paiementsEnCours: number;
    paiementsBloques: number;
    articlesEnRupture: number;
    articlesStockFaible: number;
    seuilStockFaible: number;
    stockFaible: ArticleStock[];
  };
}

export interface AvisAdmin {
  idAvis: number;
  note: number;
  commentaire: string | null;
  dateAvis: string;
  idAuteur: number;
  nomAuteur: string;
  emailAuteur: string;
  idArticle: number;
  libelleArticle: string;
}

export interface EntreeJournal {
  id: number;
  acteur: string;
  action: string;
  cibleType: string | null;
  cibleId: string | null;
  details: string | null;
  dateAction: string;
}

// ==================================================================
//  Erreur normalisée de l'API
// ==================================================================

/** Corps d'erreur produit par `GestionnaireErreurs` côté API. */
export interface ErreurApi {
  horodatage: string;
  statut: number;
  erreur: string;
  message: string;
  chemin: string;
  /** Présent uniquement sur les erreurs de validation. */
  champs?: Record<string, string>;
}
