import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VersionService } from '../../services/version/version-service';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit, AfterViewInit {
  private clientId = '774261062071-pkncaa6t7bli08qg27dmhfgi802v5m0p.apps.googleusercontent.com';

  isLoginMode = true;

  nome = '';
  email = '';
  senha = '';
  confirmarSenha = ''; // NOVO: Campo de confirmação
  erroSenha = false; // NOVO: Controle de erro de senha

  constructor(
    private authService: AuthService,
    private router: Router,
    public readonly versionService: VersionService,
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.iniciarBotaoGoogleSeguro();
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.erroSenha = false; // Limpa o erro ao trocar de tela
    this.senha = '';
    this.confirmarSenha = '';
    setTimeout(() => this.renderizarBotaoGoogle(), 0);
  }

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
      theme: 'filled_black',
      size: 'large',
      shape: 'rectangular',
      text: 'continue_with',
    });
  }

  handleGoogleResponse(response: any) {
    const googleToken = response.credential;
    this.authService.loginComGoogle(googleToken).subscribe({
      next: (token) => console.log('Login Google Sucesso!'),
      error: (err) => console.error(err),
    });
  }

onSubmitTradicional() {
  if (this.isLoginMode) {
    this.authService.loginTradicional(this.email, this.senha).subscribe({
      next: () => console.log('Login tradicional realizado.'),
      error: (err) => console.error('Erro no login:', err)
    });
  } else {
    if (this.senha !== this.confirmarSenha) return;
    
    this.authService.cadastrarTradicional(this.nome, this.email, this.senha).subscribe({
      next: () => {
        console.log('Cadastro realizado. Redirecionando para login...');
        this.toggleMode(); // Volta para a tela de login
      },
      error: (err) => console.error('Erro no cadastro:', err)
    });
  }
}
}
