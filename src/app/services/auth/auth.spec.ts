import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // A sua URL oficial hospedada no Render!
  private apiUrl = 'https://backendtub.onrender.com/api/v1/auth';

  constructor(private http: HttpClient) { }

  // 1. Fluxo do Google (Serve magicamente tanto para Login quanto para Cadastro)
  loginComGoogle(googleToken: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/google`, { token: googleToken }, { responseType: 'text' }).pipe(
      tap(jwt => this.salvarTokenLocal(jwt))
    );
  }

  // 2. Fluxo Tradicional: Login
  loginTradicional(email: string, senha: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, senha }).pipe(
      tap((res: any) => {
        // Supondo que seu back-end retorne um JSON { "token": "..." }
        if (res && res.token) {
          this.salvarTokenLocal(res.token);
        }
      })
    );
  }

  // 3. Fluxo Tradicional: Cadastro
  cadastrarTradicional(nome: string, email: string, senha: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { nome, email, senha });
  }

  // Lógica de armazenamento
  private salvarTokenLocal(token: string) {
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}