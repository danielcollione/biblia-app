import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { BibleService } from '../../services/bible';
import { LombadaLivro } from './lombada-livro/lombada-livro';
import { VersionService } from '../../services/version/version-service';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-leitor',
  standalone: true,
  templateUrl: './leitor.html',
  styleUrl: './leitor.scss',
  imports: [LombadaLivro],
})
export class Leitor implements OnInit {
  titleService = inject(Title);
  metaService = inject(Meta);
  bibleService = inject(BibleService);
  @ViewChild('estanteLivros') estanteLivros!: ElementRef;

  constructor(public versionService: VersionService) {}

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  getColor(index: number): string {
    const colors = ['#5c1a1a', '#1a2a3a', '#2d3a1a', '#4a3728'];
    return colors[index % 4]; // Isso replica o seu nth-child(4n + x)
  }

  ngOnInit() {
    setTimeout(() => {
      const book = 'Gênesis';
      const cap = 0;
      this.bibleService.loadChapter(book, cap);
      this.updateSEO(book, cap); // Atualiza no início
    }, 500);
  }

  scrollEstante(offset: number) {
    this.estanteLivros.nativeElement.scrollBy({
      left: offset,
      behavior: 'smooth',
    });
  }

  prevChapter() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = 0;
      this.bibleService.prevChapter();
      this.updateSEO(
        this.bibleService.selectedBook()?.name,
        this.bibleService.currentChapterIndex()!,
      );
    }
  }

  nextChapter() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = 0;
      this.bibleService.nextChapter();
      this.updateSEO(
        this.bibleService.selectedBook()?.name,
        this.bibleService.currentChapterIndex()!,
      );
    }
  }

  updateSEO(bookName: string, chapter: number) {
    const displayTitle = `${bookName} ${chapter + 1} | The Unveiled Bible`;

    // Atualiza o Título da Aba
    this.titleService.setTitle(displayTitle);

    // Meta Tags em Inglês para Indexação Global
    this.metaService.updateTag({
      name: 'description',
      content: `Read and study ${bookName}, Chapter ${chapter + 1} online. Explore the historical context and deep spiritual insights of the Holy Scriptures on The Unveiled Bible.`,
    });

    // Open Graph (Redes Sociais)
    this.metaService.updateTag({ property: 'og:title', content: displayTitle });
    this.metaService.updateTag({
      property: 'og:description',
      content: `Immersive reading of ${bookName} ${chapter + 1}.`,
    });
    this.injectJSONLD(bookName, chapter);
  }

  injectJSONLD(book: string, chapter: number) {
    const script = document.getElementById('bible-jsonld') || document.createElement('script');
    script.id = 'bible-jsonld';
    (script as HTMLScriptElement).type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: 'The Holy Bible',
      abstract: `Reading ${book} chapter ${chapter + 1}`,
      publisher: {
        '@type': 'Organization',
        name: 'The Unveiled Bible',
      },
    });
    if (!document.getElementById('bible-jsonld')) {
      document.head.appendChild(script);
    }
  }
}
