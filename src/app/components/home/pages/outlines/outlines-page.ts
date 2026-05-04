import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VersionService } from '../../../../services/version/version-service';
import { StudyService, StudyResponseDto } from '../../../../services/study/study.service';

@Component({
  selector: 'app-outlines-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './outlines-page.html',
  styleUrls: ['./outlines-page.scss'],
})
export class OutlinesPage {
  readonly versionService = inject(VersionService);
  private readonly studyService = inject(StudyService);

  themeOrVerse = '';
  contentType = 'Study';
  additionalNotes = '';

  readonly isLoading = signal(false);
  readonly result = signal<StudyResponseDto | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly contentTypes = computed(() => {
    const ui = this.versionService.ui();
    return [
      { value: 'Devotional', label: ui.sagePageTypeDevotional },
      { value: 'Sermon',     label: ui.sagePageTypeSermon },
      { value: 'Study',      label: ui.sagePageTypeStudy },
    ];
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
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set(this.versionService.ui().sagePageError);
          this.isLoading.set(false);
        },
      });
  }

  reset(): void {
    this.result.set(null);
    this.errorMessage.set(null);
    this.themeOrVerse = '';
    this.additionalNotes = '';
    this.contentType = 'Study';
  }
}
