import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';// Ajuste o caminho conforme seu projeto
import { BibleService } from '../bible';

export interface DailyVerse {
  book: {
    name: string;
  };
  chapter: number;
  number: number;
  text: string;
}

interface StoredVerseCache {
  date: string;
  lang: string;
  verse: DailyVerse;
}

@Injectable({ providedIn: 'root' })
export class DailyVerseService {
  private bibleService = inject(BibleService);
  private isBrowser: boolean;
  
  private readonly STORAGE_PREFIX = 'sanctuary_verse_';

  // Lista de abreviações dos livros mais inspiradores para o versículo do dia
  // Cobre os padrões dos seus 3 JSONs (Ave Maria, KJV e RVR)
  private readonly INSPIRING_BOOKS = [
    'sl', 'ps', 'pv', 'pr', 'mt', 'mat', 'mc', 'mk', 'mrk', 'lc', 'lk', 'luk', 'jo', 'jn', 'joh', 'rm', 'rom', 'fl', 'ph', 'php'
  ];

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Resgata o versículo do dia diretamente dos seus arquivos JSON locais
   */
  async getDailyVerse(lang: string): Promise<DailyVerse | null> {
    if (!this.isBrowser) return null;

    const todayStr = this.getTodayDateString();
    const cacheKey = `${this.STORAGE_PREFIX}${todayStr}_${lang}`;

    // 1. Limpa lixo de dias anteriores
    this.cleanupOldCaches(todayStr);

    // 2. Se já estiver no cache de hoje, retorna ele para manter o mesmo versículo o dia todo
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed: StoredVerseCache = JSON.parse(cachedData);
        if (parsed.date === todayStr && parsed.lang === lang) {
          return parsed.verse;
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    // 3. Busca direto do banco de dados local carregado no app
    const books = this.bibleService.allBooks();
    if (!books || books.length === 0) return null;

    try {
      // Filtra a bíblia inteira para focar apenas nos livros inspiradores carregados
      let pool = books.filter(b => this.INSPIRING_BOOKS.includes(b.abbrev.toLowerCase()));
      
      // Fallback seguro: se o filtro falhar por algum motivo, usa a bíblia inteira
      if (pool.length === 0) pool = books;

      // Cria uma semente matemática estável baseada no dia + mês + ano 
      // Isso garante que o versículo mude todo dia, mas seja idêntico em cada recarga daquele dia
      const d = new Date();
      const seed = d.getDate() + (d.getMonth() + 1) * 31 + d.getFullYear();

      // Seleciona o Livro de forma determinística
      const bookIndex = seed % pool.length;
      const selectedBook = pool[bookIndex];

      // Seleciona o Capítulo
      const chapterIndex = seed % selectedBook.chapters.length;
      const selectedChapter = selectedBook.chapters[chapterIndex];

      // Seleciona o Versículo
      const verseIndex = seed % selectedChapter.length;
      let verseText = selectedChapter[verseIndex];

      // Limpeza fina do texto (remove asteriscos de notas se houver)
      verseText = verseText.replace(/\*$/, '').trim();

      const dailyVerse: DailyVerse = {
        book: {
          name: selectedBook.name
        },
        chapter: chapterIndex + 1,
        number: verseIndex + 1,
        text: verseText
      };

      // Salva no LocalStorage para garantir consistência nas próximas aberturas de tela do dia
      const cachePayload: StoredVerseCache = { date: todayStr, lang, verse: dailyVerse };
      localStorage.setItem(cacheKey, JSON.stringify(cachePayload));

      return dailyVerse;

    } catch (error) {
      console.error('Erro ao gerar versículo diário local:', error);
      return null;
    }
  }

  private getTodayDateString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private cleanupOldCaches(todayStr: string): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX) && !key.includes(todayStr)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {}
  }
}