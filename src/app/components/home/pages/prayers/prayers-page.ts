import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../services/auth/auth';
import { PrayerItemDto, PrayersService } from '../../../../services/prayers/prayers.service';
import { VersionService } from '../../../../services/version/version-service';

type PositionedPrayer = PrayerItemDto & {
  x: number;
  y: number;
  localLiked: boolean;
};

type DragState = {
  prayerId: string;
  offsetX: number;
  offsetY: number;
};

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

  @ViewChild('board') private boardRef?: ElementRef<HTMLDivElement>;

  readonly prayers = signal<PositionedPrayer[]>([]);
  readonly isLoading = signal(true);
  readonly isRefreshing = signal(false);
  readonly isSubmitting = signal(false);
  readonly isModalOpen = signal(false);
  readonly newPrayerContent = signal('');
  readonly modalError = signal<string | null>(null);
  readonly flashMessage = signal<string | null>(null);
  readonly flashIsError = signal(false);
  readonly boardHeight = signal(720);

  private dragState: DragState | null = null;

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
          this.loadPrayers(true);
        },
        error: (error) => {
          this.modalError.set(this.resolveHttpError(error, this.versionService.ui().prayersCreateError));
        }
      });
  }

  refreshPrayers(): void {
    this.loadPrayers(true);
  }

  toggleLike(prayer: PositionedPrayer, event?: Event): void {
    event?.stopPropagation();

    if (!this.hasActiveSubscription()) {
      this.showFlash(this.versionService.ui().prayersPremiumRequired, true);
      return;
    }

    this.prayersService.toggleLike(prayer.id).subscribe({
      next: (updated) => {
        this.prayers.update((items) => items.map((item) => item.id === prayer.id
          ? { ...item, likesCount: updated.likesCount, localLiked: !item.localLiked }
          : item));
      },
      error: (error) => {
        this.showFlash(this.resolveHttpError(error, this.versionService.ui().prayersLikeError), true);
      }
    });
  }

  startDrag(event: PointerEvent, prayerId: string): void {
    const board = this.boardRef?.nativeElement;
    const prayer = this.prayers().find((item) => item.id === prayerId);
    if (!board || !prayer) {
      return;
    }

    const rect = board.getBoundingClientRect();
    this.dragState = {
      prayerId,
      offsetX: event.clientX - rect.left - prayer.x,
      offsetY: event.clientY - rect.top - prayer.y,
    };

    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.dragState || !this.boardRef?.nativeElement) {
      return;
    }

    const board = this.boardRef.nativeElement;
    const rect = board.getBoundingClientRect();
    const maxX = Math.max(0, rect.width - this.resolveBalloonWidth(rect.width));
    const maxY = Math.max(0, rect.height - 210);
    const x = this.clamp(event.clientX - rect.left - this.dragState.offsetX, 0, maxX);
    const y = this.clamp(event.clientY - rect.top - this.dragState.offsetY, 0, maxY);

    this.prayers.update((items) => items.map((item) => item.id === this.dragState?.prayerId ? { ...item, x, y } : item));
  }

  @HostListener('document:pointerup')
  onPointerUp(): void {
    this.dragState = null;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.positionPrayers(false);
  }

  balloonTransform(prayer: PositionedPrayer): string {
    return `translate(${prayer.x}px, ${prayer.y}px)`;
  }

  clearFlash(): void {
    this.flashMessage.set(null);
  }

  private loadPrayers(background = false): void {
    if (background) {
      this.isRefreshing.set(true);
    } else {
      this.isLoading.set(true);
    }

    this.prayersService.list(0, 36)
      .pipe(finalize(() => {
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }))
      .subscribe({
        next: (page) => {
          this.prayers.set(page.content.map((item) => ({ ...item, x: 0, y: 0, localLiked: false })));
          setTimeout(() => this.positionPrayers(true));
        },
        error: (error) => {
          this.showFlash(this.resolveHttpError(error, this.versionService.ui().prayersLoadError), true);
        }
      });
  }

  private positionPrayers(withJitter: boolean): void {
    const board = this.boardRef?.nativeElement;
    if (!board) {
      return;
    }

    const width = board.clientWidth || 960;
    const balloonWidth = this.resolveBalloonWidth(width);
    const columns = Math.max(1, Math.floor(width / (balloonWidth + 24)));
    const gap = 24;
    const columnWidth = balloonWidth + gap;

    this.prayers.update((items) => items.map((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const jitterX = withJitter ? ((index % 2 === 0 ? 1 : -1) * ((index * 9) % 18)) : 0;
      const jitterY = withJitter ? ((index * 7) % 20) : 0;

      return {
        ...item,
        x: this.clamp(column * columnWidth + jitterX, 0, Math.max(0, width - balloonWidth)),
        y: Math.max(0, row * 228 + jitterY),
      };
    }));

    const rows = Math.max(1, Math.ceil(this.prayers().length / columns));
    this.boardHeight.set(Math.max(560, rows * 228 + 60));
  }

  private resolveBalloonWidth(boardWidth: number): number {
    if (boardWidth < 520) {
      return Math.max(250, boardWidth - 24);
    }

    return 280;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
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
