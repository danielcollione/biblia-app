import { computed, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { INTERFACE_TRANSLATIONS } from './interface-translations-consts';

// Nossa lista de metadados das versões
export interface BibleVersion {
  id: string;
  name: string;
  file: string;
  flagCode?: string; // Opcional: se quiser usar ícones de bandeiras
}

export const AVAILABLE_VERSIONS: BibleVersion[] = [
  { id: 'en_kjv', name: 'English (KJV)', file: 'en_kjv.json', flagCode: 'US' },
  { id: 'pt_nvi', name: 'Português (NVI)', file: 'pt_acf.json', flagCode: 'BR' },
  { id: 'es_rvr', name: 'Español (RVR)', file: 'es_rvr.json', flagCode: 'ES' },
  // Adicione outras que você baixou
];

@Injectable({
  providedIn: 'root',
})
export class VersionService {
  private readonly STORAGE_KEY = 'biblia_active_version';

  // Define a versão inicial (pega do storage ou usa a padrão pt_nvi)
  private activeVersionSubject = new BehaviorSubject<BibleVersion>(this.getInitialVersion());

  // Observable que outros componentes vão "escutar"
  public activeVersion$ = this.activeVersionSubject.asObservable();

  constructor() {}

  // Retorna a lista completa para montar o menu
  getAvailableVersions(): BibleVersion[] {
    return AVAILABLE_VERSIONS;
  }

  // Pega o valor atual direto (útil para o Service do IndexedDB)
  getCurrentVersion(): BibleVersion {
    return this.activeVersionSubject.getValue();
  }

  // Função chamada quando o usuário clica em outro idioma
  setVersion(versionId: string): void {
    const newVersion = AVAILABLE_VERSIONS.find((v) => v.id === versionId);
    if (newVersion) {
      localStorage.setItem(this.STORAGE_KEY, newVersion.id);
      this.activeVersionSubject.next(newVersion);
      // Aqui você pode adicionar lógica extra se precisar disparar um reload dos dados
    }
  }

  private getInitialVersion(): BibleVersion {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Verifica se está no navegador
      const savedVersionId = localStorage.getItem(this.STORAGE_KEY);
      if (savedVersionId) {
        const found = AVAILABLE_VERSIONS.find((v) => v.id === savedVersionId);
        if (found) return found;
      }
    }
    return AVAILABLE_VERSIONS[0];
  }

  public languageCode = computed(() => {
    const version = this.activeVersionSubject.getValue();
    return version.id.split('_')[0]; // Retorna 'pt', 'en' ou 'es'
  });

  // Signal que entrega o objeto de tradução atual
  public ui = computed(() => {
    return INTERFACE_TRANSLATIONS[this.languageCode()] || INTERFACE_TRANSLATIONS['pt'];
  });
}
