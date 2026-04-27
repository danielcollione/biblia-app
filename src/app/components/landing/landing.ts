import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { VersionService } from '../../services/version/version-service';
import { Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  public ebookData = signal<any>(null);

  constructor(
    public versionService: VersionService,
    private router: Router,
    private titleService: Title,
    private metaService: Meta,
    private httpClient: HttpClient,
  ) {
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

  ngOnInit() {
    this.setSeoTags();
  }

  setSeoTags() {
    // Título focado em Keywords Internacionais
    this.titleService.setTitle('A Bíblia Revelada | Estudos Bíblicos Imersivos');

    // Descrição em inglês para o Google Global
    this.metaService.updateTag({
      name: 'description',
      content:
        'Uma jornada cinematográfica além das escrituras. Explore estudos bíblicos profundos, insights arqueológicos e contextos históricos antigos com uma experiência digital premium.',
    });

    // Open Graph (Facebook, LinkedIn, WhatsApp)
    this.metaService.updateTag({
      property: 'og:title',
      content: 'A Bíblia Revelada - Jornada Além das Escrituras',
    });
    this.metaService.updateTag({
      property: 'og:description',
      content: 'Revele os mistérios de manuscritos antigos e exegese histórica.',
    });
    this.metaService.updateTag({
      property: 'og:image',
      content: 'assets/images/og-main-english.jpg',
    });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });

    // Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: 'A Bíblia Revelada' });
  }

  irParaBiblia() {
    this.router.navigate(['/read']);
  }

  irParaBlog() {
    this.router.navigate(['/blog']);
  }

  abrirLeitor() {
    // Substitua pelo seu link de pagamento real do Stripe
    const stripeUrl = 'https://pay.hotmart.com/L105521057X';
    window.open(stripeUrl, '_blank');
  }
}
