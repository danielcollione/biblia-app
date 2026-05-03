import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { VersionService } from '../../services/version/version-service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly authService = inject(AuthService);
  public readonly versionService = inject(VersionService);

  email = '';
  carregando = signal(false);
  erroMensagem = signal<string | null>(null);
  sucessoMensagem = signal<string | null>(null);

  onSubmit(): void {
    if (this.carregando()) return;

    this.carregando.set(true);
    this.erroMensagem.set(null);
    this.sucessoMensagem.set(null);

    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.carregando.set(false);
        this.sucessoMensagem.set(this.versionService.ui().forgotPasswordSuccess);
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erroMensagem.set(this.resolveErrorMessage(err));
      },
    });
  }

  private resolveErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      return err.error.trim();
    }

    return this.versionService.ui().forgotPasswordErrorGeneric;
  }
}
