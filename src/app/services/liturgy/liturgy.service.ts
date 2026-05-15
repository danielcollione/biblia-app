import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';// Ajuste o caminho conforme seu projeto
import { BibleService } from '../bible';

@Injectable({ providedIn: 'root' })
export class LiturgyService {
  private http = inject(HttpClient);
  private bibleService = inject(BibleService);

  private readonly PT_MAP: any = {
    'Genesis': 'gn', 'Exodus': 'ex', 'Leviticus': 'lv', 'Numbers': 'nm', 'Deuteronomy': 'dt',
    'Joshua': 'js', 'Judges': 'jz', 'Ruth': 'rt', '1 Samuel': '1sm', '2 Samuel': '2sm',
    '1 Kings': '1rs', '2 Kings': '2rs', '1 Chronicles': '1cr', '2 Chronicles': '2cr',
    'Ezra': 'esd', 'Nehemiah': 'ne', 'Tobit': 'tb', 'Judith': 'jdt', 'Esther': 'est',
    '1 Maccabees': '1mc', '2 Maccabees': '2mc', 'Job': 'jb', 'Psalms': 'sl', 'Psalm': 'sl',
    'Proverbs': 'pv', 'Ecclesiastes': 'ec', 'Song of Solomon': 'ct', 'Wisdom': 'sab',
    'Sirach': 'ecl', 'Isaiah': 'is', 'Jeremiah': 'jr', 'Lamentations': 'lm', 'Baruch': 'bar',
    'Ezekiel': 'ez', 'Daniel': 'dn', 'Hosea': 'os', 'Joel': 'jl', 'Amos': 'am', 'Obadiah': 'ab',
    'Jonah': 'jon', 'Micah': 'mq', 'Nahum': 'na', 'Habakkuk': 'hb', 'Zephaniah': 'sf',
    'Haggai': 'ag', 'Zechariah': 'zc', 'Malachi': 'ml', 'Matthew': 'mt', 'Mark': 'mc',
    'Luke': 'lc', 'John': 'jo', 'Acts': 'at', 'Romans': 'rm', '1 Corinthians': '1cor',
    '2 Corinthians': '2cor', 'Galatians': 'gl', 'Ephesians': 'ef', 'Philippians': 'fl',
    'Colossians': 'cl', '1 Thessalonians': '1ts', '2 Thessalonians': '2ts', '1 Timothy': '1tm',
    '2 Timothy': '2tm', 'Titus': 'tt', 'Philemon': 'fm', 'Hebrews': 'hb', 'James': 'tg',
    '1 Peter': '1pe', '2 Peter': '2pe', '1 John': '1jo', '2 John': '2jo', '3 John': '3jo',
    'Jude': 'jd', 'Revelation': 'ap'
  };

  private readonly COMMON_MAP: any = {
    'Genesis': 'gn', 'Exodus': 'ex', 'Leviticus': 'lv', 'Numbers': 'nm', 'Deuteronomy': 'dt',
    'Joshua': 'js', 'Judges': 'jud', 'Ruth': 'rt', '1 Samuel': '1sm', '2 Samuel': '2sm',
    'Job': 'jb', 'Psalms': 'ps', 'Psalm': 'ps', 'Isaiah': 'is', 'Jeremiah': 'jr', 'Lamentations': 'lm',
    'Ezekiel': 'ez', 'Daniel': 'dn', 'Matthew': 'mt', 'Mark': 'mk', 'Luke': 'lk', 'John': 'jo', 'Acts': 'acts',
    'Romans': 'rm', '1 Corinthians': '1cor', '2 Corinthians': '2cor', 'Galatians': 'gl',
    'Ephesians': 'ep', 'Philippians': 'ph', 'Colossians': 'cl', 'Hebrews': 'hb', 'James': 'jm',
    '1 Peter': '1pe', '2 Peter': '2pe', '1 John': '1jo', 'Jude': 'jd', 'Revelation': 'ap'
  };

  private readonly BOOK_TRANSLATIONS: any = {
    pt: {
      'Genesis': 'Gênesis', 'Exodus': 'Êxodo', 'Leviticus': 'Levítico', 'Numbers': 'Números', 'Deuteronomy': 'Deuteronômio',
      'Joshua': 'Josué', 'Judges': 'Juízes', 'Ruth': 'Rute', '1 Samuel': '1 Samuel', '2 Samuel': '2 Samuel',
      '1 Kings': '1 Reis', '2 Kings': '2 Reis', '1 Chronicles': '1 Crônicas', '2 Chronicles': '2 Crônicas',
      'Ezra': 'Esdras', 'Nehemiah': 'Neemias', 'Tobit': 'Tobias', 'Judith': 'Judite', 'Esther': 'Ester',
      'Job': 'Jó', 'Psalms': 'Salmos', 'Psalm': 'Salmos', 'Proverbs': 'Provérbios', 'Ecclesiastes': 'Eclesiastes',
      'Isaiah': 'Isaías', 'Jeremiah': 'Jeremias', 'Ezekiel': 'Ezequiel', 'Daniel': 'Daniel', 'Jonah': 'Jonas',
      'Matthew': 'Mateus', 'Mark': 'Marcos', 'Luke': 'Lucas', 'John': 'João', 'Acts': 'Atos', 'Romans': 'Romanos',
      '1 Corinthians': '1 Coríntios', '2 Corinthians': '2 Coríntios', 'Galatians': 'Gálatas', 'Ephesians': 'Efésios',
      'Philippians': 'Filipenses', 'Colossians': 'Colossenses', 'Hebrews': 'Hebreus', 'James': 'Tiago',
      '1 Peter': '1 Pedro', '2 Peter': '2 Pedro', '1 John': '1 João', 'Jude': 'Judas', 'Revelation': 'Apocalipse'
    },
    es: {
      'Genesis': 'Génesis', 'Exodus': 'Éxodo', 'Leviticus': 'Levítico', 'Numbers': 'Números', 'Deuteronomy': 'Deuteronomio',
      'Joshua': 'Josué', 'Judges': 'Jueces', 'Ruth': 'Rut', '1 Samuel': '1 Samuel', '2 Samuel': '2 Samuel',
      '1 Kings': '1 Reyes', '2 Kings': '2 Reyes', '1 Chronicles': '1 Crónicas', '2 Chronicles': '2 Crónicas',
      'Job': 'Job', 'Psalms': 'Salmos', 'Psalm': 'Salmos', 'Proverbs': 'Proverbios', 'Ecclesiastes': 'Eclesiastés',
      'Isaiah': 'Isaías', 'Jeremiah': 'Jeremías', 'Ezekiel': 'Ezequiel', 'Daniel': 'Daniel', 'Jonah': 'Jonás',
      'Matthew': 'Mateo', 'Mark': 'Marcos', 'Luke': 'Lucas', 'John': 'Juan', 'Acts': 'Hechos', 'Romans': 'Romanos',
      '1 Corinthians': '1 Corintios', '2 Corinthians': '2 Corintios', 'Galatians': 'Gálatas', 'Ephesians': 'Efesios',
      'Philippians': 'Filipenses', 'Colossians': 'Colenses', 'Hebrews': 'Hebreos', 'James': 'Santiago',
      '1 Peter': '1 Pedro', '2 Peter': '2 Pedro', '1 John': '1 Juan', 'Jude': 'Judas', 'Revelation': 'Apocalipsis'
    }
  };

  async getFullLiturgy(date: Date, lang: string) {
    try {
      const year = date.getFullYear();
      const dm = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const url = `https://cpbjr.github.io/catholic-readings-api/readings/${year}/${dm}.json`;

      const data = await firstValueFrom(this.http.get<any>(url));
      if (!data || !data.readings) return null;

      const r = data.readings;

      return {
        date: data.date,
        primeiraLeitura: { 
          referencia: this.formatRefForUI(r.firstReading, lang), 
          texto: this.getTextFromLocal(r.firstReading, lang) 
        },
        salmo: { 
          referencia: this.formatRefForUI(r.psalm, lang), 
          texto: this.getTextFromLocal(r.psalm, lang) 
        },
        evangelho: { 
          referencia: this.formatRefForUI(r.gospel, lang), 
          texto: this.getTextFromLocal(r.gospel, lang) 
        },
      };
    } catch (error) { return null; }
  }

  private getTextFromLocal(refString: string, lang: string): string {
    if (!refString) return '';

    try {
      const match = refString.match(/^(\d?\s?[a-zA-Z]+)\s+(.*)$/);
      if (!match) return 'Referência inválida.';

      const bookNameEn = match[1].trim(); 
      const rest = match[2].trim();
      let chapterNum = 1;
      let versesPart = '';

      if (rest.includes(':')) {
        const parts = rest.split(':');
        chapterNum = parseInt(parts[0], 10);
        versesPart = parts[1].replace(/\s/g, '');
      } else {
        chapterNum = 1;
        versesPart = rest.replace(/\s/g, '');
      }

      // FALLBACK DE SEGURANÇA PARA DANIEL 3:52-56 (Ausente em versões protestantes KJV/RVR)
      if (bookNameEn === 'Daniel' && chapterNum === 3 && lang !== 'pt') {
        if (lang === 'es') {
          return "52. Bendito eres, Señor, Dios de nuestros padres, loable y ensalzado por los siglos. Bendito tu santo y glorioso nombre, loable y ensalzado por los siglos. 53. Bendito eres en el templo de tu santa gloria, loable y glorioso por los siglos. 54. Bendito eres en el trono de tu reino, loable y ensalzado por los siglos. 55. Bendito eres tú, que sentado sobre querubines sondas los abismos, loable y ensalzado por los siglos. 56. Bendito eres en el firmamento del cielo, loable y glorioso por los siglos.";
        } else {
          return "52. Blessed are you, Lord, the God of our ancestors, praiseworthy and exalted above all forever; And blessed is your holy, glorious name, praiseworthy and exalted above all forever. 53. Blessed are you in the temple of your holy glory, praiseworthy and glorious above all forever. 54. Blessed are you on the throne of your kingdom, praiseworthy and exalted above all forever. 55. Blessed are you who look into the depths from your throne upon the cherubim, praiseworthy and exalted above all forever. 56. Blessed are you in the firmament of heaven, praiseworthy and glorious forever.";
        }
      }

      const books = this.bibleService.allBooks();
      if (!books || books.length === 0) return 'Carregando Bíblia...';

      let book: any;

      if (lang === 'pt') {
        const ptName = this.BOOK_TRANSLATIONS.pt[bookNameEn] || bookNameEn;
        // BUSCA EXATA PELO NOME EM PORTUGUÊS (Evita o match de Jó em João)
        book = books.find(b => b.name.toLowerCase() === ptName.toLowerCase());
        
        if (!book) {
          const targetAbbrev = this.PT_MAP[bookNameEn] || bookNameEn.toLowerCase();
          book = books.find(b => b.abbrev.toLowerCase() === targetAbbrev.toLowerCase());
        }
      } else {
        // Para EN/ES, os arquivos utilizam os nomes em inglês nativos da base original
        book = books.find(b => b.name.toLowerCase() === bookNameEn.toLowerCase());

        if (!book) {
          const targetAbbrev = this.COMMON_MAP[bookNameEn] || bookNameEn.toLowerCase();
          book = books.find(b => b.abbrev.toLowerCase() === targetAbbrev.toLowerCase());
        }
      }

      if (!book) return `Livro ${bookNameEn} não encontrado no sistema local (${lang}).`;
      if (chapterNum > book.chapters.length) return `Capítulo ${chapterNum} não existe em ${book.name}.`;
      
      const chapter = book.chapters[chapterNum - 1];
      return this.filterVerses(chapter, versesPart);
    } catch (e) { return 'Erro ao processar texto.'; }
  }

  private filterVerses(chapter: string[], versesStr: string): string {
    if (!versesStr) return chapter.join(' ');
    
    const included = new Set<number>();
    versesStr.split(',').forEach(part => {
      if (part.includes('-')) {
        const parts = part.split('-');
        const startMatch = parts[0].match(/\d+/);
        const endMatch = parts[1].match(/\d+/);
        if (startMatch && endMatch) {
          const start = parseInt(startMatch[0], 10);
          const end = parseInt(endMatch[0], 10);
          for (let i = start; i <= end; i++) included.add(i);
        }
      } else {
        const verseMatch = part.match(/\d+/);
        if (verseMatch) included.add(parseInt(verseMatch[0], 10));
      }
    });

    return chapter
      .filter((_, index) => included.has(index + 1))
      .map(v => v.replace(/\*$/, '')) 
      .join(' ');
  }

  private formatRefForUI(ref: string, lang: string): string {
    const match = ref.match(/^(\d?\s?[a-zA-Z]+)\s+(.*)$/);
    if (!match) return ref.toUpperCase();

    const bookEn = match[1].trim();
    const metadatos = this.bibleService.metadados();
    const currentMap = (lang === 'pt') ? this.PT_MAP : this.COMMON_MAP;
    const targetAbbrev = currentMap[bookEn] || bookEn.toLowerCase();
    
    const meta = metadatos.find(m => 
      m.nome.toLowerCase() === bookEn.toLowerCase() || 
      (lang === 'pt' && this.BOOK_TRANSLATIONS.pt[bookEn]?.toLowerCase() === m.nome.toLowerCase()) ||
      (lang === 'es' && this.BOOK_TRANSLATIONS.es[bookEn]?.toLowerCase() === m.nome.toLowerCase()) ||
      (m as any).abbrev?.toLowerCase() === targetAbbrev
    );
    
    return meta ? `${meta.nome.toUpperCase()} ${match[2]}` : ref.toUpperCase();
  }

  private translateRef(ref: string, lang: string): string {
    if (!ref || lang === 'en') return ref;
    const mapping = this.BOOK_TRANSLATIONS[lang];
    const match = ref.match(/^(\d?\s?[a-zA-Z]+)\s+(.*)$/);
    if (!match || !mapping) return ref;
    const book = match[1].trim();
    const translated = mapping[book] || book;
    return `${translated} ${match[2]}`;
  }
}