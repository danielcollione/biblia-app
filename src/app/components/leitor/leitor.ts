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
    }
  }

  nextChapter() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = 0;
      this.bibleService.nextChapter();
    }
  }

  updateSEO(bookName: string, chapter: number) {
    const displayTitle = `Holy Bible | The Unveiled Bible`;

    // Atualiza o Título da Aba
    this.titleService.setTitle(displayTitle);
  }
}
