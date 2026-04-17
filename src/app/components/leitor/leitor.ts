import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { BibleService } from '../../services/bible';
import { LivroInfo, LombadaLivro } from './lombada-livro/lombada-livro';

@Component({
  selector: 'app-leitor',
  standalone: true,
  templateUrl: './leitor.html',
  styleUrl: './leitor.scss',
  imports: [LombadaLivro],
})
export class Leitor implements OnInit {
  bibleService = inject(BibleService);
  @ViewChild('estanteLivros') estanteLivros!: ElementRef;

  livroTeste: LivroInfo = {
    nome: 'JOSUÉ',
    resumo:
      'A conquista da Terra Prometida sob a liderança do sucessor de Moisés, marcada por fé e estratégia militar.',
    imagemUrl: 'https://via.placeholder.com/200x120/222/e5c07b?text=Cena+de+Josue',
    corLombada: '#5e2129', // Exemplo de cor específica
  };

  getColor(index: number): string {
    const colors = ['#5c1a1a', '#1a2a3a', '#2d3a1a', '#4a3728'];
    return colors[index % 4]; // Isso replica o seu nth-child(4n + x)
  }

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
