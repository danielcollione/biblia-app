import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { BibleService } from '../../../../services/bible';
import { VersionService } from '../../../../services/version/version-service';
import { LombadaLivro } from '../../../leitor/lombada-livro/lombada-livro';

@Component({
  selector: 'app-library-bible-selector-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LombadaLivro],
  templateUrl: './library-bible-selector-page.html',
  styleUrl: './library-bible-selector-page.scss'
})
export class LibraryBibleSelectorPage {
  @ViewChild('estanteLivros') private estanteLivrosRef?: ElementRef<HTMLDivElement>;
  @ViewChild('estanteCaps') private estanteCapsRef?: ElementRef<HTMLDivElement>;

  readonly bibleService = inject(BibleService);
  readonly versionService = inject(VersionService);
  private readonly router = inject(Router);

  scrollEstante(offset: number): void {
    this.estanteLivrosRef?.nativeElement.scrollBy({
      left: offset,
      behavior: 'smooth',
    });
  }

  scrollCapitulos(offset: number): void {
    this.estanteCapsRef?.nativeElement.scrollBy({
      left: offset,
      behavior: 'smooth',
    });
  }

  selectChapter(index: number): void {
    this.bibleService.selectChapter(index);
    this.router.navigate(['/read']);
  }

  goBackToLibraryHome(): void {
    this.bibleService.resetNavigation();
    this.router.navigate(['/home/library']);
  }
}
