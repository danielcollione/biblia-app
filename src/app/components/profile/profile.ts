import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth';
import { VersionService } from '../../services/version/version-service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile {
  // Injeção de serviços modernos
  public readonly auth = inject(AuthService);
  public readonly versionService = inject(VersionService);

  /**
   * Calcula o progresso dentro do nível atual.
   * Exemplo simples: cada nível exige 100 de XP.
   */
  get calculoProgressoXP(): number {
    const exp = this.auth.usuario()?.experiencia || 0;
    return exp % 100; 
  }
}