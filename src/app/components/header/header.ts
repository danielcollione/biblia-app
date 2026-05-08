import { Component, HostListener, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { VersionService } from '../../services/version/version-service';
import { VersionSelectorComponent } from '../leitor/version-selector/version-selector';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive,
    VersionSelectorComponent,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  public isMenuOpen = signal(false);
  public isLandingTop = signal(false);

  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly scrollThreshold = 20;
  private routeSub: Subscription | null = null;

  constructor(public versionService: VersionService) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.updateHeaderVisualState();
    this.routeSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateHeaderVisualState());
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  toggleMenu() {
    this.isMenuOpen.update((value) => !value);
    document.body.style.overflow = this.isMenuOpen() ? 'hidden' : '';
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    document.body.style.overflow = '';
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateHeaderVisualState();
  }

  private updateHeaderVisualState(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const currentPath = (this.router.url || '/').split('?')[0] || '/';
    const isLandingRoute = currentPath === '/';
    const isAtTop = window.scrollY <= this.scrollThreshold;
    this.isLandingTop.set(isLandingRoute && isAtTop);
  }
}
