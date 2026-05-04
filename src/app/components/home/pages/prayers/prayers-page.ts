import { AfterViewInit, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../services/auth/auth';
import { PrayerItemDto, PrayersService } from '../../../../services/prayers/prayers.service';
import { VersionService } from '../../../../services/version/version-service';

@Component({
  selector: 'app-prayers-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './prayers-page.html',
  styleUrl: './prayers-page.scss'
})
export class PrayersPage implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly prayersService = inject(PrayersService);
  readonly versionService = inject(VersionService);

  readonly prayers = signal<PrayerItemDto[]>([]);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly isSubmitting = signal(false);
  readonly isModalOpen = signal(false);
  readonly newPrayerContent = signal('');
  readonly modalError = signal<string | null>(null);
  readonly flashMessage = signal<string | null>(null);
  readonly flashIsError = signal(false);
  readonly currentPage = signal(0);
  readonly hasMorePages = signal(true);

  readonly remainingCharacters = computed(() => 280 - this.newPrayerContent().length);
  readonly canSubmitPrayer = computed(() => this.hasActiveSubscription() && this.newPrayerContent().trim().length > 0);

  ngAfterViewInit(): void {
    this.loadPrayers();
  }

  hasActiveSubscription(): boolean {
    const user = this.authService.usuario();
    if (!user?.subscriptionActive || !user.subscriptionExpiresAt) {
      return false;
    }

    const expiresAt = new Date(user.subscriptionExpiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  openCreateModal(): void {
    if (!this.hasActiveSubscription()) {
      this.showFlash(this.versionService.ui().prayersPremiumRequired, true);
      return;
    }

    this.newPrayerContent.set('');
    this.modalError.set(null);
    this.isModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isModalOpen.set(false);
    this.newPrayerContent.set('');
    this.modalError.set(null);
  }

  updatePrayerContent(content: string): void {
    this.newPrayerContent.set(content.slice(0, 280));
  }

  submitPrayer(): void {
    if (!this.canSubmitPrayer()) {
      if (!this.hasActiveSubscription()) {
        this.modalError.set(this.versionService.ui().prayersPremiumRequired);
      }
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set(null);

    this.prayersService.create(this.newPrayerContent().trim())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.closeCreateModal();
          this.showFlash(this.versionService.ui().prayersCreateSuccess, false);
          this.currentPage.set(0);
          this.loadPrayers();
        },
        error: (error) => {
          this.modalError.set(this.resolveHttpError(error, this.versionService.ui().prayersCreateError));
        }
      });
  }

  refreshPrayers(): void {
    this.currentPage.set(0);
    this.loadPrayers();
  }

  loadMorePrayers(): void {
    if (this.isLoadingMore() || !this.hasMorePages()) {
      return;
    }

    this.isLoadingMore.set(true);
    const nextPage = this.currentPage() + 1;

    this.prayersService.list(nextPage, 10)
      .pipe(finalize(() => this.isLoadingMore.set(false)))
      .subscribe({
        next: (page) => {
          this.prayers.update(items => [...items, ...page.content]);
          this.currentPage.set(nextPage);
          this.hasMorePages.set(!page.last);
        },
        error: (error) => {
          this.showFlash(this.resolveHttpError(error, this.versionService.ui().prayersLoadError), true);
        }
      });
  }

  toggleLike(prayer: PrayerItemDto, event?: Event): void {
    event?.stopPropagation();

    if (!this.hasActiveSubscription()) {
      this.showFlash(this.versionService.ui().prayersPremiumRequired, true);
      return;
    }

    this.prayersService.toggleLike(prayer.id).subscribe({
      next: (updated) => {
        this.prayers.update((items) => items.map((item) => item.id === prayer.id
          ? { ...item, likesCount: updated.likesCount, likedByCurrentUser: !item.likedByCurrentUser }
          : item));
      },
      error: (error) => {
        this.showFlash(this.resolveHttpError(error, this.versionService.ui().prayersLikeError), true);
      }
    });
  }

  clearFlash(): void {
    this.flashMessage.set(null);
  }

  private loadPrayers(): void {
    this.isLoading.set(true);

    this.prayersService.list(0, 10)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (page) => {
          this.prayers.set(page.content);
          this.currentPage.set(0);
          this.hasMorePages.set(!page.last);
        },
        error: (error) => {
          this.showFlash(this.resolveHttpError(error, this.versionService.ui().prayersLoadError), true);
        }
      });
  }

  private resolveHttpError(error: { status?: number; error?: { message?: string } | string }, fallback: string): string {
    if (error?.status === 403) {
      return this.versionService.ui().prayersPremiumRequired;
    }

    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error?.error === 'object' && error.error?.message) {
      return error.error.message;
    }

    return fallback;
  }

  private showFlash(message: string, isError: boolean): void {
    this.flashMessage.set(message);
    this.flashIsError.set(isError);
  }
}
