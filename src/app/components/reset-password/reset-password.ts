import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { VersionService } from '../../services/version/version-service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  public readonly versionService = inject(VersionService);

  token = signal('');
  novaSenha = '';
  confirmarSenha = '';

  carregando = signal(false);
  erroMensagem = signal<string | null>(null);
  sucessoMensagem = signal<string | null>(null);

  verSenha = false;
  verConfirmarSenha = false;

  constructor() {
    const tokenFromQuery = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(tokenFromQuery);

    if (!tokenFromQuery) {
      this.erroMensagem.set(this.versionService.ui().resetPasswordMissingToken);
    }
  }

  toggleVerSenha(): void {
    this.verSenha = !this.verSenha;
  }

  toggleVerConfirmarSenha(): void {
    this.verConfirmarSenha = !this.verConfirmarSenha;
  }

  onSubmit(): void {
    if (this.carregando()) return;

    this.erroMensagem.set(null);
    this.sucessoMensagem.set(null);

    if (!this.token()) {
      this.erroMensagem.set(this.versionService.ui().resetPasswordMissingToken);
      return;
    }

    if (this.novaSenha !== this.confirmarSenha) {
      this.erroMensagem.set(this.versionService.ui().resetPasswordPasswordsMustMatch);
      return;
    }

    this.carregando.set(true);
    this.authService.resetPassword(this.token(), this.novaSenha).subscribe({
      next: () => {
        this.carregando.set(false);
        this.sucessoMensagem.set(this.versionService.ui().resetPasswordSuccess);
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erroMensagem.set(this.resolveErrorMessage(err));
      },
    });
  }

  private resolveErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string') {
      const message = err.error.trim();
      if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('expired')) {
        return this.versionService.ui().resetPasswordInvalidOrExpired;
      }
      if (message.length > 0) {
        return message;
      }
    }

    return this.versionService.ui().resetPasswordErrorGeneric;
  }
}
