import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { BibleService } from './services/bible';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  public bibleService = inject(BibleService);
  protected readonly title = signal('biblia-interativa');

  constructor(private swUpdate: SwUpdate) {}

  ngOnInit() {
    // Mantém a splash screen por 2 segundos (2000ms) para o usuário curtir a animação
    setTimeout(() => {
      const splash = document.getElementById('pwa-splash');
      if (splash) {
        splash.style.opacity = '0'; // Faz o fade out sumindo devagar
        
        // Remove completamente do HTML 500ms depois, para não travar cliques
        setTimeout(() => splash.remove(), 500); 
      }
    }, 2000); 


    if (this.swUpdate.isEnabled) {
      // 1. Verifica se há atualizações no servidor a cada vez que o app abre
      this.swUpdate.checkForUpdate();

      // 2. Quando uma nova versão estiver pronta (baixada em cache), força a troca
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          // Aqui está o pulo do gato: ativa a nova versão e recarrega a página
          this.swUpdate.activateUpdate().then(() => {
            console.log('App atualizado para a versão mais recente!');
            document.location.reload(); 
          });
        });
    }
  }
}
