import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { VersionService } from '../../../../services/version/version-service';
import { StudyService, StudyResponseDto } from '../../../../services/study/study.service';

type EmberParticle = {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; alpha: number;
  hueShift: number;
};

@Component({
  selector: 'app-outlines-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './outlines-page.html',
  styleUrls: ['./outlines-page.scss'],
})
export class OutlinesPage implements AfterViewInit, OnDestroy {
  readonly versionService = inject(VersionService);
  private readonly studyService = inject(StudyService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser: boolean;
  private readonly embers: EmberParticle[] = [];
  private canvasContext: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private emberSpawnAccumulator = 0;
  private cleanupCallbacks: Array<() => void> = [];

  @ViewChild('embersCanvas') embersCanvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private readonly ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }
  private loadingMessageIntervalId: ReturnType<typeof setInterval> | null = null;

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.ngZone.runOutsideAngular(() => {
        this.setupCanvas();
        this.startAnimationLoop();
      });
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.cleanupCallbacks.forEach(cb => cb());
    this.cleanupCallbacks = [];
    this.stopLoadingMessageRotation();
  }

  themeOrVerse = '';
  contentType = 'Study';
  additionalNotes = '';

  readonly isLoading = signal(false);
  readonly result = signal<StudyResponseDto | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly copied = signal(false);
  readonly activeLoadingMessageIndex = signal(0);

  readonly contentTypes = computed(() => {
    const ui = this.versionService.ui();
    return [
      { value: 'Devotional', label: ui.sagePageTypeDevotional },
      { value: 'Sermon',     label: ui.sagePageTypeSermon },
      { value: 'Study',      label: ui.sagePageTypeStudy },
    ];
  });

  readonly loadingMessages = computed(() => {
    const ui = this.versionService.ui();
    return [
      ui.sagePageLoadingStepOne,
      ui.sagePageLoadingStepTwo,
      ui.sagePageLoadingStepThree,
      ui.sagePageLoadingStepFour,
    ];
  });

  readonly currentLoadingMessage = computed(() => {
    const messages = this.loadingMessages();
    const index = this.activeLoadingMessageIndex();
    return messages[index] ?? messages[0] ?? this.versionService.ui().sagePageLoading;
  });

  private readonly languageMap: Record<string, string> = {
    pt: 'Portuguese',
    en: 'English',
    es: 'Spanish',
  };

  generate(): void {
    if (!this.themeOrVerse.trim()) return;

    const langCode = this.versionService.languageCode();
    const language = this.languageMap[langCode] ?? 'Portuguese';

    this.isLoading.set(true);
    this.activeLoadingMessageIndex.set(0);
    this.startLoadingMessageRotation();
    this.result.set(null);
    this.errorMessage.set(null);

    this.studyService
      .generateStudy({
        themeOrVerse: this.themeOrVerse.trim(),
        contentType: this.contentType,
        additionalNotes: this.additionalNotes.trim() || undefined,
        language,
      })
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.stopLoadingMessageRotation();
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set(this.versionService.ui().sagePageError);
          this.stopLoadingMessageRotation();
          this.isLoading.set(false);
        },
      });
  }

  reset(): void {
    this.stopLoadingMessageRotation();
    this.result.set(null);
    this.errorMessage.set(null);
    this.themeOrVerse = '';
    this.additionalNotes = '';
    this.contentType = 'Study';
  }

  exportToWhatsApp(): void {
    const study = this.result();
    if (!study) return;

    const ui = this.versionService.ui();
    const lines: string[] = [];

    lines.push(`📖 *${study.title}*`);
    lines.push('');

    if (study.baseVerse) {
      lines.push(`_${ui.sagePageBaseVerse}_`);
      lines.push(`_${study.baseVerse}_`);
      lines.push('');
    }

    if (study.introduction) {
      lines.push(`*${ui.sagePageIntroduction}*`);
      lines.push(study.introduction);
      lines.push('');
    }

    if (study.topics?.length) {
      for (const topic of study.topics) {
        lines.push(`🔑 *${topic.heading}*`);
        lines.push(topic.explanation);
        lines.push('');
      }
    }

    if (study.practicalApplication) {
      lines.push(`*${ui.sagePagePracticalApplication}*`);
      lines.push(study.practicalApplication);
      lines.push('');
    }

    if (study.conclusion) {
      lines.push(`*${ui.sagePageConclusion}*`);
      lines.push(study.conclusion);
      lines.push('');
    }

    lines.push('_theunveiledbible.com_');

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    });
  }

  private setupCanvas(): void {
    const canvas = this.embersCanvasRef.nativeElement;
    const context = canvas.getContext('2d');
    if (!context) return;
    this.canvasContext = context;
    this.resizeCanvas();
    const resizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', resizeHandler, { passive: true });
    this.cleanupCallbacks.push(() => window.removeEventListener('resize', resizeHandler));
  }

  private resizeCanvas(): void {
    const canvas = this.embersCanvasRef.nativeElement;
    const host = canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    const width = host.clientWidth;
    const height = host.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (this.canvasContext) this.canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private startAnimationLoop(): void {
    const frame = () => {
      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(frame);
    };
    frame();
  }

  private renderFrame(): void {
    if (!this.canvasContext) return;
    const canvas = this.embersCanvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const context = this.canvasContext;
    const now = performance.now();
    const deltaSeconds = this.lastFrameTime > 0 ? Math.min(0.05, (now - this.lastFrameTime) / 1000) : 0.016;
    this.lastFrameTime = now;
    context.clearRect(0, 0, width, height);
    this.spawnAmbientEmbers(width, height, deltaSeconds);
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const ember = this.embers[i];
      ember.life += 1;
      if (ember.life >= ember.maxLife) { this.embers.splice(i, 1); continue; }
      ember.x += ember.vx;
      ember.y += ember.vy;
      ember.vx = ember.vx * 0.996 + Math.sin((ember.life + ember.hueShift) * 0.035) * 0.003;
      ember.vy = ember.vy * 0.995 + 0.0018;
      const lifeProgress = ember.life / ember.maxLife;
      const fade = 1 - lifeProgress;
      const twinkle = 0.94 + Math.sin(ember.life * 0.18 + ember.hueShift) * 0.06;
      const alpha = ember.alpha * fade * twinkle;
      const radius = ember.size * (0.82 + fade * 0.35);
      this.drawEmber(ember.x, ember.y, radius, alpha);
    }
  }

  private spawnAmbientEmbers(width: number, height: number, deltaSeconds: number): void {
    const spawnPerSecond = Math.max(10, width / 90);
    this.emberSpawnAccumulator += spawnPerSecond * deltaSeconds;
    const spawnCount = Math.floor(this.emberSpawnAccumulator);
    if (spawnCount <= 0) return;
    this.emberSpawnAccumulator -= spawnCount;
    for (let i = 0; i < spawnCount; i++) {
      const spawnFromBottom = Math.random() < 0.35;
      this.embers.push({
        x: Math.random() * width,
        y: spawnFromBottom ? height + Math.random() * 20 : Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(0.42 + Math.random() * 0.85),
        life: 0,
        maxLife: 78 + Math.random() * 92,
        size: 0.45 + Math.random() * 1.05,
        alpha: 0.08 + Math.random() * 0.17,
        hueShift: Math.random() * 14,
      });
    }
    if (this.embers.length > 260) this.embers.splice(0, this.embers.length - 260);
  }

  private drawEmber(x: number, y: number, radius: number, alpha: number): void {
    if (!this.canvasContext) return;
    const context = this.canvasContext;
    const finalAlpha = Math.min(0.65, alpha);
    const glowRadius = radius * 2.4;
    context.beginPath();
    context.fillStyle = `rgba(255, 136, 46, ${finalAlpha * 0.26})`;
    context.arc(x, y, glowRadius, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.fillStyle = `rgba(255, 200, 120, ${finalAlpha})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  exportToPdf(): void {
    const study = this.result();
    if (!study) return;

    const ui = this.versionService.ui();

    const topicsHtml = (study.topics ?? [])
      .map(t => `<div class="topic"><h3>${t.heading}</h3><p>${t.explanation}</p></div>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>${study.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Lora:ital@0;1&family=Inter:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;color:#1a1a1a;background:#fff;padding:48px 56px;max-width:800px;margin:0 auto;line-height:1.7}
  h1{font-family:'Cinzel',serif;font-size:2rem;font-weight:700;margin-bottom:8px;color:#111;line-height:1.25}
  h2{font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:2px;text-transform:uppercase;color:#8a6a2a;margin-bottom:8px;margin-top:0}
  h3{font-family:'Cinzel',serif;font-size:0.9rem;font-weight:600;color:#111;margin-bottom:6px}
  p{font-size:0.93rem;color:#333;line-height:1.75}
  .badge{display:inline-block;font-family:'Cinzel',serif;font-size:0.68rem;letter-spacing:1.5px;text-transform:uppercase;border:1px solid #c5a059;color:#8a6a2a;padding:3px 12px;border-radius:999px;margin-bottom:20px}
  .verse{background:#fdf9f0;border-left:3px solid #c5a059;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;font-family:'Lora',serif;font-style:italic;font-size:1rem;color:#2a2a2a}
  .verse .label{font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:1.6px;text-transform:uppercase;color:#c5a059;display:block;margin-bottom:6px}
  .section{border:1px solid #e8e0d0;border-radius:10px;padding:18px 22px;margin:16px 0}
  .topic{border:1px solid #e8e0d0;border-radius:10px;padding:16px 20px;margin:10px 0}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e8e0d0;font-size:0.75rem;color:#999;text-align:center}
  @media print{body{padding:32px 40px}button{display:none}}
</style>
</head>
<body>
<div class="badge">${this.contentType}</div>
<h1>${study.title}</h1>
${study.baseVerse ? `<div class="verse"><span class="label">${ui.sagePageBaseVerse}</span>${study.baseVerse}</div>` : ''}
${study.introduction ? `<div class="section"><h2>${ui.sagePageIntroduction}</h2><p>${study.introduction}</p></div>` : ''}
${topicsHtml ? `<div>${topicsHtml}</div>` : ''}
${study.practicalApplication ? `<div class="section"><h2>${ui.sagePagePracticalApplication}</h2><p>${study.practicalApplication}</p></div>` : ''}
${study.conclusion ? `<div class="section"><h2>${ui.sagePageConclusion}</h2><p>${study.conclusion}</p></div>` : ''}
<div class="footer">theunveiledbible.com</div>
<script>window.onload=function(){window.print();}<\/script>
</body>
</html>`;

    const win = this.document.defaultView?.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  private startLoadingMessageRotation(): void {
    this.stopLoadingMessageRotation();

    this.loadingMessageIntervalId = setInterval(() => {
      const messages = this.loadingMessages();
      if (!messages.length) {
        return;
      }

      this.activeLoadingMessageIndex.update((currentIndex) => (currentIndex + 1) % messages.length);
    }, 1900);
  }

  private stopLoadingMessageRotation(): void {
    if (this.loadingMessageIntervalId !== null) {
      clearInterval(this.loadingMessageIntervalId);
      this.loadingMessageIntervalId = null;
    }
  }
}
