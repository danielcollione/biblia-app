import { AfterViewInit, Component, ElementRef, Input } from '@angular/core';

export interface LivroInfo {
  nome: string;
  resumo: string;
  imagemUrl: string;
  corLombada?: string; // Opcional, caso queira cores diferentes (ex: Pentateuco, Profetas)
}

@Component({
  selector: 'app-lombada-livro',
  imports: [],
  templateUrl: './lombada-livro.html',
  styleUrl: './lombada-livro.scss',
})
export class LombadaLivro implements AfterViewInit{
// @Input avisa que esse dado virá "de fora"
  @Input({ required: true }) livro!: LivroInfo;

  isInvertida = false;

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    // Usamos um pequeno intervalo para garantir que o layout foi renderizado
    this.checkPosition();
    
    // Opcional: ouvir o scroll da estante para re-checar
    const estante = document.querySelector('.estante-horizontal');
    estante?.addEventListener('scroll', () => this.checkPosition());
  }

  checkPosition() {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const windowWidth = window.innerWidth;

    // Se o livro estiver a menos de 450px da borda direita, invertemos a modal
    // (450px é a largura da modal + margem do fio)
    this.isInvertida = (windowWidth - rect.right) < 450;
  }
}
