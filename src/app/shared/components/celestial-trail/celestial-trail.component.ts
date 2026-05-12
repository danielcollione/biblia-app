import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-celestial-trail',
  standalone: true,
  imports: [CommonModule],
  template: `<canvas #trailCanvas class="trail-canvas"></canvas>`,
  styles: [`.trail-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }`]
})
export class CelestialTrailComponent implements AfterViewInit, OnDestroy {
  @ViewChild('trailCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private particles: any[] = [];
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private pointerX = -1000;
  private pointerY = -1000;
  private lastPointerX = -1000;
  private lastPointerY = -1000;

  constructor(private ngZone: NgZone, @Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        this.ctx = this.canvasRef.nativeElement.getContext('2d');
        this.resize();
        this.bindEvents();
        this.loop();
      });
    }
  }

  private bindEvents() {
    const parent = this.canvasRef.nativeElement.parentElement!;
    parent.addEventListener('pointermove', (e: any) => {
      const rect = parent.getBoundingClientRect();
      const nextX = e.clientX - rect.left;
      const nextY = e.clientY - rect.top;
      if (this.lastPointerX < 0) { this.lastPointerX = nextX; this.lastPointerY = nextY; }
      this.pointerX = nextX; this.pointerY = nextY;
      this.spawn();
      this.lastPointerX = nextX; this.lastPointerY = nextY;
    }, { passive: true });
    
    parent.addEventListener('pointerleave', () => {
      this.lastPointerX = -1000; this.lastPointerY = -1000;
      this.pointerX = -1000; this.pointerY = -1000;
    });
  }

  private spawn() {
    const distance = Math.hypot(this.pointerX - this.lastPointerX, this.pointerY - this.lastPointerY);
    const spawnCount = Math.max(8, Math.min(18, Math.round(distance / 9) + 7));

    for (let i = 0; i < spawnCount; i++) {
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
        hueShift: Math.random() * 10
      });
    }
    if (this.particles.length > 460) this.particles.splice(0, this.particles.length - 460);
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
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }

      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.992;
      p.vy = p.vy * 0.992 + 0.01;

      const lifeProgress = p.life / p.maxLife;
      const fade = 1 - lifeProgress;
      const twinkle = 0.94 + Math.sin(p.life * 0.18 + p.hueShift) * 0.06;
      
      // Sua lógica exata de Boost do Anel de Luz
      const distanceToPointer = Math.hypot(p.x - this.pointerX, p.y - this.pointerY);
      const ringCenter = 22;
      const ringWidth = 12;
      const ringDelta = distanceToPointer - ringCenter;
      const brightRingBoost = Math.exp(-(ringDelta * ringDelta) / (2 * ringWidth * ringWidth));
      
      const finalAlpha = Math.min(1, p.alpha * fade * twinkle * (1 + brightRingBoost * 1.15));
      const radius = p.size * (0.92 + fade * 0.18);
      const glowRadius = radius * (1.8 + brightRingBoost * 2.8);

      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(212, 175, 55, ${finalAlpha * 0.34})`;
      this.ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(212, 175, 55, ${finalAlpha})`;
      this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private resize() {
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.parentElement!.clientWidth * dpr;
    canvas.height = canvas.parentElement!.clientHeight * dpr;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  ngOnDestroy() { if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId); }
}