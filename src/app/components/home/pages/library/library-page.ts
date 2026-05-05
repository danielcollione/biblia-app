import { AfterViewInit, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LibraryService } from '../../../../services/library/library.service';
import { BibleService } from '../../../../services/bible';
import { VersionService } from '../../../../services/version/version-service';

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './library-page.html',
  styleUrl: './library-page.scss'
})
export class LibraryPage implements AfterViewInit {
  @ViewChild('catalogRail') private catalogRailRef?: ElementRef<HTMLDivElement>;
  @ViewChild('estanteLivros') private estanteLivrosRef?: ElementRef<HTMLDivElement>;

  private readonly libraryService = inject(LibraryService);
  readonly bibleService = inject(BibleService);
  readonly versionService = inject(VersionService);

  readonly books = signal<LibraryBookCard[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.libraryService.listBooks().subscribe({
      next: (books) => {
        this.books.set(
          (books ?? []).map((book, index) => ({
            ...book,
            coverUrl: this.libraryService.resolveCoverUrl(book.coverImage),
            categoryLabel: this.prettyCategory(book.category),
            authorLabel: this.prettyAuthor(book.author),
            accessBadge: book.premium ? 'Premium' : 'Acesso Livre',
            levelBadge: `Nivel ${Math.max(1, book.requiredLevel ?? 1)}`,
            enterDelayMs: Math.min(index * 70, 560),
          }))
        );
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.resolveError(error));
      }
    });
  }

  scrollCatalog(direction: -1 | 1): void {
    const rail = this.catalogRailRef?.nativeElement;
    if (!rail) {
      return;
    }

    const distance = Math.max(240, Math.floor(rail.clientWidth * 0.78));
    rail.scrollBy({ left: direction * distance, behavior: 'smooth' });
  }

  scrollBibleCatalog(direction: -1 | 1): void {
    const estante = this.estanteLivrosRef?.nativeElement;
    if (!estante) {
      return;
    }

    const distance = Math.max(220, Math.floor(estante.clientWidth * 0.78));
    estante.scrollBy({ left: direction * distance, behavior: 'smooth' });
  }

  isBibleNewTestament(bookName: string): boolean {
    return this.bibleService.isNovoTestamento(bookName);
  }

  bibleTestamentLabel(bookName: string): string {
    return this.isBibleNewTestament(bookName) ? 'Novo Testamento' : 'Velho Testamento';
  }

  onBibleCoverError(event: Event): void {
    const imageElement = event.target as HTMLImageElement | null;
    if (!imageElement) {
      return;
    }

    if (!imageElement.src.endsWith('/images/default-book.webp')) {
      imageElement.src = 'images/default-book.webp';
    }
  }

  onCoverError(event: Event): void {
    const imageElement = event.target as HTMLImageElement | null;
    if (!imageElement) {
      return;
    }

    const fallback = this.libraryService.resolveCoverUrl('covers/enoch.webp');
    if (imageElement.src !== fallback) {
      imageElement.src = fallback;
    }
  }

  private prettyCategory(category: string | null | undefined): string {
    if (!category?.trim()) {
      return 'General';
    }

    return category
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private prettyAuthor(author: string | null | undefined): string {
    if (!author?.trim()) {
      return 'Autor desconhecido';
    }

    if (author.trim().toLowerCase() === 'unknown') {
      return 'Autor desconhecido';
    }

    return author.trim();
  }

  private resolveError(error: { status?: number; error?: { message?: string } | string }): string {
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error?.error === 'object' && error.error?.message) {
      return error.error.message;
    }

    if (error?.status === 403) {
      return 'Sua sessao expirou. Entre novamente para acessar o catalogo.';
    }

    return 'Nao foi possivel carregar os livros agora.';
  }
}

type LibraryBookCard = {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  coverImage: string | null;
  premium: boolean;
  requiredLevel: number;
  chaptersCount: number;
  coverUrl: string;
  categoryLabel: string;
  authorLabel: string;
  accessBadge: string;
  levelBadge: string;
  enterDelayMs: number;
};
