import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OsTopbarComponent } from './ui/topbar/topbar.component';
import { MenuContaComponent } from './pages/conta/menu-conta.component';
import { BotaoSugestaoComponent } from './pages/sugestao/botao-sugestao.component';

@Component({
    selector: 'app-root',
    template: `
      <os-topbar><app-menu-conta slot="conta"></app-menu-conta></os-topbar>
      <main class="app-shell-main">
        <router-outlet></router-outlet>
      </main>
      <app-botao-sugestao></app-botao-sugestao>
    `,
    standalone: true,
    imports: [RouterOutlet, OsTopbarComponent, MenuContaComponent, BotaoSugestaoComponent],
    styles: [`
      :host { display: block; }
      /* compensa a topbar fixa (60px) para o conteúdo de todas as páginas */
      .app-shell-main { padding-top: 60px; }
    `],
})
export class AppComponent {
}
