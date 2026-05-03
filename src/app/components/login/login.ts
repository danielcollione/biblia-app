import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth'; // Verifique se este caminho está correto conforme sua pasta
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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  public readonly versionService = inject(VersionService);

  private clientId = '774261062071-pkncaa6t7bli08qg27dmhfgi802v5m0p.apps.googleusercontent.com';

  isLoginMode = true;
  
  // Dados do Formulário
  nome = '';
  email = '';
  senha = '';
  confirmarSenha = '';

  // Controle de Erros e UI
  erroMensagem: string | null = null;
  carregando = false;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.iniciarBotaoGoogleSeguro();
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.limparCampos();
    setTimeout(() => this.renderizarBotaoGoogle(), 0);
  }

  private limparCampos() {
    this.erroMensagem = null;
    this.senha = '';
    this.confirmarSenha = '';
    // Mantemos o email para conveniência do usuário
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
    this.carregando = true;
    const googleToken = response.credential;
    this.authService.loginComGoogle(googleToken).subscribe({
      next: () => {
        this.carregando = false;
        console.log('Login Google realizado com sucesso.');
      },
      error: (err) => {
        this.carregando = false;
        this.erroMensagem = "Falha na autenticação com o Google.";
        console.error(err);
      },
    });
  }

  onSubmitTradicional() {
    this.erroMensagem = null;

    if (this.isLoginMode) {
      this.executarLogin();
    } else {
      this.executarCadastro();
    }
  }

  private executarLogin() {
    if (!this.email || !this.senha) {
      this.erroMensagem = "Preencha todos os campos para entrar.";
      return;
    }

    this.carregando = true;
    this.authService.loginTradicional(this.email, this.senha).subscribe({
      next: () => {
        this.carregando = false;
        console.log('Login realizado.');
      },
      error: (err) => {
        this.carregando = false;
        this.erroMensagem = "E-mail ou senha incorretos.";
        console.error('Erro no login:', err);
      }
    });
  }

  private executarCadastro() {
    // 1. Validação de campos vazios
    if (!this.nome || !this.email || !this.senha) {
      this.erroMensagem = "Todos os campos são obrigatórios.";
      return;
    }

    // 2. Validação de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.erroMensagem = "Insira um endereço de e-mail válido.";
      return;
    }

    // 3. Validação de tamanho de senha
    if (this.senha.length < 6) {
      this.erroMensagem = "A senha deve ter no mínimo 6 caracteres.";
      return;
    }

    // 4. Validação de coincidência de senhas
    if (this.senha !== this.confirmarSenha) {
      this.erroMensagem = "As senhas não coincidem.";
      return;
    }

    this.carregando = true;
    this.authService.cadastrarTradicional(this.nome, this.email, this.senha).subscribe({
      next: () => {
        this.carregando = false;
        alert('Cadastro realizado! Agora você pode entrar.');
        this.toggleMode(); 
      },
      error: (err) => {
        this.carregando = false;
        this.erroMensagem = "Não foi possível criar sua conta. Tente outro e-mail.";
        console.error('Erro no cadastro:', err);
      }
    });
  }
}