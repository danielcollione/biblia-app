import {
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { BibleService } from '../../services/bible';
import { LombadaLivro } from './lombada-livro/lombada-livro';
import { VersionService } from '../../services/version/version-service';
import { Meta, Title } from '@angular/platform-browser';
import {
  AnnotationService,
  HighlightRequestDTO,
} from '../../services/annotation/annotation.service';
import { ApplyHighlightPipe } from '../../pipes/apply-highlight.pipe';
import { ChapterCommentService } from '../../services/chapter-comment/chapter-comment.service';
import { AuthService } from '../../services/auth/auth';
import {
  AiInsightService,
  ChapterInsightRequestDTO,
  InsightResponseDTO,
} from '../../services/ai-insights/ai-insight.service';

@Component({
  selector: 'app-leitor',
  standalone: true,
  templateUrl: './leitor.html',
  styleUrl: './leitor.scss',
  imports: [LombadaLivro, ApplyHighlightPipe, CommonModule],
})
export class Leitor implements OnInit {
  authService = inject(AuthService);
  titleService = inject(Title);
  metaService = inject(Meta);
  bibleService = inject(BibleService);
  readonly location = inject(Location);
  annotationService = inject(AnnotationService);
  aiInsightService = inject(AiInsightService);
  @ViewChild('estanteLivros') estanteLivros!: ElementRef;
  isSavingNote = signal(false);

  // --- Controle do Menu Flutuante ---
  highlightMode = signal(false);
  showColorMenu = signal(false);
  selectedColor = signal('#fce83a');

  chapterCommentService = inject(ChapterCommentService);
  showNoteModal = signal(false);
  noteText = signal('');

  showChapterInsightModal = signal(false);
  chapterInsightText = signal('');
  chapterInsightTitle = signal('');

  isLoadingHighlights = signal(false);
  isLoadingComments = signal(false);
  isGeneratingChapterInsight = signal(false);

  constructor(public versionService: VersionService) {
    effect(
      () => {
        const book = this.bibleService.selectedBook();
        const chapterIndex = this.bibleService.currentChapterIndex();

        if (book && chapterIndex !== null) {
          // --- 1. Lógica dos Grifos ---
          this.annotationService.currentChapterHighlights.set([]);
          this.isLoadingHighlights.set(true); // Liga o loading

          this.annotationService.loadHighlights(book.name, chapterIndex + 1).subscribe({
            next: () => this.isLoadingHighlights.set(false), // Desliga no sucesso
            error: () => this.isLoadingHighlights.set(false), // Desliga no erro
          });

          // --- 2. Lógica das Anotações ---
          this.chapterCommentService.currentChapterComment.set(null);
          this.isLoadingComments.set(true); // Liga o loading

          this.chapterCommentService.loadComment(book.name, chapterIndex + 1).subscribe({
            next: () => this.isLoadingComments.set(false), // Desliga no sucesso
            error: () => this.isLoadingComments.set(false), // Desliga no erro
          });
        }
      },
      { allowSignalWrites: true },
    );
  }

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  getColor(index: number): string {
    const colors = ['#5c1a1a', '#1a2a3a', '#2d3a1a', '#4a3728'];
    return colors[index % 4]; // Isso replica o seu nth-child(4n + x)
  }

  ngOnInit() {
    setTimeout(() => {
      const book = 'Gênesis';
      const cap = 0;
      this.bibleService.loadChapter(book, cap);
      this.updateSEO(book, cap); // Atualiza no início
    }, 500);
  }

  isSubscriptionActive(): boolean {
    const user = this.authService.usuario();
    if (!user?.subscriptionActive || !user.subscriptionExpiresAt) {
      return false;
    }

    const expiresAt = new Date(user.subscriptionExpiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  scrollEstante(offset: number) {
    this.estanteLivros.nativeElement.scrollBy({
      left: offset,
      behavior: 'smooth',
    });
  }

  prevChapter() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = 0;
      this.bibleService.prevChapter();
    }
  }

  nextChapter() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = 0;
      this.bibleService.nextChapter();
    }
  }

  updateSEO(bookName: string, chapter: number) {
    const displayTitle = `Holy Bible | The Unveiled Bible`;

    // Atualiza o Título da Aba
    this.titleService.setTitle(displayTitle);
  }

  activateHighlightMode(colorHex: string) {
    this.selectedColor.set(colorHex);
    this.highlightMode.set(true);
    this.showColorMenu.set(false);
  }

  // Esconde o menu se o usuário clicar em qualquer outro lugar da tela
  private getAbsoluteOffset(parentElement: HTMLElement, node: Node, offset: number): number {
    let absoluteOffset = 0;
    const treeWalker = document.createTreeWalker(parentElement, NodeFilter.SHOW_TEXT, null);
    let currentNode;
    while ((currentNode = treeWalker.nextNode())) {
      if (currentNode === node) {
        absoluteOffset += offset;
        return absoluteOffset;
      }
      absoluteOffset += currentNode.nodeValue?.length || 0;
    }
    return absoluteOffset;
  }

  toggleHighlightMenu() {
    if (!this.isSubscriptionActive()) return;
    if (this.highlightMode()) {
      // Se já está grifando e clicou no botão de novo, desativa tudo
      this.highlightMode.set(false);
      this.showColorMenu.set(false);
    } else {
      // Se está desligado, abre ou fecha a paleta de cores
      this.showColorMenu.set(!this.showColorMenu());
    }
  }

  // Nova lógica acionada ao soltar o mouse
  onTextSelected(event: Event) {
    // 1. Aborta imediatamente se não estiver no "Modo de Grifar"
    if (!this.highlightMode()) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      return;
    }

    const range = selection.getRangeAt(0);

    const allVerseElements = Array.from(document.querySelectorAll('.v-prime'));
    const selectedVersesData: { verseNumber: number; startIndex: number; endIndex: number }[] = [];

    // Fatiador de versículos
    allVerseElements.forEach((verseEl) => {
      const textSpan = verseEl.querySelector('.verse-text') as HTMLElement;
      if (!textSpan) return;

      if (selection.containsNode(textSpan, true)) {
        const verseNum = parseInt(verseEl.getAttribute('data-verse') || '0', 10);
        let start = 0;
        let end = textSpan.textContent?.length || 0;

        if (textSpan.contains(range.startContainer)) {
          start = this.getAbsoluteOffset(textSpan, range.startContainer, range.startOffset);
        }

        if (textSpan.contains(range.endContainer)) {
          end = this.getAbsoluteOffset(textSpan, range.endContainer, range.endOffset);
        }

        if (start < end) {
          selectedVersesData.push({ verseNumber: verseNum, startIndex: start, endIndex: end });
        }
      }
    });

    if (selectedVersesData.length === 0) return;

    const currentBook = this.bibleService.selectedBook();
    const currentChapterIndex = this.bibleService.currentChapterIndex();

    if (!currentBook || currentChapterIndex === null) return;

    // 2. Dispara o salvamento
    selectedVersesData.forEach((selectionData) => {
      const dto: HighlightRequestDTO = {
        bookName: currentBook.name,
        chapterNumber: currentChapterIndex + 1,
        verseNumber: selectionData.verseNumber,
        language: this.versionService.languageCode() || 'pt',
        startIndex: selectionData.startIndex,
        endIndex: selectionData.endIndex,
        colorHex: this.selectedColor(), // Usa a cor que estava ativada
      };

      this.annotationService.saveHighlight(dto).subscribe({
        error: (err) =>
          console.error(`Erro ao salvar grifo no verso ${selectionData.verseNumber}:`, err),
      });
    });

    // 3. Limpa a seleção azul da tela e DESATIVA o modo de grifar
    window.getSelection()?.removeAllRanges();
    this.highlightMode.set(false);
  }

  openNoteModal() {
    if (!this.isSubscriptionActive()) return;
    const currentNote = this.chapterCommentService.currentChapterComment();
    // Se já existir nota, carrega o texto para edição; senão, inicia vazio
    this.noteText.set(currentNote ? currentNote.content : '');
    this.showNoteModal.set(true);
  }

  closeNoteModal() {
    this.showNoteModal.set(false);
  }

  openChapterInsightModal() {
    if (!this.isSubscriptionActive() || this.isGeneratingChapterInsight()) return;

    const book = this.bibleService.selectedBook();
    const chapterIndex = this.bibleService.currentChapterIndex();

    if (!book || chapterIndex === null) return;

    const request: ChapterInsightRequestDTO = {
      bookName: book.name,
      chapterNumber: chapterIndex + 1,
      language: this.versionService.languageCode() || 'pt',
    };

    this.isGeneratingChapterInsight.set(true);
    this.chapterInsightText.set('');
    this.chapterInsightTitle.set(`${book.name} ${chapterIndex + 1}`);

    this.aiInsightService.generateChapterSummaryInsight(request).subscribe({
      next: (response) => {
        this.chapterInsightText.set(this.normalizeChapterInsight(response).insightText);
        this.showChapterInsightModal.set(true);
        this.isGeneratingChapterInsight.set(false);
      },
      error: (error) => {
        console.error('Erro ao gerar insight do capítulo:', error);
        this.chapterInsightText.set('Não foi possível gerar o resumo deste capítulo no momento.');
        this.showChapterInsightModal.set(true);
        this.isGeneratingChapterInsight.set(false);
      },
    });
  }

  closeChapterInsightModal() {
    this.showChapterInsightModal.set(false);
  }

  private normalizeChapterInsight(response: InsightResponseDTO): InsightResponseDTO {
    const text = response?.insightText?.trim() || '';
    return {
      insightText: text.length <= 300 ? text : text.slice(0, 300).trim(),
    };
  }

  // Atualiza o Signal sem precisar de Angular Forms
  updateNoteText(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.noteText.set(textarea.value);
  }

  saveNote() {
    const book = this.bibleService.selectedBook();
    const chapterIndex = this.bibleService.currentChapterIndex();

    if (!book || chapterIndex === null || !this.noteText().trim()) return;

    this.isSavingNote.set(true);

    const dto = {
      bookName: book.name,
      chapterNumber: chapterIndex + 1,
      content: this.noteText(),
      language: this.versionService.languageCode() || 'pt',
    };

    this.chapterCommentService.saveComment(dto).subscribe({
      next: () => {
        this.isSavingNote.set(false);
        this.closeNoteModal();
      },
      error: (err) => {
        this.isSavingNote.set(false);
        console.error('Erro ao salvar anotação:', err);
      },
    });
  }
}
