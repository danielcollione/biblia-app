import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { BibleService } from './services/bible';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  public bibleService = inject(BibleService);
  protected readonly title = signal('biblia-interativa');

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
  }
}
