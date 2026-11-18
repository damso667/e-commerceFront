import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { BASE_API } from '../core/api.config';
import { ErreurApi } from '../models/api.models';

/** Erreur normalisée que les composants manipulent, quelle que soit la panne. */
export class ErreurBoutique extends Error {
  constructor(
    readonly statut: number,
    message: string,
    readonly champs?: Record<string, string>,
    readonly chemin?: string,
  ) {
    super(message);
    this.name = 'ErreurBoutique';
  }

  /** Session absente ou expirée : il faut se reconnecter. */
  get demandeConnexion(): boolean {
    return this.statut === 401 || this.statut === 403;
  }

  /** Le serveur n'a pas répondu du tout : réseau coupé, ou instance endormie. */
  get estPanneReseau(): boolean {
    return this.statut === 0;
  }

  get estConflitMetier(): boolean {
    return this.statut === 409;
  }
}

/**
 * Socle de tous les appels serveur.
 *
 * Tous les fichiers qui parlent au serveur vivent dans ce dossier, et ils
 * passent tous par ici : un seul endroit construit les URL, un seul endroit
 * traduit les erreurs. Les composants ne voient jamais un `HttpErrorResponse`.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly base = inject(BASE_API);

  /** URL absolue à partir d'un chemin relatif renvoyé par l'API. */
  url(chemin: string): string {
    if (!chemin) {
      return '';
    }
    return /^https?:\/\//.test(chemin) ? chemin : `${this.base}${chemin}`;
  }

  get<T>(chemin: string, parametres?: Record<string, unknown>): Observable<T> {
    return this.http
      .get<T>(this.url(chemin), { params: this.params(parametres) })
      .pipe(catchError(traduire));
  }

  post<T>(chemin: string, corps?: unknown, cleIdempotence?: string): Observable<T> {
    return this.http
      .post<T>(this.url(chemin), corps ?? {}, { headers: this.entetes(cleIdempotence) })
      .pipe(catchError(traduire));
  }

  put<T>(chemin: string, corps?: unknown): Observable<T> {
    return this.http.put<T>(this.url(chemin), corps ?? {}).pipe(catchError(traduire));
  }

  patch<T>(chemin: string, corps?: unknown): Observable<T> {
    return this.http.patch<T>(this.url(chemin), corps ?? {}).pipe(catchError(traduire));
  }

  delete<T>(chemin: string): Observable<T> {
    return this.http.delete<T>(this.url(chemin)).pipe(catchError(traduire));
  }

  /** Dépôt de fichier (logo, icône). */
  postFichier<T>(chemin: string, champ: string, fichier: File): Observable<T> {
    const corps = new FormData();
    corps.append(champ, fichier);
    return this.http.post<T>(this.url(chemin), corps).pipe(catchError(traduire));
  }

  /**
   * Clé d'idempotence. L'API s'en sert pour qu'un double-clic, un retry
   * réseau ou un rechargement de page ne déclenche pas un second paiement :
   * la même clé renvoie la réponse d'origine au lieu de rejouer l'opération.
   */
  nouvelleCle(): string {
    return crypto.randomUUID();
  }

  private entetes(cleIdempotence?: string): Record<string, string> {
    return cleIdempotence ? { 'Idempotency-Key': cleIdempotence } : {};
  }

  private params(valeurs?: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    for (const [cle, valeur] of Object.entries(valeurs ?? {})) {
      if (valeur !== null && valeur !== undefined && valeur !== '') {
        params = params.set(cle, String(valeur));
      }
    }
    return params;
  }
}

/**
 * Traduit toute panne en {@link ErreurBoutique} portant un message affichable.
 *
 * L'API renvoie déjà un corps d'erreur normalisé ; on le préfère toujours à
 * un message inventé. Les messages de repli ci-dessous nomment le problème
 * ET la sortie, parce qu'une erreur sans porte de sortie laisse le visiteur
 * bloqué.
 */
function traduire(reponse: HttpErrorResponse) {
  if (reponse.status === 0) {
    return throwError(
      () =>
        new ErreurBoutique(
          0,
          "Le serveur n'a pas répondu. Vérifiez votre connexion, puis réessayez.",
        ),
    );
  }

  const corps = reponse.error as ErreurApi | string | null;

  if (corps && typeof corps === 'object' && typeof corps.message === 'string') {
    return throwError(
      () => new ErreurBoutique(reponse.status, corps.message, corps.champs, corps.chemin),
    );
  }

  return throwError(() => new ErreurBoutique(reponse.status, messageParDefaut(reponse.status)));
}

function messageParDefaut(statut: number): string {
  switch (statut) {
    case 400:
      return 'Les informations envoyées ne sont pas valides. Corrigez-les et réessayez.';
    case 401:
      return 'Vous devez vous connecter pour continuer.';
    case 403:
      return "Vous n'avez pas accès à cette page.";
    case 404:
      return "Cette ressource n'existe pas ou a été supprimée.";
    case 409:
      return "L'opération a été refusée. Rechargez la page pour voir l'état à jour.";
    case 413:
      return 'Le fichier est trop lourd.';
    case 429:
      return 'Trop de tentatives. Patientez un instant.';
    default:
      return statut >= 500
        ? 'Le serveur a rencontré une erreur. Réessayez dans un instant.'
        : "L'opération n'a pas abouti.";
  }
}
