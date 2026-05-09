import { Injectable, signal, Inject, PLATFORM_ID, computed, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { openDB, IDBPDatabase } from 'idb';
import { BibleVersion, VersionService } from './version/version-service';
import { Meta, Title } from '@angular/platform-browser';
import { AuthService } from './auth/auth';
import { BibleProgressService, BibleReadStateResponseDto } from './bible-progress.service';
import { XpPopupService } from './xp-popup.service';

export interface LivroMetadados {
  id: number;
  nome: string;
  cor: string;
  resumo: string;
  imagemUrl: string;
}

@Injectable({ providedIn: 'root' })
export class BibleService {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private readonly READ_CHAPTERS_STORAGE_PREFIX = 'bible_read_chapters_v2';
  private readonly LEGACY_READ_CHAPTERS_STORAGE_KEY = 'bible_read_chapters_v1';

  // SIGNALS DE ESTADO
  currentChapter = signal<any[]>([]);
  loading = signal<boolean>(false);
  allBooks = signal<any[]>([]);
  selectedBook = signal<any | null>(null);
  currentChapterIndex = signal<number | null>(null);
  currentChapterHalf1 = signal<string[]>([]);
  currentChapterHalf2 = signal<string[]>([]);
  readChapterKeys = signal<Set<string>>(new Set());

  searchTerm = signal<string>('');

  filteredBooks = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const books = this.allBooks();

    if (!term) return books;

    return books.filter(
      (livro) =>
        livro.name.toLowerCase().includes(term) ||
        this.getMetadados(livro.name).nome.toLowerCase().includes(term),
    );
  });

  // Agora os metadados também são um Signal reativo
  metadados = signal<LivroMetadados[]>([]);

  constructor(
    private http: HttpClient,
    private versionService: VersionService,
    private authService: AuthService,
    private bibleProgressService: BibleProgressService,
    private xpPopupService: XpPopupService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private titleService: Title,
    private metaService: Meta,
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.clearLegacyReadStorage();
      this.setupReadStateSync();

      this.dbPromise = openDB('BibliaDB', 2, {
        upgrade(db) {
          if (db.objectStoreNames.contains('versoes')) {
            db.deleteObjectStore('versoes');
          }
          db.createObjectStore('versoes');
        },
      });

      // Escuta a mudança de versão para carregar Bíblia + Metadados
      this.versionService.activeVersion$.subscribe((version) => {
        this.initDatabase(version);
      });
    }
  }

  private setupReadStateSync(): void {
    effect(
      () => {
        const userEmail = this.authService.usuario()?.email ?? null;
        const storageKey = this.resolveReadStorageKey(userEmail);

        this.readChapterKeys.set(this.readChapterKeysFromStorage(storageKey));

        if (!userEmail || !this.authService.getToken()) {
          return;
        }

        this.hydrateReadStateFromBackend(storageKey);
      },
      { allowSignalWrites: true }
    );
  }

  // Busca os metadados traduzidos baseando-se no ID ou Nome
  getMetadados(nomeLivro: string): LivroMetadados {
    const nomeNorm = (nomeLivro || '').toLowerCase().trim();
    if (!nomeNorm) {
      return { id: 0, nome: nomeLivro || '', cor: '#4a3728', resumo: '', imagemUrl: 'images/default-book.webp' };
    }
    const lista = this.metadados();
    return (
      lista.find(
        (m) =>
          m?.nome &&
          (m.nome.toLowerCase() === nomeNorm ||
            m.nome.toLowerCase().includes(nomeNorm)),
      ) || {
        id: 0,
        nome: nomeLivro,
        cor: '#4a3728',
        resumo: '',
        imagemUrl: 'images/default-book.webp',
      }
    );
  }

  setSearchTerm(value: string) {
    this.searchTerm.set(value);
  }

  private async initDatabase(version: BibleVersion) {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;

    this.loading.set(true);

    // 1. CARREGAR METADADOS PRIMEIRO
    const langCode = version.id.split('_')[0];
    const metaFile =
      langCode === 'pt' ? 'livros-metadados.json' : `livros-metadados-${langCode}.json`;

    this.http.get<LivroMetadados[]>(`/${metaFile}`).subscribe({
      next: (metaData) => {
        this.metadados.set(metaData); // Atualiza os metadados traduzidos

        // 2. SÓ DEPOIS CARREGA A BÍBLIA
        this.loadBibleData(db, version);
      },
      error: (err) => {
        console.error(`Erro ao carregar metadados: ${metaFile}`, err);
        this.loadBibleData(db, version); // Tenta carregar a bíblia mesmo se o meta falhar
      },
    });
  }

  private async loadBibleData(db: IDBPDatabase, version: BibleVersion) {
    const biblia = await db.get('versoes', version.id);

    if (biblia) {
      this.syncCurrentData(biblia);
      this.loading.set(false);
    } else {
      this.http.get(`/${version.file}`).subscribe({
        next: async (data: any) => {
          await db.put('versoes', data, version.id);
          this.syncCurrentData(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  private syncCurrentData(data: any) {
    const lastBookName = this.selectedBook()?.name;
    this.allBooks.set(data);

    if (lastBookName) {
      const book = data.find((b: any) => b.name === lastBookName);
      if (book) {
        this.selectedBook.set(book);
        if (this.currentChapterIndex() !== null) {
          this.selectChapter(this.currentChapterIndex()!);
        }
      }
    }
  }

  // --- Funções de Navegação ---

  selectBook(book: any) {
    this.selectedBook.set(book);
    this.currentChapterIndex.set(null);
    this.currentChapter.set([]);
    this.searchTerm.set('');
    this.updateSEO(book, 1);
  }

  selectChapter(index: number) {
    // Limpa os versículos por um milissegundo para resetar as animações
    this.currentChapterHalf1.set([]);
    this.currentChapterHalf2.set([]);

    this.currentChapterIndex.set(index);
    const book = this.selectedBook();

    if (book) {
      const fullChapter = book.chapters[index];
      this.currentChapter.set(fullChapter);

      const half = Math.ceil(fullChapter.length / 2);
      this.currentChapterHalf1.set(fullChapter.slice(0, half));
      this.currentChapterHalf2.set(fullChapter.slice(half));

      this.registerReadProgress(book.name, index + 1);
    }
  }

  isChapterRead(index: number): boolean {
    const book = this.selectedBook();
    if (!book) {
      return false;
    }

    const chapterNumber = index + 1;
    const chapterKey = this.buildChapterKey(this.resolveBibleCode(), this.normalizeBookKey(book.name), chapterNumber);
    return this.readChapterKeys().has(chapterKey);
  }

  resetNavigation() {
    this.selectedBook.set(null);
    this.currentChapterIndex.set(null);
    this.currentChapter.set([]);
  }

  async loadChapter(bookName: string, chapterIndex: number) {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    const version = this.versionService.getCurrentVersion();
    const biblia = await db.get('versoes', version.id);

    if (!biblia) return;

    const livro = biblia.find((l: any) => l.name === bookName);
    if (livro) {
      this.currentChapter.set(livro.chapters[chapterIndex]);
    }
  }

  nextChapter() {
    const books = this.allBooks();
    const currentBook = this.selectedBook();
    const currentIndex = this.currentChapterIndex();
    if (!currentBook || currentIndex === null) return;

    if (currentIndex < currentBook.chapters.length - 1) {
      this.selectChapter(currentIndex + 1);
    } else {
      const bookIndex = books.findIndex((b) => b.name === currentBook.name);
      const nextBookIndex = (bookIndex + 1) % books.length;
      this.selectBook(books[nextBookIndex]);
      this.selectChapter(0);
    }
    this.scrollToTop();
  }

  prevChapter() {
    const books = this.allBooks();
    const currentBook = this.selectedBook();
    const currentIndex = this.currentChapterIndex();
    if (!currentBook || currentIndex === null) return;

    if (currentIndex > 0) {
      this.selectChapter(currentIndex - 1);
    } else {
      const bookIndex = books.findIndex((b) => b.name === currentBook.name);
      const prevBookIndex = (bookIndex - 1 + books.length) % books.length;
      const prevBook = books[prevBookIndex];
      this.selectBook(prevBook);
      this.selectChapter(prevBook.chapters.length - 1);
    }
    this.scrollToTop();
  }

  private scrollToTop() {
    if (isPlatformBrowser(this.platformId)) {
      // O delay de 10ms é o "pulo do gato" para o Angular renderizar antes do scroll
      setTimeout(() => {
        // Buscamos especificamente o container que a imagem mostrou estar com scroll
        const containerLivro = document.querySelector('.corpo-paginas-prime');

        if (containerLivro) {
          // Reseta o scroll interno dele
          containerLivro.scrollTo({ top: 0, behavior: 'instant' });
          containerLivro.scrollTop = 0;
        }

        // Reseta o scroll global por precaução
        window.scrollTo(0, 0);
      }, 10);
    }
  }

  isReadingMode = computed(() => {
    return this.selectedBook() !== null && this.currentChapterIndex() !== null;
  });

  limparNomeParaUrl(nome: string): string {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  isNovoTestamento(nomeLivro: string): boolean {
    // Procuramos o índice desse livro no array COMPLETO (allBooks)
    const indexOriginal = this.allBooks().findIndex((b) => b.name === nomeLivro);

    // Se o índice for 39 ou maior (Mateus em diante), é NT
    return indexOriginal >= 39;
  }

  updateSEO(bookName: string, chapter: number) {
    const displayTitle = `Bíblia Sagrada | A Bíblia Revelada`;

    // Atualiza o Título da Aba
    this.titleService.setTitle(displayTitle);

    // Meta Tags em Inglês para Indexação Global
    this.metaService.updateTag({
      name: 'description',
      content: `Leia e estude ${bookName}, Capítulo ${chapter + 1} online. Explore o contexto histórico e os profundos insights espirituais das Sagradas Escrituras em A Bíblia Revelada.`,
    });

    // Open Graph (Redes Sociais)
    this.metaService.updateTag({ property: 'og:title', content: displayTitle });
    this.metaService.updateTag({
      property: 'og:description',
      content: `Immersive reading of ${bookName} ${chapter + 1}.`,
    });
    this.injectJSONLD(bookName, chapter);
  }

  injectJSONLD(book: string, chapter: number) {
    const script = document.getElementById('bible-jsonld') || document.createElement('script');
    script.id = 'bible-jsonld';
    (script as HTMLScriptElement).type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: 'The Holy Bible',
      abstract: `Reading ${book} chapter ${chapter + 1}`,
      publisher: {
        '@type': 'Organization',
        name: 'A Bíblia Revelada',
      },
    });
    if (!document.getElementById('bible-jsonld')) {
      document.head.appendChild(script);
    }
  }

  private registerReadProgress(bookName: string, chapterNumber: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.authService.getToken()) {
      return;
    }

    const bibleCode = this.resolveBibleCode();
    const bookKey = this.normalizeBookKey(bookName);

    this.bibleProgressService
      .registerChapterRead({ bibleCode, bookKey, chapterNumber })
      .subscribe({
        next: (response) => {
          this.markChapterAsRead(response.bibleCode, response.bookKey, response.chapterNumber);
          if (response.xpGranted > 0) {
            this.xpPopupService.showXp(response.xpGranted, 'Capitulo concluido');
            this.authService.refreshUserProfileFromServer();
          }
        },
        error: () => {
          // Progresso e XP são best-effort no frontend; backend segue como fonte de verdade.
        },
      });
  }

  private resolveBibleCode(): string {
    const code = this.versionService.languageCode();
    if (code === 'pt' || code === 'en' || code === 'es') {
      return code;
    }
    return 'pt';
  }

  private normalizeBookKey(bookName: string): string {
    return (bookName || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private buildChapterKey(bibleCode: string, bookKey: string, chapterNumber: number): string {
    return `${bibleCode}:${bookKey}:${chapterNumber}`;
  }

  private markChapterAsRead(bibleCode: string, bookKey: string, chapterNumber: number): void {
    const next = new Set(this.readChapterKeys());
    next.add(this.buildChapterKey(bibleCode, bookKey, chapterNumber));
    this.readChapterKeys.set(next);
    this.persistReadChapterKeys(next, this.resolveReadStorageKey(this.authService.usuario()?.email ?? null));
  }

  private readChapterKeysFromStorage(storageKey: string): Set<string> {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return new Set<string>();
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return new Set<string>();
      }

      return new Set(parsed.filter((item) => typeof item === 'string'));
    } catch {
      return new Set<string>();
    }
  }

  private persistReadChapterKeys(keys: Set<string>, storageKey: string): void {
    localStorage.setItem(storageKey, JSON.stringify([...keys]));
  }

  private hydrateReadStateFromBackend(storageKey: string): void {
    this.bibleProgressService.getReadState().subscribe({
      next: (response) => {
        const next = this.flattenReadState(response);
        this.readChapterKeys.set(next);
        this.persistReadChapterKeys(next, storageKey);
      },
      error: () => {
        // O estado local continua como fallback quando o backend estiver indisponivel.
      },
    });
  }

  private flattenReadState(response: BibleReadStateResponseDto): Set<string> {
    const keys = new Set<string>();

    Object.entries(response.chaptersReadByBibleAndBook || {}).forEach(([bibleCode, books]) => {
      Object.entries(books || {}).forEach(([bookKey, chapters]) => {
        (chapters || []).forEach((chapterNumber) => {
          if (typeof chapterNumber === 'number' && Number.isFinite(chapterNumber) && chapterNumber > 0) {
            keys.add(this.buildChapterKey(bibleCode, bookKey, chapterNumber));
          }
        });
      });
    });

    return keys;
  }

  private resolveReadStorageKey(userEmail: string | null): string {
    if (!userEmail) {
      return `${this.READ_CHAPTERS_STORAGE_PREFIX}:anonymous`;
    }

    return `${this.READ_CHAPTERS_STORAGE_PREFIX}:${userEmail.trim().toLowerCase()}`;
  }

  private clearLegacyReadStorage(): void {
    localStorage.removeItem(this.LEGACY_READ_CHAPTERS_STORAGE_KEY);
  }
}
