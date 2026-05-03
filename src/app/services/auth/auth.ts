import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, finalize } from 'rxjs';

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

  private _usuario = signal<Usuario | null>(null);
  private _isLoading = signal<boolean>(false); // Sinal para o Loading

  readonly usuario = computed(() => this._usuario());
  readonly isLoading = computed(() => this._isLoading());
  readonly estaAutenticado = computed(() => !!this._usuario());

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

  loginTradicional(email: string, senha: string): Observable<any> {
    this._isLoading.set(true);
    return this.http.post(`${this.apiUrl}/login`, { email, senha }).pipe(
      tap((res: any) => {
        if (res?.token) this.processarSucessoLogin(res.token);
      }),
      finalize(() => this._isLoading.set(false))
    );
  }

  cadastrarTradicional(nome: string, email: string, senha: string): Observable<any> {
    this._isLoading.set(true);
    return this.http.post(`${this.apiUrl}/register`, { nome, email, senha }).pipe(
      finalize(() => this._isLoading.set(false))
    );
  }

  logout(): void {
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
    }
    this.router.navigate(['/profile']);
  }

  private carregarSessaoDoStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this._usuario.set({
          name: payload.name,
          email: payload.email,
          pictureUrl: payload.pictureUrl, // Mapeamento corrigido conforme o print do banco
          level: payload.level || 1,
          experiencia: payload.experiencia || 0,
          cargo: payload.cargo || 'Apprentice'
        });
      } catch (e) {
        console.error('Erro no token:', e);
        this.logout();
      }
    }
  }
}