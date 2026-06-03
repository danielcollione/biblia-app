import { Component, OnInit, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningDeckService } from '../../../../services/learning-deck/learning-deck.service';
import { VersionService } from '../../../../services/version/version-service';
import { BibleService } from '../../../../services/bible';
import { AiInsightService } from '../../../../services/ai-insights/ai-insight.service';

export type DeckCard = {
  cardType: 'highlight' | 'comment';
  uniqueId: string;
  id: string;
  bookName: string;
  chapterNumber: number;
  language: string;
  verseNumber?: number;
  commentText?: string;
};

// ==========================================
// LÓGICA DA POEIRA MÍSTICA (Fora do Componente)
// ==========================================
class Particle {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  accelX = 0;
  accelY = 0;
  life = 2000;
  maxLife = 2000;
  alpha = 1;
  size = 2;

  update() {
    this.vx += this.accelX;
    this.vy += this.accelY;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Poeira Dourada
    ctx.fillStyle = `rgba(230, 192, 122, ${this.alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  isAlive() {
    return this.life >= 0;
  }
}

class ParticleSystem {
  particles: Particle[] = [];
  updateHandler?: (p: Particle) => void;

  addParticle(particle: Particle) {
    this.particles.push(particle);
  }

  update() {
    this.particles.forEach((particle) => {
      particle.update();
      if (this.updateHandler) this.updateHandler(particle);
    });
  }

  onUpdate(fn: (p: Particle) => void) {
    this.updateHandler = fn;
  }
}
// ==========================================

@Component({
  selector: 'app-home-blog-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-blog-page.html',
  styleUrls: ['./home-blog-page.scss'],
})
export class HomeBlogPage implements OnInit {
  private readonly deckService = inject(LearningDeckService);
  public readonly versionService = inject(VersionService);
  private readonly bibleService = inject(BibleService);
  private readonly aiInsightService = inject(AiInsightService);

  // --- SIGNALS DA MODAL ---
  readonly activeCard = signal<DeckCard | null>(null);
  readonly cardVerseText = signal<string | null>(null);
  readonly cardAiInsight = signal<string | null>(null);
  readonly isInsightLoading = signal(false);
  readonly isDustFading = signal(false); // Controla o momento que a poeira está sumindo
  readonly showAiText = signal(false);
  readonly hasInsightError = signal(false);
  readonly pendingDeleteCard = signal<DeckCard | null>(null);
  readonly isDeletingCard = signal(false);

  // --- CANVAS DA POEIRA ---
  @ViewChild('dustCanvas') dustCanvas?: ElementRef<HTMLCanvasElement>;
  private animationFrameId?: number;
  private particleSystem?: ParticleSystem;

  readonly isLoading = this.deckService.isLoadingDeck;

  readonly unifiedDeck = computed(() => {
    const highlights = this.deckService.deckHighlights().map((h) => ({
      ...h,
      cardType: 'highlight' as const,
      uniqueId: `hl-${h.id}`,
      commentText: undefined,
    }));

    const comments = this.deckService.deckComments().map((c: any) => ({
      ...c,
      cardType: 'comment' as const,
      uniqueId: `cm-${c.id}`,
      verseNumber: undefined,
      commentText: c.content || c.commentText,
    }));

    return [...highlights, ...comments];
  });

  ngOnInit(): void {
    this.deckService.loadDeck().subscribe();
  }

  requestDeleteCard(card: DeckCard, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const nativeEvent = event as Event & { stopImmediatePropagation?: () => void };
    nativeEvent.stopImmediatePropagation?.();

    this.pendingDeleteCard.set(card);
  }

  closeDeleteModal(): void {
    if (this.isDeletingCard()) {
      return;
    }

    this.pendingDeleteCard.set(null);
  }

  confirmDeleteCard(): void {
    const card = this.pendingDeleteCard();
    if (!card || this.isDeletingCard()) {
      return;
    }

    this.isDeletingCard.set(true);

    const request$ = card.cardType === 'highlight'
      ? this.deckService.deleteHighlight(card.id)
      : this.deckService.deleteComment(card.id);

    request$.subscribe({
      next: () => {
        this.isDeletingCard.set(false);
        this.pendingDeleteCard.set(null);
      },
      error: () => {
        this.isDeletingCard.set(false);
      },
    });
  }

  async openCard(card: DeckCard, event?: Event) {
    if (this.pendingDeleteCard()) {
      return;
    }

    const target = event?.target as HTMLElement | null;
    if (target?.closest('.btn-delete-card')) {
      return;
    }

    this.activeCard.set(card);
    this.cardVerseText.set(null);
    this.cardAiInsight.set(null);
    this.isInsightLoading.set(true);
    this.isDustFading.set(false);
    this.showAiText.set(false);
    this.hasInsightError.set(false);

    // Inicia a poeira logo que abre a carta
    setTimeout(() => this.startDustAnimation(), 0);

    if (card.cardType === 'highlight' && card.verseNumber) {
      const text = await this.bibleService.getVerseText(
        card.bookName,
        card.chapterNumber,
        card.verseNumber,
        card.language
      );
      this.cardVerseText.set(text);
    }

    const request = {
      type: card.cardType === 'highlight' ? 'VERSE' : 'CHAPTER_COMMENT',
      bookName: card.bookName,
      chapterNumber: card.chapterNumber,
      verseNumber: card.cardType === 'highlight' ? card.verseNumber : null,
      userText: card.cardType === 'comment' ? card.commentText : null,
      language: this.versionService.languageCode(),
    };

    this.aiInsightService.generateQuickInsight(request as any).subscribe({
      next: (res) => {
        // Se a resposta vier vazia (interceptor engoliu o erro, por exemplo)
        if (!res || !res.insightText) {
          this.handleInsightError('O pergaminho está em branco. A conexão se perdeu no éter.');
          return;
        }

        this.cardAiInsight.set(res.insightText);
        this.isDustFading.set(true);

        setTimeout(() => {
          this.isInsightLoading.set(false);
          this.showAiText.set(true);
          this.stopDustAnimation();
        }, 1000);
      },
      error: (err) => {
        console.error('Falha ao convocar a IA:', err);

        // Mensagem padrão
        let msg = this.versionService.ui().insightsError;

        // Verifica se é exatamente o erro de Cota Excedida (429)
        if (err.status === 429) {
          msg = this.versionService.ui().insightsError2;
        }

        this.handleInsightError(msg);
      },
    });
  }

  private handleInsightError(mensagem: string) {
    this.hasInsightError.set(true);
    this.cardAiInsight.set(mensagem);
    this.isDustFading.set(true); // Começa a sumir a poeira mesmo no erro

    setTimeout(() => {
      this.isInsightLoading.set(false);
      this.showAiText.set(true); // Mostra a mensagem de erro
      this.stopDustAnimation();
    }, 1000);
  }

  closeCard() {
    this.activeCard.set(null);
    this.stopDustAnimation(); // Limpa a memória
  }

  // --- LÓGICA DE RENDERIZAÇÃO DA POEIRA ---
  private startDustAnimation() {
    if (!this.dustCanvas) return;
    const canvas = this.dustCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pega o tamanho exato da caixa onde a IA vai aparecer
    const width = canvas.parentElement?.clientWidth || 400;
    const height = canvas.parentElement?.clientHeight || 200;
    canvas.width = width;
    canvas.height = height;

    this.particleSystem = new ParticleSystem();

    for (let i = 0; i < 150; i++) {
      let p = new Particle();
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.life = Math.random() * 1000 + 1000;
      p.size = Math.random() * 1.5;
      p.maxLife = p.life;
      this.particleSystem.addParticle(p);
    }

    this.particleSystem.onUpdate((p) => {
      if (!p.isAlive()) {
        p.x = Math.random() * width;
        p.y = Math.random() * height;
        p.vx = 0;
        p.vy = 0;
        p.life = Math.random() * 1000 + 1000;
        p.maxLife = p.life;
      }
      p.life -= 10;
      p.accelX = (Math.random() - 0.5) * 0.02;
      p.accelY = (Math.random() - 0.5) * 0.02;
      p.alpha = p.life >= p.maxLife / 2 ? 1 - p.life / p.maxLife : p.life / p.maxLife;
    });

    const render = () => {
      // Usamos clearRect para o fundo ficar transparente (mesclando com a carta)
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      this.particleSystem?.update();
      this.particleSystem?.particles.forEach((p) => p.draw(ctx));

      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  private stopDustAnimation() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }
}
