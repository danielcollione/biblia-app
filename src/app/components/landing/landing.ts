import { Component, effect, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VersionService } from '../../services/version/version-service';
import { Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class Landing implements OnInit {
  public ebookData = signal<any>(null);
  private readonly platformId = inject(PLATFORM_ID);

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

    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Quando a seção entra na tela, ativa os elementos com delay
            const elements = entry.target.querySelectorAll('.reveal-element');
            elements.forEach((el, index) => {
              setTimeout(() => {
                el.classList.add('active');
              }, index * 200); // Delay cascata entre os blocos
            });
          }
        });
      },
      { threshold: 0.2 },
    ); // Dispara quando 20% da seção estiver visível

    const target = document.querySelector('#reveal-trigger');
    if (target) observer.observe(target);
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

  irParaMateriais() {
    this.router.navigate(['/materials']);
  }

  abrirLeitor() {
    const stripeUrl = 'https://theunveiledbible.gumroad.com/l/bible-in-the-age-of-ai';
    window.open(stripeUrl, '_blank');
  }
}
