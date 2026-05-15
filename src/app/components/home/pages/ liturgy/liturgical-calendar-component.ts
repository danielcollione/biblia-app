import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionService } from '../../../../services/version/version-service';

import * as RomcalModule from 'romcal';
// @ts-ignore
import { Brazil_PtBr } from '@romcal/calendar.brazil';
// @ts-ignore - Importamos a versão EN e ES do calendário geral
import { GeneralRoman_Es, GeneralRoman_En } from '@romcal/calendar.general-roman';
import { LiturgyService } from '../../../../services/liturgy/liturgy.service';
import { Router } from '@angular/router';
import { DailyVerseService } from '../../../../services/versicle/versicle';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  liturgy: any[] | null;
  colorClass: string;
  isToday: boolean;
  feastName: string;
  rankName: string;
  seasonName: string;
  colorDisplayName: string;
}

const ROMCAL_REFS_FALLBACK: any = {
  easter_sunday: { r1: 'Acts 10:34a, 37-43', ps: 'Psalm 118', gs: 'John 20:1-9' },
};

@Component({
  selector: 'app-liturgical-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './liturgical-calendar-component.html',
  styleUrls: ['./liturgical-calendar-component.scss'],
})
export class LiturgicalCalendarComponent implements OnInit {
  private readonly router = inject(Router);
  public readonly versionService = inject(VersionService);
  private readonly liturgyService = inject(LiturgyService);
  private readonly dailyVerseService = inject(DailyVerseService); // Injeção do novo serviço

  currentDate = signal(new Date());
  calendarDays = signal<CalendarDay[]>([]);
  weekDays: string[] = [];
  public isLoading = signal(false);

  // Mantidos como propriedades normais de texto para não quebrar o HTML e os compartilhamentos
  verseText = '...';
  verseRef = '';

  ngOnInit() {
    this.generateCalendar();
    this.loadDailyVerse(); // Carrega o versículo do dia ao iniciar
  }

  /**
   * Resgata o versículo do dia via storage local ou API pública
   */
  async loadDailyVerse() {
    const langCode = this.versionService.languageCode();
    try {
      const data = await this.dailyVerseService.getDailyVerse(langCode);
      if (data) {
        this.verseText = `"${data.text}"`;
        this.verseRef = `${data.book.name.toUpperCase()} ${data.chapter}:${data.number}`;
      } else {
        // Fallback caso a API caia e não haja cache anterior
        this.verseText = langCode === 'pt' 
          ? '"Entrega o teu caminho ao Senhor, confia nele, e ele o fará."' 
          : langCode === 'es'
          ? '"Encomienda al Señor tu camino, confía en él, y él hará."'
          : '"Commit thy way unto the Lord; trust also in him; and he shall bring it to pass."';
        this.verseRef = langCode === 'pt' ? 'SALMOS 37:5' : langCode === 'es' ? 'SALMOS 37:5' : 'PSALMS 37:5';
      }
    } catch (e) {
      console.error('Erro ao processar versículo diário no componente:', e);
    }
  }

  async generateCalendar() {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    const langCode = this.versionService.languageCode();

    // 1. UI: Days of Week
    this.weekDays =
      langCode === 'pt'
        ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        : langCode === 'es'
          ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
          : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // 2. Tradiction Dictionaries for Card
    const seasonMap: any = {
      pt: { ORDINARY_TIME: 'Tempo Comum', LENT: 'Quaresma', EASTER: 'Tempo Pascal', ADVENT: 'Advento', CHRISTMASTIDE: 'Tempo do Natal' },
      es: { ORDINARY_TIME: 'Tiempo Ordinario', LENT: 'Cuaresma', EASTER: 'Tiempo de Pascua', ADVENT: 'Adviento', CHRISTMASTIDE: 'Tiempo de Navidad' },
      en: { ORDINARY_TIME: 'Ordinary Time', LENT: 'Lent', EASTER: 'Easter Time', ADVENT: 'Advent', CHRISTMASTIDE: 'Christmas Time' },
    };

    const rankMap: any = {
      pt: { SOLEMNITY: 'Solenidade', FEAST: 'Festa', MEMORIAL: 'Memória', OPT_MEMORIAL: 'Memória Facultativa', FERIA: 'Féria' },
      es: { SOLEMNITY: 'Solemnidad', FEAST: 'Fiesta', MEMORIAL: 'Memoria', OPT_MEMORIAL: 'Memoria Libre', FERIA: 'Feria' },
      en: { SOLEMNITY: 'Solemnity', FEAST: 'Feast', MEMORIAL: 'Memorial', OPT_MEMORIAL: 'Optional Memorial', FERIA: 'Weekday' },
    };

    const colorDetails: any = {
      pt: { WHITE: 'Branco: Alegria, pureza e vitória.', GREEN: 'Verde: Esperança e tempo comum.', RED: 'Vermelho: Sangue dos mártires ou fogo do Espírito.', PURPLE: 'Roxo: Penitência e conversão.', VIOLET: 'Roxo: Penitência e conversão.', ROSE: 'Rosa: Alegria em meio à penitência.' },
      es: { WHITE: 'Blanco: Alegría, pureza y victoria.', GREEN: 'Verde: Esperanza y tiempo común.', RED: 'Rojo: Sangre de mártires o fuego del Espíritu.', PURPLE: 'Morado: Penitencia y conversión.', VIOLET: 'Morado: Penitencia y conversión.', ROSE: 'Rosa: Alegría en medio de la penitencia.' },
      en: { WHITE: 'White: Joy, purity, and victory.', GREEN: 'Green: Hope and ordinary time.', RED: 'Red: Blood of martyrs or fire of the Spirit.', PURPLE: 'Purple: Penance and conversion.', VIOLET: 'Violet: Penance and conversion.', ROSE: 'Rose: Joy in the midst of penance.' },
    };

    const liturgyMap = new Map<string, any>();

    try {
      const lib: any = RomcalModule;
      const RomcalConstructor = lib.Romcal || lib.default?.Romcal || lib.default;

      const calendarBundle =
        langCode === 'pt' ? Brazil_PtBr : langCode === 'es' ? GeneralRoman_Es : GeneralRoman_En;

      const romcal = new RomcalConstructor({
        localizedCalendar: calendarBundle,
        locale: langCode === 'pt' ? 'pt-BR' : langCode === 'es' ? 'es' : 'en',
      });

      const result = await romcal.generateCalendar(year);

      Object.keys(result).forEach((dateKey) => {
        const celebrations = result[dateKey];
        if (celebrations && celebrations.length > 0) {
          liturgyMap.set(dateKey, celebrations[0]);
        }
      });
    } catch (e) {
      console.error('Falha crítica no Romcal:', e);
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const days: CalendarDay[] = [];

    for (let i = 0; i < startOffset; i++) {
      days.push({
        date: new Date(), dayNumber: 0, isCurrentMonth: false, liturgy: null, colorClass: '',
        isToday: false, feastName: '', rankName: '', seasonName: '', colorDisplayName: '',
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const sMonth = String(month + 1).padStart(2, '0');
      const sDay = String(i).padStart(2, '0');
      const searchKey = `${year}-${sMonth}-${sDay}`;

      const dayData = liturgyMap.get(searchKey);
      let colorClass = 'aura-neutral', fName = '', rName = '', sName = '', cDisplay = '';

      if (dayData) {
        fName = dayData.name;
        if (fName.includes('_') || fName.includes('.')) {
          fName = fName.split('.').pop()?.replace(/_/g, ' ') || fName;
          fName = fName.charAt(0).toUpperCase() + fName.slice(1).toLowerCase();
        }

        rName = dayData.rankName || rankMap[langCode]?.[dayData.rank] || rankMap['en'][dayData.rank] || dayData.rank;
        const rawSeason = dayData.seasons?.[0] || '';
        sName = dayData.seasonNames?.[0] || seasonMap[langCode]?.[rawSeason] || seasonMap['en'][rawSeason] || rawSeason;
        const rawColor = (dayData.colors?.[0] || 'WHITE').toUpperCase();
        colorClass = `aura-${rawColor.toLowerCase()}`;
        cDisplay = colorDetails[langCode]?.[rawColor] || colorDetails['en'][rawColor] || rawColor;
      }

      days.push({
        date: new Date(year, month, i),
        dayNumber: i,
        isCurrentMonth: true,
        liturgy: dayData ? [dayData] : null,
        colorClass: colorClass,
        isToday: year === new Date().getFullYear() && month === new Date().getMonth() && i === new Date().getDate(),
        feastName: fName, rankName: rName, seasonName: sName, colorDisplayName: cDisplay,
      });
    }

    this.calendarDays.set(days);
  }

  previousMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.generateCalendar();
  }

  nextMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.generateCalendar();
  }

  copyVerse() {
    const textToCopy = `${this.verseText} - ${this.verseRef}`;
    navigator.clipboard.writeText(textToCopy).then(() => alert('Copied!'));
  }

  shareWhatsApp() {
    const textToShare = `${this.verseText} - ${this.verseRef}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`;
    window.open(whatsappUrl, '_blank');
  }

  async openReading(day: CalendarDay) {
    if (this.isLoading() || !day.liturgy) return;

    this.isLoading.set(true);
    const lang = this.versionService.languageCode();

    try {
      const result = await this.liturgyService.getFullLiturgy(day.date, lang);
      if (result) {
        this.router.navigate(['/home/liturgy/liturgy-detail'], {
          state: { liturgy: result, dayInfo: day },
        });
      } else {
        console.error('Falha ao obter dados das APIs sagradas.');
      }
    } catch (error) {
      console.error('Erro na navegação litúrgica:', error);
    } {
      this.isLoading.set(false);
    }
  }
}