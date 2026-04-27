import { Component, signal } from '@angular/core';
import { VersionService } from '../../services/version/version-service';
import { VersionSelectorComponent } from '../leitor/version-selector/version-selector';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterLink, // Adicione aqui
    RouterLinkActive, // Adicione aqui para o estilo de link ativo funcionar
    VersionSelectorComponent, // Garanta que seu seletor de versão também esteja aqui
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  public isMenuOpen = signal(false);

  constructor(public versionService: VersionService) {}

  toggleMenu() {
    this.isMenuOpen.update((v) => !v);

    // Trava o scroll do corpo quando o menu estiver aberto
    if (this.isMenuOpen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    document.body.style.overflow = '';
  }
}
