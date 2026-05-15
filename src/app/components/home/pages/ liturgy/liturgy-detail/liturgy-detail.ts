import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { VersionService } from '../../../../../services/version/version-service';

// Interface para garantir que o TS não reclame do acesso às propriedades
interface LiturgySections {
  firstReading: boolean;
  psalm: boolean;
  gospel: boolean;
}

@Component({
  standalone: true,
  selector: 'app-liturgy-detail',
  imports: [CommonModule],
  templateUrl: './liturgy-detail.html',
  styleUrl: './liturgy-detail.scss',
})
export class LiturgyDetail implements OnInit {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  public readonly versionService = inject(VersionService);

  // Signals para os dados recebidos
  public liturgy = signal<any>(null);
  public dayInfo = signal<any>(null);
  public lang = signal<string>('pt');

  // Controle de abertura dos tooltips (Inicia tudo fechado)
  public openSections = signal<LiturgySections>({
    firstReading: false,
    psalm: false,
    gospel: false
  });

  ngOnInit(): void {
    // 1. Define o idioma para formatação de datas
    this.lang.set(this.versionService.languageCode());

    // 2. Recupera os dados injetados via Router State
    const state = history.state;

    // 3. Validação de segurança: se o usuário der Refresh (F5), o state morre.
    // Nesses casos, voltamos para o calendário em vez de mostrar uma tela vazia.
    if (state && state.liturgy && state.dayInfo) {
      this.liturgy.set(state.liturgy);
      this.dayInfo.set(state.dayInfo);
      
      // Garantia de que a página comece no topo
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.warn('Estado não encontrado. Redirecionando para o calendário...');
      this.router.navigate(['/home/liturgy']);
    }
  }

  /**
   * Alterna a visibilidade das seções com tipagem segura
   */
  toggle(section: keyof LiturgySections) {
    this.openSections.update(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }

  /**
   * Retorna à navegação anterior
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Formata a data de forma luxuosa respeitando o local do usuário
   */
  getFormattedDate(): string {
    const info = this.dayInfo();
    if (!info || !info.date) return '';

    return new Intl.DateTimeFormat(
      this.lang() === 'pt' ? 'pt-BR' : this.lang() === 'es' ? 'es-ES' : 'en-US',
      { dateStyle: 'full' }
    ).format(new Date(info.date));
  }
}