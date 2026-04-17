import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { openDB, IDBPDatabase } from 'idb';
import livrosMetadados from '../../../public/livros-metadados.json';

export interface LivroMetadados {
  id: number;
  nome: string;
  cor: string;
  resumo: string;
}

@Injectable({ providedIn: 'root' })
export class BibleService {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  currentChapter = signal<any[]>([]);
  loading = signal<boolean>(false);
  allBooks = signal<any[]>([]);
  selectedBook = signal<any | null>(null);
  currentChapterIndex = signal<number | null>(null);
  currentChapterHalf1 = signal<string[]>([]);
  currentChapterHalf2 = signal<string[]>([]);
  private readonly metadados: LivroMetadados[] = livrosMetadados;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object, // Injeta a identidade da plataforma
  ) {
    // A MÁGICA: Só executa se for o navegador do usuário (ignora o Node.js)
    if (isPlatformBrowser(this.platformId)) {
      this.dbPromise = openDB('BibliaDB', 1, {
        upgrade(db) {
          db.createObjectStore('versoes');
        },
      });
      this.initDatabase();
    }
  }

  getMetadados(nomeLivro: string): LivroMetadados {
    return (
      this.metadados.find((m) => m.nome === nomeLivro) || {
        id: 0,
        nome: nomeLivro,
        cor: '#4a3728',
        resumo: '',
      }
    );
  }

  // Modifique o initDatabase para preencher a lista de livros
  private async initDatabase() {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    const biblia = await db.get('versoes', 'nvi');

    if (biblia) {
      this.allBooks.set(biblia); // Já carrega a lista de livros se existir
    } else {
      this.loading.set(true);
      this.http.get('/biblia.json').subscribe(async (data: any) => {
        await db.put('versoes', data, 'nvi');
        this.allBooks.set(data);
        this.loading.set(false);
      });
    }
  }

  // Funções de navegação
  selectBook(book: any) {
    this.selectedBook.set(book);
    this.currentChapterIndex.set(null); // Reseta o capítulo ao trocar de livro
    this.currentChapter.set([]); // Limpa os versículos da tela
    console.log(book);
  }

  selectChapter(index: number) {
    this.currentChapterIndex.set(index);
    const book = this.selectedBook();

    if (book) {
      const fullChapter = book.chapters[index];
      this.currentChapter.set(fullChapter);

      // MÁGICA: Divide o array de versículos no meio
      const half = Math.ceil(fullChapter.length / 2);
      this.currentChapterHalf1.set(fullChapter.slice(0, half)); // Versículos 1 a X
      this.currentChapterHalf2.set(fullChapter.slice(half)); // Versículos X+1 a Fim
    }
  }

  resetNavigation() {
    this.selectedBook.set(null);
    this.currentChapterIndex.set(null);
    this.currentChapter.set([]);
  }

  async loadChapter(bookName: string, chapterIndex: number) {
    if (!this.dbPromise) return;

    const db = await this.dbPromise;
    const biblia = await db.get('versoes', 'nvi');

    // ESCUDO: Se a bíblia vier undefined, interrompe a função aqui para não dar erro
    if (!biblia) {
      console.warn('A Bíblia ainda não foi carregada no banco local.');
      return;
    }

    // Agora é seguro usar o .find()
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

    // Se ainda há capítulos no livro atual
    if (currentIndex < currentBook.chapters.length - 1) {
      this.selectChapter(currentIndex + 1);
    } else {
      // Fim do livro: buscar o próximo livro
      const bookIndex = books.findIndex((b) => b.name === currentBook.name);
      const nextBookIndex = (bookIndex + 1) % books.length; // Volta para o primeiro se for o último

      this.selectBook(books[nextBookIndex]);
      this.selectChapter(0); // Começa no capítulo 1 do novo livro
    }
    this.scrollToTop();
  }

  prevChapter() {
    const books = this.allBooks();
    const currentBook = this.selectedBook();
    const currentIndex = this.currentChapterIndex();

    if (!currentBook || currentIndex === null) return;

    // Se não é o primeiro capítulo
    if (currentIndex > 0) {
      this.selectChapter(currentIndex - 1);
    } else {
      // Início do livro: voltar para o livro anterior
      const bookIndex = books.findIndex((b) => b.name === currentBook.name);
      const prevBookIndex = (bookIndex - 1 + books.length) % books.length; // Vai para o último se estiver no primeiro

      const prevBook = books[prevBookIndex];
      this.selectBook(prevBook);
      // Vai para o ÚLTIMO capítulo do livro anterior
      this.selectChapter(prevBook.chapters.length - 1);
    }
    this.scrollToTop();
  }

  private scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limparNomeParaUrl(nome: string): string {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Tira acento: Gênesis -> genesis
      .replace(/\s+/g, '-'); // Tira espaço: 1 Samuel -> 1-samuel
  }
}
