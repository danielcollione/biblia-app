import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { BibleVersion, VersionService } from '../../services/version/version-service';

type HomeMenuKey =
  | 'outlines'
  | 'prayers'
  | 'sage'
  | 'library'
  | 'quiz'
  | 'recommendations'
  | 'blog'
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
  styleUrls: ['./home.scss']
})
export class Home {
  private readonly authService = inject(AuthService);
  public readonly versionService = inject(VersionService);
  isMobileMenuOpen = signal(false);
  isSidebarOpen = signal(true);
  isLangMenuOpen = signal(false);

  readonly availableLangs: BibleVersion[] = this.versionService.getAvailableVersions();
  readonly currentVersion = toSignal(this.versionService.activeVersion$);

  toggleSidebar(): void {
    this.isSidebarOpen.update(v => !v);
  }

  toggleLangMenu(): void {
    this.isLangMenuOpen.update(v => !v);
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
    { key: 'prayers', route: '/home/prayers' },
    { key: 'sage', route: '/home/sage' },
    { key: 'library', route: '/home/library' },
    { key: 'quiz', route: '/home/quiz' },
    { key: 'recommendations', route: '/home/recommendations' },
    { key: 'blog', route: '/home/blog' },
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
    const xpToNextLevel = Math.max(100, level * 100);
    const name = usuario?.name?.trim() || ui.profileRoyalCollectionMember;

    return {
      name,
      avatar: name.charAt(0).toUpperCase() || 'U',
      level,
      xp,
      xpToNextLevel,
      role: usuario?.cargo || ui.profileRoyalCollectionMember,
    };
  });

  readonly xpPercent = computed(() => {
    const data = this.userProfile();
    return Math.min(100, Math.round((data.xp / data.xpToNextLevel) * 100));
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

  private resolveMenuLabel(key: HomeMenuKey, ui: any): string {
    switch (key) {
      case 'outlines':
        return ui.homeMenuOutlines;
      case 'prayers':
        return ui.homeMenuPrayerForum;
      case 'sage':
        return ui.homeMenuSageOnline;
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
        return ui.homeMenuBlog;
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