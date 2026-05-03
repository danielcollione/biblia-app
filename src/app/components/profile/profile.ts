import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth';
import { VersionService } from '../../services/version/version-service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile {
  protected readonly auth = inject(AuthService);
  protected readonly versionService = inject(VersionService);

  // O HTML acessará auth.usuario() diretamente de forma reativa
}