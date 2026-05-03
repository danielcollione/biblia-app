import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface Usuario {
  name: string;
  email: string;
  picture?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  
  private readonly apiUrl = '/api/v1/auth';
  private readonly TOKEN_KEY = 'auth_token';

  // Estado reativo para UI (Signals)
  private _usuario = signal<Usuario | null>(null);
  readonly usuario = computed(() => this._usuario());
  readonly estaAutenticado = computed(() => !!this._usuario());

  constructor() {
    // Inicializa a sessão apenas se estiver rodando no Navegador
    if (isPlatformBrowser(this.platformId)) {
      this.carregarSessaoDoStorage();
    }
  }

  // 1. Fluxo Google
  loginComGoogle(googleToken: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/google`, { token: googleToken }, { responseType: 'text' }).pipe(
      tap(jwt => this.processarSucessoLogin(jwt))
    );
  }

  // 2. Login Tradicional
  loginTradicional(email: string, senha: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, senha }).pipe(
      tap((res: any) => {
        if (res?.token) this.processarSucessoLogin(res.token);
      })
    );
  }

  // 3. Cadastro Tradicional (O método que estava faltando)
  cadastrarTradicional(nome: string, email: string, senha: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { nome, email, senha });
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
    this.router.navigate(['/perfil']);
  }

  private carregarSessaoDoStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      try {
        // Decodifica o payload do JWT (nome, email, foto)
        const payload = JSON.parse(atob(token.split('.')[1]));
        this._usuario.set({
          name: payload.name,
          email: payload.email,
          picture: payload.picture
        });
      } catch (e) {
        console.error('Erro ao decodificar token:', e);
        this.logout();
      }
    }
  }
}