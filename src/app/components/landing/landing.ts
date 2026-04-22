import { Component, OnInit } from '@angular/core';
import { VersionService } from '../../services/version/version-service';
import { Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  constructor(
    public versionService: VersionService,
    private router: Router,
    private titleService: Title,
    private metaService: Meta,
  ) {}

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
}
