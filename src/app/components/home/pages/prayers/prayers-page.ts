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
  readonly maxPrayerLength = 280;

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

  readonly remainingCharacters = computed(() => Math.max(0, this.maxPrayerLength - this.newPrayerContent().length));
  readonly canSubmitPrayer = computed(() => {
    const contentLength = this.newPrayerContent().trim().length;
    return this.hasActiveSubscription() && contentLength > 0 && contentLength <= this.maxPrayerLength;
  });

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
    this.newPrayerContent.set(this.sanitizePrayerContent(content));
  }

  submitPrayer(): void {
    if (!this.canSubmitPrayer()) {
      if (!this.hasActiveSubscription()) {
        this.modalError.set(this.versionService.ui().prayersPremiumRequired);
      }
      return;
    }

    const contentToSend = this.sanitizePrayerContent(this.newPrayerContent()).trim();
    this.newPrayerContent.set(contentToSend);

    if (!contentToSend.length) {
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set(null);

    this.prayersService.create(contentToSend)
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

  canDeletePrayer(): boolean {
    const user = this.authService.usuario();
    if (!user) {
      return false;
    }

    const isLifetime = user.subscriptionType === 'LIFETIME';
    return isLifetime && this.hasActiveSubscription();
  }

  deletePrayer(prayer: PrayerItemDto, event?: Event): void {
    event?.stopPropagation();

    if (!this.canDeletePrayer()) {
      this.showFlash('Only LIFETIME users can delete prayers.', true);
      return;
    }

    this.prayersService.delete(prayer.id).subscribe({
      next: () => {
        this.prayers.update(items => items.filter(item => item.id !== prayer.id));
        this.showFlash('Prayer deleted successfully.', false);
      },
      error: (error) => {
        this.showFlash(this.resolveHttpError(error, 'Unable to delete this prayer right now.'), true);
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

  private sanitizePrayerContent(content: string): string {
    return (content ?? '').slice(0, this.maxPrayerLength);
  }
}
