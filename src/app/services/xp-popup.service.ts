import { Injectable, signal } from '@angular/core';

type XpToast = {
  id: number;
  amount: number;
  message: string;
};

@Injectable({ providedIn: 'root' })
export class XpPopupService {
  readonly activeToast = signal<XpToast | null>(null);

  private queue: XpToast[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private nextId = 1;

  showXp(amount: number, message = 'Experiencia recebida'): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const toast: XpToast = {
      id: this.nextId++,
      amount: Math.round(amount),
      message,
    };

    if (!this.activeToast()) {
      this.displayToast(toast);
      return;
    }

    this.queue.push(toast);
  }

  private displayToast(toast: XpToast): void {
    this.activeToast.set(toast);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.activeToast.set(null);
      this.timeoutId = null;

      const next = this.queue.shift();
      if (next) {
        this.displayToast(next);
      }
    }, 2200);
  }
}
