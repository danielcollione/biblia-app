import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  Inject,
  PLATFORM_ID,
  NgZone,
} from '@angular/core';
import { finalize } from 'rxjs/operators';
import {
  QuizAnswerRequest,
  QuizQuestion,
  DailyQuizResponse,
  QuizOption,
  UserResponse,
  QuizReviewDTO,
} from '../../../../services/quiz/quiz.model';
import { QuizService } from '../../../../services/quiz/quiz.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { XpPopupService } from '../../../../services/xp-popup.service';
import { VersionService } from '../../../../services/version/version-service';
import { CelestialParticle } from '../../../../shared/components/embers/celestial.model';

@Component({
  selector: 'app-daily-quiz',
  templateUrl: './quiz-page.html',
  styleUrls: ['./quiz-page.scss'],
  standalone: true,
  imports: [CommonModule],
  // REMOVIDO: O bloco de animations para não dar erro NG05604
})
export class QuizPage implements OnInit {
  currentReviewIndex: number = 0;
  questions: QuizQuestion[] = [];
  currentIndex: number = 0;
  score: number = 0;

  userResponses: UserResponse[] = [];
  reviewData: QuizReviewDTO[] = []; // Para armazenar os dados da revisão
  showReview: boolean = false;

  private readonly isBrowser: boolean;
  loading: boolean = true;
  completed: boolean = false;
  alreadyDoneToday: boolean = false;
  showFeedback: boolean = false;
  selectedOption: QuizOption | null = null;
  private readonly particles: CelestialParticle[] = [];
  private canvasContext: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private pointerX = -1000;
  private pointerY = -1000;
  private lastPointerX = -1000;
  private lastPointerY = -1000;
  private isPointerActive = false;
  private lastFrameTime = 0;
  private emberSpawnAccumulator = 0;
  private logoTargetRotateX = 0;
  private logoTargetRotateY = 0;
  private logoCurrentRotateX = 0;
  private logoCurrentRotateY = 0;
  private cleanupCallbacks: Array<() => void> = [];

  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('wrapper') wrapperRef!: ElementRef;

  constructor(
    private quizService: QuizService,
    private cdr: ChangeDetectorRef, // Injetado para forçar a atualização
    private xpPopupService: XpPopupService, // 1. Injetar o serviço de XP
    @Inject(PLATFORM_ID) platformId: object,
    public readonly versionService: VersionService,
    private ngZone: NgZone,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadDailyQuiz();
  }

  ngAfterViewInit() {
    if (!this.isBrowser) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.setupCanvas();
      this.bindPointerEvents();
      this.startAnimationLoop();
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.cleanupCallbacks.forEach((callback) => callback());
    this.cleanupCallbacks = [];
  }

  private loadDailyQuiz(): void {
    this.loading = true;
    this.quizService.getDailyQuiz().subscribe({
      next: (res: DailyQuizResponse) => {
        console.log('Dados recebidos:', res);

        if (res.alreadyCompleted) {
          this.completed = true;
          this.alreadyDoneToday = true;
          this.score = res.previousScore || 0;
        } else {
          this.questions = res.questions || [];
        }

        this.loading = false;
        this.cdr.detectChanges(); // FORÇA O ANGULAR A MOSTRAR OS DADOS
      },
      error: (err) => {
        console.error('Erro na conexão:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  handleAnswer(option: QuizOption): void {
    if (this.showFeedback) return;

    this.selectedOption = option;
    this.showFeedback = true;
    if (option.isCorrect) this.score++;

    // SALVA A RESPOSTA PARA O BACK-END
    this.userResponses.push({
      questionIndex: this.currentIndex,
      selectedOptionKey: option.letter, // ou option.key, dependendo do seu DTO
    });

    setTimeout(() => {
      this.proceedToNext();
      this.cdr.detectChanges();
    }, 1500);
  }

  private proceedToNext(): void {
    this.showFeedback = false;
    this.selectedOption = null;
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    } else {
      this.finishQuiz();
    }
  }

  nextReviewStep() {
    if (this.currentReviewIndex < this.reviewData.length - 1) {
      this.currentReviewIndex++;
    } else {
      // Ao chegar na última, volta para a tela de Conclusão
      this.showReview = false;
      this.currentReviewIndex = 0;
    }
    this.cdr.detectChanges();
  }

  private finishQuiz(): void {
    this.completed = true;

    const request: QuizAnswerRequest = {
      score: this.score,
      responses: this.userResponses, // Enviando a lista detalhada
    };

    this.quizService.submitAnswer(request).subscribe({
      next: () => {
        const xpGained = this.score > 0 ? this.score * 500 : 100;
        this.xpPopupService.showXp(xpGained, this.versionService.ui().chapterFinish);
        this.cdr.detectChanges();
      },
      error: (err) => console.warn('Erro ao salvar progresso:', err),
    });
  }

  loadReview(): void {
    this.quizService.getReview().subscribe((res) => {
      this.reviewData = res;
      this.showReview = true;
      this.cdr.detectChanges();
    });
  }

  get currentQuestion(): QuizQuestion | null {
    return this.questions.length > 0 ? this.questions[this.currentIndex] : null;
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    this.canvasContext = context;

    this.resizeCanvas();

    const resizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', resizeHandler, { passive: true });
    this.cleanupCallbacks.push(() => window.removeEventListener('resize', resizeHandler));
  }

  private bindPointerEvents(): void {
    const wrapper = this.wrapperRef.nativeElement as HTMLElement;

    const pointerMoveHandler = (event: PointerEvent) => {
      const rect = wrapper.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;

      if (this.lastPointerX < 0 || this.lastPointerY < 0) {
        this.lastPointerX = nextX;
        this.lastPointerY = nextY;
      }

      this.pointerX = nextX;
      this.pointerY = nextY;
      this.isPointerActive = true;
      this.updateLogoTarget(nextX, nextY, rect.width, rect.height);
      this.spawnTrailParticles();
      this.lastPointerX = nextX;
      this.lastPointerY = nextY;
    };

    const pointerLeaveHandler = () => {
      this.isPointerActive = false;
      this.lastPointerX = -1000;
      this.lastPointerY = -1000;
      this.logoTargetRotateX = 0;
      this.logoTargetRotateY = 0;
    };

    wrapper.addEventListener('pointermove', pointerMoveHandler, { passive: true });
    wrapper.addEventListener('pointerleave', pointerLeaveHandler, { passive: true });

    this.cleanupCallbacks.push(() =>
      wrapper.removeEventListener('pointermove', pointerMoveHandler),
    );
    this.cleanupCallbacks.push(() =>
      wrapper.removeEventListener('pointerleave', pointerLeaveHandler),
    );
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const wrapper = this.wrapperRef.nativeElement as HTMLElement;
    const dpr = window.devicePixelRatio || 1;
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;

    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    if (this.canvasContext) {
      this.canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private startAnimationLoop(): void {
    const frame = () => {
      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(frame);
    };

    frame();
  }

  private updateLogoTarget(mouseX: number, mouseY: number, width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const normalizedX = (mouseX - centerX) / Math.max(centerX, 1);
    const normalizedY = (mouseY - centerY) / Math.max(centerY, 1);
    const maxTilt = 10;

    this.logoTargetRotateY = Math.max(-1, Math.min(1, normalizedX)) * maxTilt;
    this.logoTargetRotateX = Math.max(-1, Math.min(1, -normalizedY)) * maxTilt;
  }

  private spawnTrailParticles(): void {
    const distance = Math.hypot(
      this.pointerX - this.lastPointerX,
      this.pointerY - this.lastPointerY,
    );
    const spawnCount = Math.max(8, Math.min(18, Math.round(distance / 9) + 7));

    for (let index = 0; index < spawnCount; index += 1) {
      const spread = Math.random() * Math.PI * 2;
      const speed = 0.18 + Math.random() * 0.75;
      const drift = (Math.random() - 0.5) * 0.25;

      this.particles.push({
        x: this.pointerX + (Math.random() - 0.5) * 8,
        y: this.pointerY + (Math.random() - 0.5) * 8,
        vx: Math.cos(spread) * speed + drift,
        vy: Math.sin(spread) * speed - 0.08 - Math.random() * 0.22,
        life: 0,
        maxLife: 62 + Math.random() * 44,
        size: 0.65 + Math.random() * 1.25,
        alpha: 0.22 + Math.random() * 0.26,
        hueShift: Math.random() * 10,
        kind: 'trail',
      });
    }

    if (this.particles.length > 460) {
      this.particles.splice(0, this.particles.length - 460);
    }
  }

  private spawnAmbientEmbers(width: number, height: number, deltaSeconds: number): void {
    const spawnPerSecond = Math.max(10, width / 90);
    this.emberSpawnAccumulator += spawnPerSecond * deltaSeconds;
    const spawnCount = Math.floor(this.emberSpawnAccumulator);

    if (spawnCount <= 0) {
      return;
    }

    this.emberSpawnAccumulator -= spawnCount;

    for (let index = 0; index < spawnCount; index += 1) {
      const spawnFromBottom = Math.random() < 0.35;

      this.particles.push({
        x: Math.random() * width,
        y: spawnFromBottom ? height + Math.random() * 20 : Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(0.42 + Math.random() * 0.85),
        life: 0,
        maxLife: 78 + Math.random() * 92,
        size: 0.45 + Math.random() * 1.05,
        alpha: 0.08 + Math.random() * 0.17,
        hueShift: Math.random() * 14,
        kind: 'ember',
      });
    }
  }

  private renderFrame(): void {
    if (!this.canvasContext) {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const context = this.canvasContext;
    const now = performance.now();
    const deltaSeconds =
      this.lastFrameTime > 0 ? Math.min(0.05, (now - this.lastFrameTime) / 1000) : 0.016;
    this.lastFrameTime = now;

    context.clearRect(0, 0, width, height);
    this.spawnAmbientEmbers(width, height, deltaSeconds);

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life += 1;

      if (particle.life >= particle.maxLife) {
        this.particles.splice(index, 1);
        continue;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.kind === 'trail') {
        particle.vx *= 0.992;
        particle.vy = particle.vy * 0.992 + 0.01;
      } else {
        particle.vx =
          particle.vx * 0.996 + Math.sin((particle.life + particle.hueShift) * 0.035) * 0.003;
        particle.vy = particle.vy * 0.995 + 0.0018;
      }

      const lifeProgress = particle.life / particle.maxLife;
      const fade = 1 - lifeProgress;
      const twinkle = 0.94 + Math.sin(particle.life * 0.18 + particle.hueShift) * 0.06;
      const alpha = particle.alpha * fade * twinkle;
      const radius =
        particle.size * (particle.kind === 'ember' ? 0.82 + fade * 0.35 : 0.92 + fade * 0.18);

      this.drawParticle(particle, radius, alpha);
    }
  }

  private drawParticle(particle: CelestialParticle, radius: number, alpha: number): void {
    if (!this.canvasContext) {
      return;
    }

    const context = this.canvasContext;
    let finalAlpha = alpha;
    let glowRadius = radius * 1.8;
    let glowColor = `rgba(212, 175, 55, ${finalAlpha * 0.34})`;
    let coreColor = `rgba(212, 175, 55, ${finalAlpha})`;

    if (particle.kind === 'trail') {
      const distanceToPointer = Math.hypot(particle.x - this.pointerX, particle.y - this.pointerY);
      const ringCenter = 22;
      const ringWidth = 12;
      const ringDelta = distanceToPointer - ringCenter;
      const brightRingBoost = Math.exp(-(ringDelta * ringDelta) / (2 * ringWidth * ringWidth));
      finalAlpha = Math.min(1, alpha * (1 + brightRingBoost * 1.15));
      glowRadius = radius * (1.8 + brightRingBoost * 2.8);
      glowColor = `rgba(212, 175, 55, ${finalAlpha * 0.34})`;
      coreColor = `rgba(212, 175, 55, ${finalAlpha})`;
    } else {
      finalAlpha = Math.min(0.65, alpha);
      glowRadius = radius * 2.4;
      glowColor = `rgba(255, 136, 46, ${finalAlpha * 0.26})`;
      coreColor = `rgba(255, 200, 120, ${finalAlpha})`;
    }

    context.beginPath();
    context.fillStyle = glowColor;
    context.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.fillStyle = coreColor;
    context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
    context.fill();
  }
}
