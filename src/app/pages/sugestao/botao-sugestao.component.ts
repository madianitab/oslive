import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

/** Botão flutuante, em todas as páginas, que leva ao formulário de sugestão. */
@Component({
  selector: 'app-botao-sugestao',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (visivel()) {
      <a class="botao" routerLink="/sugestao" [queryParams]="{ pagina: url() }"
         aria-label="Enviar sugestão" title="Enviar sugestão, erro ou dúvida">
        <i class="fa-regular fa-comment-dots" aria-hidden="true"></i><span>Sugestão</span>
      </a>
    }
  `,
  styles: [`
    .botao {
      position: fixed; right: 20px; bottom: 20px; z-index: 90;
      display: inline-flex; align-items: center; gap: 8px;
      padding: 9px 14px; border-radius: 999px;
      font-family: var(--f-sans); font-size: 13px; font-weight: 500; text-decoration: none;
      color: var(--text-2); background: var(--surface);
      border: 1px solid var(--line); box-shadow: var(--sh-md);
      transition: color .14s var(--ease), border-color .14s var(--ease);
    }
    .botao:hover { color: var(--a); border-color: var(--a); }
    .botao:focus-visible { outline: none; box-shadow: var(--ring); }
    .botao i { font-size: 15px; }
    @media (max-width: 640px) { .botao span { display: none; } .botao { padding: 11px; } }
  `],
})
export class BotaoSugestaoComponent {
  private readonly router = inject(Router);

  readonly url = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.router.url.split('?')[0])),
    { initialValue: this.router.url.split('?')[0] },
  );

  /** Some nas páginas de login, de sugestão e de administração. */
  visivel(): boolean {
    const u = this.url();
    return !['/sugestao', '/entrar'].includes(u) && !u.startsWith('/admin');
  }
}
