import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
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
