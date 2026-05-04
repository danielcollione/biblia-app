import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subscription, finalize, interval, tap } from 'rxjs';

export interface Usuario {
  name: string;
  email: string;
  pictureUrl?: string; // Ajustado para o nome real no banco/token
  level: number;
  experiencia: number;
  cargo: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  
  private readonly apiUrl = 'https://backendtub.onrender.com/api/v1/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly PROFILE_REFRESH_INTERVAL_MS = 15000;

  private _usuario = signal<Usuario | null>(null);
  private _isLoading = signal<boolean>(false); // Sinal para o Loading
  private profileRefreshSubscription: Subscription | null = null;

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
      this.startProfileAutoRefresh();
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

  logout(): void {
    this.stopProfileAutoRefresh();

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
    this._usuario.set(null);
    this.router.navigate(['/login']);
  }

  private processarSucessoLogin(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.TOKEN_KEY, token);
      this.carregarSessaoDoStorage();
      this.startProfileAutoRefresh();
      this.refreshUserProfileFromServer();
    }
    this.router.navigate(['/home']);
  }

  refreshUserProfileFromServer(): void {
    const token = this.getToken();

    if (!token || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<Usuario>(`${this.apiUrl}/me`, { headers }).subscribe({
      next: (profile) => {
        if (!profile) {
          return;
        }

        this._usuario.set({
          name: profile.name,
          email: profile.email,
          pictureUrl: profile.pictureUrl,
          level: profile.level ?? 1,
          experiencia: profile.experiencia ?? 0,
          cargo: profile.cargo || 'Apprentice'
        });
      },
      error: () => {
        // Silently ignore refresh failures to avoid UI interruptions.
      }
    });
  }

  private startProfileAutoRefresh(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.stopProfileAutoRefresh();

    if (!this.getToken()) {
      return;
    }

    this.profileRefreshSubscription = interval(this.PROFILE_REFRESH_INTERVAL_MS).subscribe(() => {
      this.refreshUserProfileFromServer();
    });
  }

  private stopProfileAutoRefresh(): void {
    this.profileRefreshSubscription?.unsubscribe();
    this.profileRefreshSubscription = null;
  }

// auth.service.ts
private carregarSessaoDoStorage(): void {
  if (!isPlatformBrowser(this.platformId)) return;

  const token = localStorage.getItem(this.TOKEN_KEY);
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log(payload);
      // CRÍTICO: Mapear 'picture_url' (do banco) para o objeto do Front
      this._usuario.set({
        name: payload.name,
        email: payload.sub,
        pictureUrl: payload.picture, // Pegando exatamente do token
        level: payload.level || 1,
        experiencia: payload.experiencia || 0,
        cargo: payload.cargo || 'Apprentice'
      });
    } catch (e) {
      console.error('Falha na integridade do token:', e);
      this.logout();
    }
  }
}
}