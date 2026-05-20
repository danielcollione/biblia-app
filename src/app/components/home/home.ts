import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth';
import { BibleService } from '../../services/bible';
import { BibleVersion, VersionService } from '../../services/version/version-service';
import { XpPopupService } from '../../services/xp-popup.service';
import { StripeService } from '../../services/stripe/stripe.service';

type HomeMenuKey =
  | 'outlines'
  | 'sage'
  | 'liturgy'
  | 'library'
  | 'blog'
  | 'quiz'
  | 'prayers'
  | 'recommendations'
  | 'ranking';

type HomeMenuItem = {
  key: HomeMenuKey;
  route: string;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly bibleService = inject(BibleService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly xpPopupService = inject(XpPopupService);
  private readonly stripeService = inject(StripeService);
  public readonly versionService = inject(VersionService);
  // Must match backend UserRank.requiredXp thresholds.
  private readonly levelXpThresholds = [
    0, // level 1
    1000, // level 2
    2500, // level 3
    5000, // level 4
    9000, // level 5
    15000, // level 6
    25000, // level 7
    40000, // level 8
    60000, // level 9
    100000, // level 10
  ];

  isMobileMenuOpen = signal(false);
  isSidebarOpen = signal(true);
  isLangMenuOpen = signal(false);
  readonly failedAvatarUrl = signal<string | null>(null);
  readonly isStartingCheckout = signal(false);
  readonly checkoutError = signal<string | null>(null);

  readonly availableLangs: BibleVersion[] = this.versionService.getAvailableVersions();
  readonly currentVersion = toSignal(this.versionService.activeVersion$);
  readonly currentRoute = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  readonly isLibraryRoute = computed(() => this.currentRoute().startsWith('/home/library'));
  readonly isSageRoute = computed(() => this.currentRoute().startsWith('/home/sage'));
  readonly isRecommendationsRoute = computed(() =>
    this.currentRoute().startsWith('/home/recommendations'),
  );
  readonly isBlogRoute = computed(() => this.currentRoute().startsWith('/home/blog'));
  readonly hasActiveSubscription = computed(() => !!this.authService.usuario()?.subscriptionActive);

  ngOnInit(): void {
    this.authService.ensureProfileFreshForHome();
    this.bibleService.preloadReadStateForCurrentVersion(false);
    this.handlePaymentRedirectFeedback();
  }

  private handlePaymentRedirectFeedback(): void {
    const paymentStatus =
      this.route.snapshot.queryParamMap.get('payment') ||
      this.router.parseUrl(this.router.url).queryParams['payment'] ||
      null;

    if (paymentStatus === 'success') {
      this.xpPopupService.showMessage(this.versionService.ui().paymentStatusSuccessPopup);
      this.clearPaymentQueryParam();
      return;
    }

    if (paymentStatus === 'canceled') {
      this.xpPopupService.showMessage(this.versionService.ui().paymentStatusCanceledPopup);
      this.clearPaymentQueryParam();
    }
  }

  private clearPaymentQueryParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { payment: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update((v) => !v);
  }

  toggleLangMenu(): void {
    this.isLangMenuOpen.update((v) => !v);
  }

  closeLangMenu(): void {
    this.isLangMenuOpen.set(false);
  }

  selectLang(id: string): void {
    this.versionService.setVersion(id);
    this.isLangMenuOpen.set(false);
    window.location.reload();
  }

  private readonly menuConfig = signal<HomeMenuItem[]>([
    { key: 'outlines', route: '/home/outlines' },
    { key: 'sage', route: '/home/sage' },
    { key: 'liturgy', route: '/home/liturgy' },
    { key: 'library', route: '/home/library' },
    { key: 'blog', route: '/home/blog' },
    { key: 'quiz', route: '/home/quiz' },
    { key: 'prayers', route: '/home/prayers' },
    { key: 'recommendations', route: '/home/recommendations' },
    { key: 'ranking', route: '/home/ranking' },
  ]);

  readonly menuItems = computed(() => {
    const ui = this.versionService.ui();
    return this.menuConfig().map((item) => ({
      ...item,
      label: this.resolveMenuLabel(item.key, ui),
    }));
  });

  readonly userProfile = computed(() => {
    const ui = this.versionService.ui();
    const usuario = this.authService.usuario();
    const level = Math.max(1, Number(usuario?.level ?? 1));
    const xp = Math.max(0, Number(usuario?.experiencia ?? 0));
    const name = usuario?.name?.trim() || ui.profileRoyalCollectionMember;
    const avatarUrl = usuario?.avatar?.trim() || null;
    const currentLevelIndex = Math.min(level - 1, this.levelXpThresholds.length - 1);
    const currentLevelStartXp = this.levelXpThresholds[currentLevelIndex] ?? 0;
    const hasNextLevel = currentLevelIndex < this.levelXpThresholds.length - 1;
    const nextLevelStartXp = hasNextLevel
      ? (this.levelXpThresholds[currentLevelIndex + 1] ?? currentLevelStartXp)
      : currentLevelStartXp;
    const xpInsideCurrentLevel = Math.max(0, xp - currentLevelStartXp);
    const xpNeededInCurrentLevel = Math.max(1, nextLevelStartXp - currentLevelStartXp);
    const xpToNextLevel = hasNextLevel ? Math.max(0, nextLevelStartXp - xp) : 0;

    return {
      name,
      avatarUrl,
      avatarInitial: name.charAt(0).toUpperCase() || 'U',
      level,
      xp,
      xpInsideCurrentLevel,
      xpNeededInCurrentLevel,
      xpToNextLevel,
      role: usuario?.cargo || ui.profileRoyalCollectionMember,
    };
  });

  readonly xpPercent = computed(() => {
    const data = this.userProfile();
    if (data.xpToNextLevel === 0) {
      return 100;
    }

    return Math.min(
      100,
      Math.max(0, Math.round((data.xpInsideCurrentLevel / data.xpNeededInCurrentLevel) * 100)),
    );
  });

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((value) => !value);
    this.syncBodyScroll();
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
    this.syncBodyScroll();
  }

  logout() {
    this.closeMobileMenu();
    this.authService.logout();
  }

  onMenuNavigate() {
    this.closeMobileMenu();
  }

  shouldShowProfileAvatarImage(): boolean {
    const avatarUrl = this.userProfile().avatarUrl;
    return !!avatarUrl && this.failedAvatarUrl() !== avatarUrl;
  }

  onProfileAvatarError(): void {
    const avatarUrl = this.userProfile().avatarUrl;
    if (avatarUrl) {
      this.failedAvatarUrl.set(avatarUrl);
    }
  }

  startCheckoutFromHome(): void {
    if (this.isStartingCheckout()) {
      return;
    }

    const userId = this.resolveCheckoutUserId();
    if (!userId) {
      this.checkoutError.set(this.versionService.ui().pricingAccessDeniedCheckoutMissingUser);
      return;
    }

    this.checkoutError.set(null);
    this.isStartingCheckout.set(true);

    this.stripeService.iniciarCheckout(userId).subscribe({
      next: ({ url }) => {
        this.isStartingCheckout.set(false);

        if (!url) {
          this.checkoutError.set(this.versionService.ui().pricingAccessDeniedCheckoutMissingUrl);
          return;
        }

        window.open(url, '_blank');
      },
      error: (error: HttpErrorResponse) => {
        this.isStartingCheckout.set(false);
        this.checkoutError.set(
          error?.error?.error ||
            error?.error?.message ||
            this.versionService.ui().pricingAccessDeniedCheckoutStartError,
        );
      },
    });
  }

  private resolveMenuLabel(key: HomeMenuKey, ui: any): string {
    switch (key) {
      case 'outlines':
        return ui.homeMenuOutlines;
      case 'prayers':
        return ui.homeMenuPrayerForum;
      case 'sage':
        return ui.homeMenuSageOnline;
      case 'liturgy':
        return ui.homeMenuLiturgyCalendar;
      case 'library':
        return ui.homeMenuLibrary;
      case 'quiz':
        return ui.homeMenuDailyQuiz;
      case 'recommendations':
        return ui.homeMenuRecommendations;
      case 'ranking':
        return ui.homeMenuRanking;
      case 'blog':
      default:
        return ui.aprendizado;
    }
  }

  private resolveCheckoutUserId(): string | null {
    const usuario = this.authService.usuario();
    const possibleUserIdFromProfile =
      (usuario as { id?: string; userId?: string } | null)?.id ||
      (usuario as { id?: string; userId?: string } | null)?.userId;

    if (possibleUserIdFromProfile) {
      return possibleUserIdFromProfile;
    }

    const token = this.authService.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as {
        id?: string;
        userId?: string;
        sub?: string;
      };

      return payload.userId || payload.id || payload.sub || null;
    } catch {
      return null;
    }
  }

  private syncBodyScroll() {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.isMobileMenuOpen() ? 'hidden' : '';
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
}
