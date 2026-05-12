import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../services/auth/auth';
import { PrayerItemDto, PrayersService } from '../../../../services/prayers/prayers.service';
import { VersionService } from '../../../../services/version/version-service';
import { CreatePrayerModal } from './modal/create-prayer-modal';

type EmberParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
  hueShift: number;
};

@Component({
  selector: 'app-prayers-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CreatePrayerModal],
  templateUrl: './prayers-page.html',
  styleUrl: './prayers-page.scss'
})
export class PrayersPage implements AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly prayersService = inject(PrayersService);
  readonly versionService = inject(VersionService);
  private readonly isBrowser: boolean;
  private readonly embers: EmberParticle[] = [];
  private canvasContext: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private emberSpawnAccumulator = 0;
  private cleanupCallbacks: Array<() => void> = [];
  private lockedScrollContainer: HTMLElement | null = null;

  readonly prayers = signal<PrayerItemDto[]>([]);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly isModalOpen = signal(false);
  readonly flashMessage = signal<string | null>(null);
  readonly flashIsError = signal(false);
  readonly currentPage = signal(0);
  readonly hasMorePages = signal(true);

  @ViewChild('prayersShell') prayersShellRef!: ElementRef<HTMLElement>;
  @ViewChild('embersCanvas') embersCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('prayersBoard') prayersBoardRef?: ElementRef<HTMLElement>;

  constructor(
    private readonly ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.ngZone.runOutsideAngular(() => {
        this.setupCanvas();
        this.startAnimationLoop();
      });
    }

    this.loadPrayers();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.cleanupCallbacks.forEach((callback) => callback());
    this.cleanupCallbacks = [];
    this.unlockBackgroundScroll();
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

    this.isModalOpen.set(true);
    this.lockBackgroundScroll();
  }

  closeCreateModal(): void {
    this.isModalOpen.set(false);
    this.unlockBackgroundScroll();
  }

  onPrayerCreated(): void {
    this.closeCreateModal();
    this.showFlash(this.versionService.ui().prayersCreateSuccess, false);
    this.currentPage.set(0);
    this.loadPrayers();
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

onScroll(): void {
  if (!this.prayersBoardRef?.nativeElement) return;
  const el = this.prayersBoardRef.nativeElement;

  // Lógica de Scroll Infinito Vertical
  const threshold = 200; // pixels antes do fim para carregar
  const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;

  if (isAtBottom && this.hasMorePages() && !this.isLoadingMore() && !this.isLoading()) {
    this.loadMorePrayers();
  }
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

  private lockBackgroundScroll(): void {
    if (!this.isBrowser) {
      return;
    }

    const host = this.prayersShellRef?.nativeElement;
    const mainContainer = host?.closest('.home-main') as HTMLElement | null;

    if (mainContainer) {
      this.lockedScrollContainer = mainContainer;
      this.lockedScrollContainer.style.overflow = 'hidden';
      this.lockedScrollContainer.style.touchAction = 'none';
    }

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }

  private unlockBackgroundScroll(): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.lockedScrollContainer) {
      this.lockedScrollContainer.style.overflow = '';
      this.lockedScrollContainer.style.touchAction = '';
      this.lockedScrollContainer = null;
    }

    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }

  private setupCanvas(): void {
    const canvas = this.embersCanvasRef.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    this.canvasContext = context;
    this.resizeCanvas();

    const resizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', resizeHandler, { passive: true });
    this.cleanupCallbacks.push(() => window.removeEventListener('resize', resizeHandler));
  }

  private resizeCanvas(): void {
    const canvas = this.embersCanvasRef.nativeElement;
    const shell = this.prayersShellRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const width = shell.clientWidth;
    const height = shell.clientHeight;

    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    if (this.canvasContext) {
      this.canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private startAnimationLoop(): void {
    const frame = () => {
      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(frame);
    };

    frame();
  }

  private renderFrame(): void {
    if (!this.canvasContext) {
      return;
    }

    const canvas = this.embersCanvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const context = this.canvasContext;
    const now = performance.now();
    const deltaSeconds = this.lastFrameTime > 0 ? Math.min(0.05, (now - this.lastFrameTime) / 1000) : 0.016;
    this.lastFrameTime = now;

    context.clearRect(0, 0, width, height);
    this.spawnAmbientEmbers(width, height, deltaSeconds);

    for (let index = this.embers.length - 1; index >= 0; index -= 1) {
      const ember = this.embers[index];
      ember.life += 1;

      if (ember.life >= ember.maxLife) {
        this.embers.splice(index, 1);
        continue;
      }

      ember.x += ember.vx;
      ember.y += ember.vy;
      ember.vx = ember.vx * 0.996 + Math.sin((ember.life + ember.hueShift) * 0.035) * 0.003;
      ember.vy = ember.vy * 0.995 + 0.0018;

      const lifeProgress = ember.life / ember.maxLife;
      const fade = 1 - lifeProgress;
      const twinkle = 0.94 + Math.sin(ember.life * 0.18 + ember.hueShift) * 0.06;
      const alpha = ember.alpha * fade * twinkle;
      const radius = ember.size * (0.82 + fade * 0.35);

      this.drawEmber(ember.x, ember.y, radius, alpha);
    }
  }

  private spawnAmbientEmbers(width: number, height: number, deltaSeconds: number): void {
    const spawnPerSecond = Math.max(10, width / 90);
    this.emberSpawnAccumulator += spawnPerSecond * deltaSeconds;
    const spawnCount = Math.floor(this.emberSpawnAccumulator);

    if (spawnCount <= 0) {
      return;
    }

    this.emberSpawnAccumulator -= spawnCount;

    for (let index = 0; index < spawnCount; index += 1) {
      const spawnFromBottom = Math.random() < 0.35;

      this.embers.push({
        x: Math.random() * width,
        y: spawnFromBottom ? height + Math.random() * 20 : Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(0.42 + Math.random() * 0.85),
        life: 0,
        maxLife: 78 + Math.random() * 92,
        size: 0.45 + Math.random() * 1.05,
        alpha: 0.08 + Math.random() * 0.17,
        hueShift: Math.random() * 14,
      });
    }

    if (this.embers.length > 260) {
      this.embers.splice(0, this.embers.length - 260);
    }
  }

  private drawEmber(x: number, y: number, radius: number, alpha: number): void {
    if (!this.canvasContext) {
      return;
    }

    const context = this.canvasContext;
    const finalAlpha = Math.min(0.65, alpha);
    const glowRadius = radius * 2.4;

    context.beginPath();
    context.fillStyle = `rgba(255, 136, 46, ${finalAlpha * 0.26})`;
    context.arc(x, y, glowRadius, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.fillStyle = `rgba(255, 200, 120, ${finalAlpha})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}