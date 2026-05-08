import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { LibraryBookDto, LibraryChapterDto, LibraryService } from '../../../../services/library/library.service';
import { VersionService } from '../../../../services/version/version-service';

@Component({
  selector: 'app-library-book-chapters-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './library-book-chapters-page.html',
  styleUrl: './library-book-chapters-page.scss',
})
export class LibraryBookChaptersPage implements OnInit {
  @ViewChild('estanteCaps') private estanteCapsRef?: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly libraryService = inject(LibraryService);
  readonly versionService = inject(VersionService);

  readonly book = signal<LibraryBookDto | null>(null);
  readonly chapters = signal<LibraryChapterDto[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.loadBook(slug);
  }

  private loadBook(slug: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.libraryService.getBookBySlug(slug).subscribe({
      next: (book) => {
        this.book.set(book);
        this.loadChapters(slug);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set(this.versionService.ui().libraryChaptersLoadError);
      },
    });
  }

  private loadChapters(slug: string): void {
    this.libraryService.getBookChapters(slug).subscribe({
      next: (chapters) => {
        this.chapters.set(chapters ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set(this.versionService.ui().libraryChaptersLoadError);
      },
    });
  }

  openChapter(chapter: LibraryChapterDto): void {
    const bookSlug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.router.navigate(['/home/library', bookSlug, 'read', chapter.slug]);
  }

  goBack(): void {
    this.router.navigate(['/home/library']);
  }

  scrollChapters(direction: -1 | 1): void {
    const el = this.estanteCapsRef?.nativeElement;
    if (!el) return;
    const distance = Math.max(240, Math.floor(el.clientWidth * 0.78));
    el.scrollBy({ left: direction * distance, behavior: 'smooth' });
  }
}
