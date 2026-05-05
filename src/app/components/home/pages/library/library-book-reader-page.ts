import { CommonModule, Location } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  LibraryBookDto,
  LibraryChapterDto,
  LibraryChapterResponseDto,
  LibraryService,
} from '../../../../services/library/library.service';
import { VersionService } from '../../../../services/version/version-service';

@Component({
  selector: 'app-library-book-reader-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './library-book-reader-page.html',
  styleUrl: './library-book-reader-page.scss',
})
export class LibraryBookReaderPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly libraryService = inject(LibraryService);
  readonly versionService = inject(VersionService);
  readonly location = inject(Location);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;

  readonly book = signal<LibraryBookDto | null>(null);
  readonly chapters = signal<LibraryChapterDto[]>([]);
  readonly currentChapter = signal<LibraryChapterResponseDto | null>(null);
  readonly isLoading = signal(true);
  readonly isChapterTransitioning = signal(false);
  readonly chapterRevealKey = signal(0);
  readonly errorMessage = signal<string | null>(null);

  readonly currentChapterIndex = computed(() => {
    const chapterNumber = this.currentChapter()?.chapterNumber;
    if (!chapterNumber) {
      return -1;
    }

    return this.chapters().findIndex((chapter) => chapter.chapterOrder === chapterNumber);
  });

  readonly currentChapterHalf1 = computed(() => {
    const verses = this.currentChapter()?.verses ?? [];
    const half = Math.ceil(verses.length / 2);
    return verses.slice(0, half);
  });

  readonly currentChapterHalf2 = computed(() => {
    const verses = this.currentChapter()?.verses ?? [];
    const half = Math.ceil(verses.length / 2);
    return verses.slice(half);
  });

  ngOnInit(): void {
    const bookSlug = this.route.snapshot.paramMap.get('slug') ?? '';
    const chapterSlug = this.route.snapshot.paramMap.get('chapterSlug') ?? '';
    this.loadReader(bookSlug, chapterSlug);
  }

  private loadReader(bookSlug: string, chapterSlug: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.libraryService.getBookBySlug(bookSlug).subscribe({
      next: (book) => {
        this.book.set(book);
        this.loadChaptersAndCurrent(book.id, bookSlug, chapterSlug);
      },
      error: () => this.handleLoadError(),
    });
  }

  private loadChaptersAndCurrent(bookId: string, bookSlug: string, chapterSlug: string): void {
    this.libraryService.getBookChapters(bookSlug).subscribe({
      next: (chapters) => {
        const resolvedChapters = chapters ?? [];
        this.chapters.set(resolvedChapters);

        const targetChapter =
          resolvedChapters.find((chapter) => chapter.slug === chapterSlug) ??
          resolvedChapters[0] ??
          null;

        if (!targetChapter) {
          this.handleLoadError();
          return;
        }

        this.loadChapter(bookId, targetChapter.chapterOrder);
      },
      error: () => this.handleLoadError(),
    });
  }

  private loadChapter(bookId: string, chapterNumber: number): void {
    const shouldKeepBookOpen = this.currentChapter() !== null;

    if (shouldKeepBookOpen) {
      this.isChapterTransitioning.set(true);
    } else {
      this.isLoading.set(true);
    }

    this.libraryService.getChapter(bookId, chapterNumber).subscribe({
      next: (chapter) => {
        this.currentChapter.set(chapter);
        this.isLoading.set(false);
        this.isChapterTransitioning.set(false);
        this.chapterRevealKey.update((value) => value + 1);
        this.scrollToTop();
      },
      error: () => this.handleLoadError(),
    });
  }

  goPrevChapter(): void {
    const index = this.currentChapterIndex();
    if (index <= 0) {
      return;
    }

    const previousChapter = this.chapters()[index - 1];
    if (!previousChapter) {
      return;
    }

    this.navigateToChapter(previousChapter.slug);
  }

  goNextChapter(): void {
    const index = this.currentChapterIndex();
    const nextChapter = this.chapters()[index + 1];
    if (!nextChapter) {
      return;
    }

    this.navigateToChapter(nextChapter.slug);
  }

  goToSummary(): void {
    const bookSlug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.router.navigate(['/home/library', bookSlug]);
  }

  private navigateToChapter(chapterSlug: string): void {
    const bookSlug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.router.navigate(['/home/library', bookSlug, 'read', chapterSlug]).then((navigated) => {
      if (!navigated) {
        return;
      }

      const bookId = this.book()?.id;
      const chapter = this.chapters().find((item) => item.slug === chapterSlug);
      if (!bookId || !chapter) {
        return;
      }

      this.loadChapter(bookId, chapter.chapterOrder);
    });
  }

  private scrollToTop(): void {
    const container = this.scrollContainer?.nativeElement;
    if (container) {
      container.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      container.scrollTop = 0;
    }
  }

  private handleLoadError(): void {
    this.isLoading.set(false);
    this.isChapterTransitioning.set(false);
    this.errorMessage.set(this.versionService.ui().libraryChaptersLoadError);
  }
}
