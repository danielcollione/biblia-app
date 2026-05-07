import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, tap } from 'rxjs';

export interface Usuario {
  name: string;
  email: string;
  pictureUrl?: string; // Ajustado para o nome real no banco/token
  level: number;
  experiencia: number;
  cargo: string;
  subscriptionType?: 'FREE' | 'STANDARD' | 'PREMIUM' | 'LIFETIME' | null;
  subscriptionActive?: boolean;
  subscriptionExpiresAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  
  private readonly apiUrl = 'https://backendtub.onrender.com/api/v1/auth';
  private readonly TOKEN_KEY = 'auth_token';

  private _usuario = signal<Usuario | null>(null);
  private _isLoading = signal<boolean>(false); // Sinal para o Loading

  readonly usuario = computed(() => this._usuario());
  readonly isLoading = computed(() => this._isLoading());
  readonly estaAutenticado = computed(() => !!this._usuario());

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarSessaoDoStorage();
    }
  }

  loginComGoogle(googleToken: string): Observable<string> {
    this._isLoading.set(true); 
    return this.http.post(`${this.apiUrl}/google`, { token: googleToken }, { responseType: 'text' }).pipe(
      tap(jwt => this.processarSucessoLogin(jwt)),
      finalize(() => this._isLoading.set(false))
    );
  }

  loginTradicional(email: string, senha: string): Observable<string> {
    this._isLoading.set(true);
    return this.http.post(this.apiUrl + "/login", { email, password: senha }, { responseType: "text" }).pipe(
      tap((token) => this.processarSucessoLogin(token)),
      finalize(() => this._isLoading.set(false))
    );
  }

  cadastrarTradicional(nome: string, email: string, senha: string): Observable<string> {
    this._isLoading.set(true);
    return this.http.post(this.apiUrl + '/register', { name: nome, email, password: senha }, { responseType: 'text' }).pipe(
      finalize(() => this._isLoading.set(false))
    );
  }

  forgotPassword(email: string): Observable<string> {
    this._isLoading.set(true);
    return this.http.post(this.apiUrl + '/forgot-password', { email }, { responseType: 'text' }).pipe(
      finalize(() => this._isLoading.set(false))
    );
  }

  resetPassword(token: string, newPassword: string): Observable<string> {
    this._isLoading.set(true);
    return this.http.post(this.apiUrl + '/reset-password', { token, newPassword }, { responseType: 'text' }).pipe(
      finalize(() => this._isLoading.set(false))
    );
  }

  logout(reason?: 'session_expired'): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
    this._usuario.set(null);
    if (reason === 'session_expired') {
      this.router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
      return;
    }

    this.router.navigate(['/login']);
  }

  private processarSucessoLogin(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.TOKEN_KEY, token);
      this.carregarSessaoDoStorage();
      this.refreshUserProfileFromServer();
    }
    this.router.navigate(['/home']);
  }

  ensureProfileFreshForHome(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const token = this.getToken();
    if (!token) {
      this.logout();
      return;
    }

    this.carregarSessaoDoStorage();
    this.refreshUserProfileFromServer(true);
  }

  refreshUserProfileFromServer(forceRefresh = false): void {
    const token = this.getToken();

    if (!token || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const refreshQuery = forceRefresh ? '?forceRefresh=true' : '';

    this.http.get<Usuario>(`${this.apiUrl}/me${refreshQuery}`, { headers }).subscribe({
      next: (profile) => {
        if (!profile) {
          return;
        }

        this.setUsuario(profile);
      },
      error: () => {
        this.logout();
      }
    });
  }

  private carregarSessaoDoStorage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.setUsuario({
        name: payload.name,
        email: payload.sub,
        pictureUrl: payload.picture,
        level: payload.level || 1,
        experiencia: payload.experiencia || 0,
        cargo: payload.cargo || 'Apprentice',
        subscriptionType: payload.subscriptionType || null,
        subscriptionActive: payload.subscriptionActive || false,
        subscriptionExpiresAt: payload.subscriptionExpiresAt || null
      });
    } catch (e) {
      console.error('Falha na integridade do token:', e);
      this.logout();
    }
  }

  private setUsuario(profile: Usuario): void {
    const normalizedProfile: Usuario = {
      name: profile.name,
      email: profile.email,
      pictureUrl: profile.pictureUrl,
      level: profile.level ?? 1,
      experiencia: profile.experiencia ?? 0,
      cargo: profile.cargo || 'Apprentice',
      subscriptionType: profile.subscriptionType ?? null,
      subscriptionActive: profile.subscriptionActive ?? false,
      subscriptionExpiresAt: profile.subscriptionExpiresAt ?? null
    };

    this._usuario.set(normalizedProfile);
  }
}