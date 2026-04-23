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
    this.titleService.setTitle('The Unveiled Bible | Immersive Biblical Studies');

    // Descrição em inglês para o Google Global
    this.metaService.updateTag({
      name: 'description',
      content:
        'A cinematic journey beyond the scripture. Explore deep biblical studies, archaeological insights, and ancient historical contexts with a premium digital experience.',
    });

    // Open Graph (Facebook, LinkedIn, WhatsApp)
    this.metaService.updateTag({
      property: 'og:title',
      content: 'The Unveiled Bible - Journey Beyond the Writing',
    });
    this.metaService.updateTag({
      property: 'og:description',
      content: 'Unveil the mysteries of ancient manuscripts and historical exegesis.',
    });
    this.metaService.updateTag({
      property: 'og:image',
      content: 'assets/images/og-main-english.jpg',
    });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });

    // Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: 'The Unveiled Bible' });
  }

  irParaBiblia() {
    this.router.navigate(['/read']);
  }

  irParaBlog() {
    this.router.navigate(['/blog']);
  }

  abrirLeitor() {
    this.router.navigate(['/ebook-page']);
  }
}
