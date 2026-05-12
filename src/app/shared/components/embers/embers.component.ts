import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  NgZone,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { CelestialParticle } from './celestial.model';

@Component({
  selector: 'app-embers',
  standalone: true,
  imports: [CommonModule],
  template: `<canvas #emberCanvas class="embers-canvas"></canvas>`,
  styles: [`.embers-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }`]
})
export class EmbersComponent implements AfterViewInit, OnDestroy {
  @ViewChild('emberCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private particles: any[] = [];
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private emberSpawnAccumulator = 0;

  constructor(private ngZone: NgZone, @Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        this.ctx = this.canvasRef.nativeElement.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.loop();
      });
    }
  }

  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  private resize() {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private loop() {
    const frame = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(frame);
    };
    frame();
  }

  private render() {
    if (!this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const now = performance.now();
    const deltaSeconds = this.lastFrameTime > 0 ? Math.min(0.05, (now - this.lastFrameTime) / 1000) : 0.016;
    this.lastFrameTime = now;

    this.ctx.clearRect(0, 0, width, height);

    // Spawn Logic (Sua lógica exata)
    const spawnPerSecond = Math.max(10, width / 90);
    this.emberSpawnAccumulator += spawnPerSecond * deltaSeconds;
    const spawnCount = Math.floor(this.emberSpawnAccumulator);
    if (spawnCount > 0) {
      this.emberSpawnAccumulator -= spawnCount;
      for (let i = 0; i < spawnCount; i++) {
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
          hueShift: Math.random() * 14
        });
      }
    }

    // Update & Draw
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }

      p.x += p.vx; p.y += p.vy;
      p.vx = p.vx * 0.996 + Math.sin((p.life + p.hueShift) * 0.035) * 0.003;
      p.vy = p.vy * 0.995 + 0.0018;

      const lifeProgress = p.life / p.maxLife;
      const fade = 1 - lifeProgress;
      const twinkle = 0.94 + Math.sin(p.life * 0.18 + p.hueShift) * 0.06;
      const alpha = Math.min(0.65, p.alpha * fade * twinkle);
      const radius = p.size * (0.82 + fade * 0.35);

      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(255, 136, 46, ${alpha * 0.26})`;
      this.ctx.arc(p.x, p.y, radius * 2.4, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(255, 200, 120, ${alpha})`;
      this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}
