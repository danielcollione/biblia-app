import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { PrayersService } from '../../../../../services/prayers/prayers.service';
import { VersionService } from '../../../../../services/version/version-service';

@Component({
  selector: 'app-create-prayer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-prayer-modal.html',
  styleUrl: './create-prayer-modal.scss'
})
export class CreatePrayerModal {
  private readonly prayersService = inject(PrayersService);
  readonly versionService = inject(VersionService);

  readonly closed = output<void>();
  readonly created = output<void>();

  readonly maxPrayerLength = 280;
  readonly newPrayerContent = signal('');
  readonly isSubmitting = signal(false);
  readonly modalError = signal<string | null>(null);

  readonly remainingCharacters = computed(() => Math.max(0, this.maxPrayerLength - this.newPrayerContent().length));
  readonly canSubmitPrayer = computed(() => {
    const content = this.newPrayerContent().trim();
    return content.length > 0 && content.length <= this.maxPrayerLength;
  });

  dismiss(): void {
    this.closed.emit();
  }

  updatePrayerContent(content: string): void {
    this.newPrayerContent.set((content ?? '').slice(0, this.maxPrayerLength));
  }

  submit(): void {
    if (!this.canSubmitPrayer()) {
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set(null);

    const content = this.newPrayerContent().trim();
    this.prayersService.create(content)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.created.emit();
        },
        error: (err) => {
          if (typeof err?.error === 'string' && err.error.trim()) {
            this.modalError.set(err.error);
            return;
          }

          this.modalError.set(err?.error?.message || 'Erro ao publicar');
        }
      });
  }
}
