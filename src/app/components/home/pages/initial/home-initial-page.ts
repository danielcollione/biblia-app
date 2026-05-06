import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { VersionService } from '../../../../services/version/version-service';

type CelestialParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
  hueShift: number;
  kind: 'trail' | 'ember';
};

@Component({
  selector: 'app-home-initial-page',
  templateUrl: './home-initial-page.html',
  styleUrls: ['./home-initial-page.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class HomeInitialPage implements AfterViewInit, OnDestroy {
  private readonly isBrowser: boolean;
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

  @ViewChild('wrapper') wrapperRef!: ElementRef;
  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('logoImage') logoImageRef!: ElementRef<HTMLImageElement>;

  constructor(
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: object,
    public readonly versionService: VersionService,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
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

    if (this.logoImageRef?.nativeElement) {
      this.logoImageRef.nativeElement.style.transform = '';
    }
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

    this.cleanupCallbacks.push(() => wrapper.removeEventListener('pointermove', pointerMoveHandler));
    this.cleanupCallbacks.push(() => wrapper.removeEventListener('pointerleave', pointerLeaveHandler));
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

  private animateLogoTilt(): void {
    const logo = this.logoImageRef?.nativeElement;
    if (!logo) {
      return;
    }

    const smoothing = 0.12;
    this.logoCurrentRotateX += (this.logoTargetRotateX - this.logoCurrentRotateX) * smoothing;
    this.logoCurrentRotateY += (this.logoTargetRotateY - this.logoCurrentRotateY) * smoothing;

    logo.style.transform = `perspective(900px) rotateX(${this.logoCurrentRotateX.toFixed(2)}deg) rotateY(${this.logoCurrentRotateY.toFixed(2)}deg) scale(1.02)`;
  }

  private spawnTrailParticles(): void {
    const distance = Math.hypot(this.pointerX - this.lastPointerX, this.pointerY - this.lastPointerY);
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
    const deltaSeconds = this.lastFrameTime > 0 ? Math.min(0.05, (now - this.lastFrameTime) / 1000) : 0.016;
    this.lastFrameTime = now;

    context.clearRect(0, 0, width, height);
    this.animateLogoTilt();
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
        particle.vx = particle.vx * 0.996 + Math.sin((particle.life + particle.hueShift) * 0.035) * 0.003;
        particle.vy = particle.vy * 0.995 + 0.0018;
      }

      const lifeProgress = particle.life / particle.maxLife;
      const fade = 1 - lifeProgress;
      const twinkle = 0.94 + Math.sin(particle.life * 0.18 + particle.hueShift) * 0.06;
      const alpha = particle.alpha * fade * twinkle;
      const radius = particle.size * (particle.kind === 'ember' ? (0.82 + fade * 0.35) : (0.92 + fade * 0.18));

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