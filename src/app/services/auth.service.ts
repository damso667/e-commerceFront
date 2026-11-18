import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Personne, Role, SessionOuverte } from '../models/api.models';
import { ApiService } from './api.service';

const CLE_MEMOIRE = 'qalf.session';

/** Ce que l'on retient localement d'une session : jamais de mot de passe. */
interface SessionMemorisee {
  role: Role;
  email: string;
}

/**
 * Connexion, inscription, déconnexion.
 *
 * L'API authentifie par **session et cookie**, pas par jeton : il n'y a donc
 * rien à stocker pour s'authentifier, et surtout aucun jeton à garder dans
 * le navigateur. On mémorise seulement le rôle et l'email, pour afficher la
 * bonne navigation au rechargement sans attendre un aller-retour réseau.
 * Cette mémoire n'est jamais une preuve : c'est l'API qui tranche à chaque
 * requête, et un 403 nous la fait oublier.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  private readonly session = signal<SessionMemorisee | null>(this.relire());

  readonly connecte = computed(() => this.session() !== null);
  readonly role = computed(() => this.session()?.role ?? null);
  readonly email = computed(() => this.session()?.email ?? null);
  readonly estAdmin = computed(() => this.session()?.role === 'ADMIN');

  connexion(email: string, motDePasse: string): Observable<SessionOuverte> {
    return this.api
      .post<SessionOuverte>('/api/auth/login', { email, password: motDePasse })
      .pipe(
        tap((reponse) => {
          const role: Role = reponse.role === 'ROLE_ADMIN' ? 'ADMIN' : 'USER';
          this.memoriser({ role, email });
        }),
      );
  }

  inscription(donnees: {
    nom: string;
    prenom?: string;
    email: string;
    motDePasse: string;
    adresse?: string;
    numeroTelephone?: string;
  }): Observable<Personne> {
    return this.api.post<Personne>('/api/personne/register', donnees);
  }

  deconnexion(): Observable<unknown> {
    return this.api.post('/api/auth/logout').pipe(tap(() => this.oublier()));
  }

  /** Appelée quand l'API refuse une requête : la mémoire locale était périmée. */
  oublier(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(CLE_MEMOIRE);
    } catch {
      // Navigation privée ou stockage bloqué : sans effet, et sans incident.
    }
  }

  private memoriser(valeur: SessionMemorisee): void {
    this.session.set(valeur);
    try {
      localStorage.setItem(CLE_MEMOIRE, JSON.stringify(valeur));
    } catch {
      // L'application fonctionne sans : seule la navigation au rechargement
      // devra attendre une réponse de l'API.
    }
  }

  private relire(): SessionMemorisee | null {
    try {
      const brut = localStorage.getItem(CLE_MEMOIRE);
      if (!brut) {
        return null;
      }
      const valeur = JSON.parse(brut) as SessionMemorisee;
      return valeur?.role === 'ADMIN' || valeur?.role === 'USER' ? valeur : null;
    } catch {
      return null;
    }
  }
}
