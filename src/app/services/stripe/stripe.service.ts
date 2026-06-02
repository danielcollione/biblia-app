import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StripeService {

  // Altere para a URL real do seu back-end no Render
  private readonly API_URL = 'https://backend-tub-256195900392.us-east1.run.app/api/pagamentos';

  constructor(private http: HttpClient) { }

  /**
   * Solicita ao back-end a criação de uma sessão de checkout.
   * @param userId O ID do usuário logado (UUID).
   * @returns Um Observable com o objeto contendo a URL do Stripe.
   */
  iniciarCheckout(userId: string): Observable<{ url: string }> {
    // Note que passamos o userId como parâmetro na URL (?userId=...)
    // conforme o seu PagamentoController espera.
    return this.http.post<{ url: string }>(`${this.API_URL}/checkout?userId=${userId}`, {});
  }

  cancelarAssinaturaAgora(): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(`${this.API_URL}/cancelar`, {});
  }
}