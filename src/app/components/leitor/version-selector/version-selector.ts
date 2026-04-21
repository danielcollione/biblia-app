import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { BibleVersion, VersionService } from '../../../services/version/version-service';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-version-selector',
  templateUrl: './version-selector.html',
  styleUrls: ['./version-selector.scss'],
  imports: [AsyncPipe, CommonModule]
})
export class VersionSelectorComponent implements OnInit {
  availableVersions: BibleVersion[] = [];
  currentVersion$: Observable<BibleVersion>;
  isMenuOpen = false;

  constructor(private versionService: VersionService) {
    this.currentVersion$ = this.versionService.activeVersion$;
  }

  ngOnInit(): void {
    this.availableVersions = this.versionService.getAvailableVersions();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  selectVersion(versionId: string): void {
    this.versionService.setVersion(versionId);
    this.isMenuOpen = false; // Fecha o menu após selecionar
    window.location.reload();
  }
}