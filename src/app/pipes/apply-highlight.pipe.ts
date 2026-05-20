import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { VerseHighlight } from '../services/annotation/annotation.service';

@Pipe({
  name: 'applyHighlight',
  standalone: true,
})
export class ApplyHighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(verseText: string, verseNumber: number, highlights: VerseHighlight[]): SafeHtml {
    if (!highlights || highlights.length === 0) return verseText;

    // Filtra apenas os grifos que pertencem a este versículo específico
    const verseHighlights = highlights.filter((h) => h.verseNumber === verseNumber);

    if (verseHighlights.length === 0) return verseText;

    // TRUQUE DE MESTRE: Ordenar os grifos de trás para frente (maior índice primeiro).
    // Se inserirmos HTML no começo da string, os índices do final mudam de lugar e quebra tudo.
    verseHighlights.sort((a, b) => b.startIndex - a.startIndex);

    let result = verseText;

    for (const h of verseHighlights) {
      const start = Math.max(0, h.startIndex);
      const end = Math.min(result.length, h.endIndex);

      const before = result.substring(0, start);
      const highlightedText = result.substring(start, end);
      const after = result.substring(end);

      // Envolve o texto grifado com a tag <mark> do HTML nativo
      // Substitua a linha result = `${before}<mark...` por esta:
      result = `${before}<mark class="grifo-suave" style="--cor-fundo: ${h.colorHex || '#FFFF00'};">${highlightedText}</mark>${after}`;
    }

    // Diz ao Angular que este HTML é seguro para ser renderizado
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }
}
