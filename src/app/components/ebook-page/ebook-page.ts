import { Component, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { VersionService } from '../../services/version/version-service';

@Component({
  selector: 'app-ebook-page',
  templateUrl: './ebook-page.html',
  styleUrls: ['./ebook-page.scss']
})
export class EbookPage {
  public versionService = inject(VersionService);
  private httpClient = inject(HttpClient);
  private router = inject(Router);

  public ebookData = signal<any>(null);

  constructor() {
    effect(() => {
      const lang = this.versionService.languageCode();

      // Mapeia o nome exato do arquivo para evitar erro 404
      // Se você já renomeou o arquivo .pt para -pt, pode manter apenas a segunda opção.
      const fileName = lang === 'pt' ? 'bible-ia-info.pt.json' : `bible-ia-info-${lang}.json`;

      const url = `/e-book/${fileName}`;

      this.httpClient.get(url).subscribe({
        next: (data) => this.ebookData.set(data),
        error: (err) =>
          console.error(`Erro 404: Não foi possível achar o arquivo no caminho ${url}`, err),
      });
    });
  }

  voltarParaHome() {
    this.router.navigate(['/']); // Retorna para a Landing Page
  }

  irParaCheckout() {
    // Substitua pelo seu link de pagamento real do Stripe
    const stripeUrl = 'https://theunveiledbible.gumroad.com/l/bible-in-the-age-of-ai';
    window.open(stripeUrl, '_blank'); 
  }
}