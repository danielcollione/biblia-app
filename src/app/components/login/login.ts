import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VersionService } from '../../services/version/version-service';
import { HttpErrorResponse } from '@angular/common/http';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  public readonly versionService = inject(VersionService);

  private clientId = '774261062071-pkncaa6t7bli08qg27dmhfgi802v5m0p.apps.googleusercontent.com';

  isLoginMode = true;
  carregando = false;
  erroMensagem: string | null = null;

  // Dados do Formulário
  nome = '';
  email = '';
  senha = '';
  confirmarSenha = '';

  // Controles do Olhinho
  verSenha = false;
  verConfirmarSenha = false;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.iniciarBotaoGoogleSeguro();
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.limparCampos();
    // Reseta o "olhinho" ao trocar de modo
    this.verSenha = false;
    this.verConfirmarSenha = false;
    setTimeout(() => this.renderizarBotaoGoogle(), 0);
  }

  private limparCampos() {
    this.erroMensagem = null;
    this.senha = '';
    this.confirmarSenha = '';
  }

  // Alterna visibilidade da senha principal
  toggleVerSenha(): void {
    this.verSenha = !this.verSenha;
  }

  // Alterna visibilidade da confirmação
  toggleVerConfirmarSenha(): void {
    this.verConfirmarSenha = !this.verConfirmarSenha;
  }

  // --- Lógica de Autenticação (Mantida conforme sua versão) ---
  iniciarBotaoGoogleSeguro() {
    if (typeof google === 'undefined' || !google.accounts) {
      setTimeout(() => this.iniciarBotaoGoogleSeguro(), 50);
      return;
    }
    this.renderizarBotaoGoogle();
  }

  renderizarBotaoGoogle() {
    const btnWrapper = document.getElementById('google-btn-wrapper');
    if (!btnWrapper) return;
    google.accounts.id.initialize({
      client_id: this.clientId,
      callback: this.handleGoogleResponse.bind(this),
    });
    google.accounts.id.renderButton(btnWrapper, {
      theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'continue_with',
    });
  }

  handleGoogleResponse(response: any) {
    this.carregando = true;
    this.authService.loginComGoogle(response.credential).subscribe({
      next: () => this.carregando = false,
      error: (err: HttpErrorResponse) => {
        this.carregando = false;
        this.erroMensagem = this.versionService.ui().loginErrorGoogle;
      }
    });
  }

  private resolveErrorMessage(err: HttpErrorResponse, fallbackKey: string): string {
    // Mensagem textual enviada pelo backend tem prioridade
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      return err.error.trim();
    }
    // Fallback por status HTTP
    if (err.status === 401 || err.status === 403) {
      return this.versionService.ui().loginErrorInvalidCredentials;
    }
    if (err.status === 400 && !this.isLoginMode) {
      return this.versionService.ui().loginErrorEmailAlreadyExists;
    }
    return (this.versionService.ui() as any)[fallbackKey] ?? this.versionService.ui().loginErrorGeneric;
  }

  onSubmitTradicional() {
    if (this.carregando) return;

    this.erroMensagem = null;

    if (this.isLoginMode) {
      this.carregando = true;
      this.authService.loginTradicional(this.email, this.senha).subscribe({
        next: () => {
          this.carregando = false;
        },
        error: (err: HttpErrorResponse) => {
          this.carregando = false;
          this.erroMensagem = this.resolveErrorMessage(err, 'loginErrorInvalidCredentials');
        }
      });
      return;
    }

    if (this.senha !== this.confirmarSenha) {
      this.erroMensagem = this.versionService.ui().loginPasswordsMustMatch;
      return;
    }

    this.carregando = true;
    this.authService.cadastrarTradicional(this.nome, this.email, this.senha).subscribe({
      next: () => {
        this.authService.loginTradicional(this.email, this.senha).subscribe({
          next: () => {
            this.carregando = false;
          },
          error: (err: HttpErrorResponse) => {
            this.carregando = false;
            this.erroMensagem = this.versionService.ui().loginErrorAutoLogin;
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.carregando = false;
        this.erroMensagem = this.resolveErrorMessage(err, 'loginErrorGeneric');
      }
    });
  }
}