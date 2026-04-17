import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { BibleService } from '../../services/bible';

@Component({
  selector: 'app-leitor',
  standalone: true,
  templateUrl: './leitor.html',
  styleUrl: './leitor.scss',
})
export class Leitor implements OnInit {
  bibleService = inject(BibleService);
  @ViewChild('estanteLivros') estanteLivros!: ElementRef;

  ngOnInit() {
    setTimeout(() => {
      this.bibleService.loadChapter('Gênesis', 0);
    }, 500);
  }

  scrollEstante(offset: number) {
    this.estanteLivros.nativeElement.scrollBy({
      left: offset,
      behavior: 'smooth',
    });
  }
}
