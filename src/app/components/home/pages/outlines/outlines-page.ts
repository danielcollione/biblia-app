import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VersionService } from '../../../../services/version/version-service';
import { StudyService, StudyResponseDto } from '../../../../services/study/study.service';
import { DOCUMENT } from '@angular/common';

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
  private readonly document = inject(DOCUMENT);
  private loadingMessageIntervalId: ReturnType<typeof setInterval> | null = null;

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

  ngOnDestroy(): void {
    this.stopLoadingMessageRotation();
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
