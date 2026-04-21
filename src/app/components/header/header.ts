import { Component } from '@angular/core';
import { VersionService } from '../../services/version/version-service';
import { VersionSelectorComponent } from '../leitor/version-selector/version-selector';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule, 
    RouterLink,       // Adicione aqui
    RouterLinkActive, // Adicione aqui para o estilo de link ativo funcionar
    VersionSelectorComponent // Garanta que seu seletor de versão também esteja aqui
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
constructor(public versionService: VersionService) {}
}
