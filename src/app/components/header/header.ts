import { Component, signal } from '@angular/core';
import { VersionService } from '../../services/version/version-service';
import { VersionSelectorComponent } from '../leitor/version-selector/version-selector';
import { RouterLink, RouterLinkActive } from '@angular/router';

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

  constructor(public versionService: VersionService) {}

  toggleMenu() {
    this.isMenuOpen.update((value) => !value);
    document.body.style.overflow = this.isMenuOpen() ? 'hidden' : '';
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    document.body.style.overflow = '';
  }
}
