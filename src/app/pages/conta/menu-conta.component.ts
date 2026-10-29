import { Component, ElementRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Canto direito da barra superior: "Entrar" sem login; com login, a inicial da
 * pessoa abre um menu com as áreas que exigem acesso (conforme o papel) e "Sair".
 */
@Component({
  selector: 'app-menu-conta',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (auth.usuario(); as u) {
      <button type="button" class="conta" (click)="aberto.set(!aberto())"
        aria-haspopup="menu" [attr.aria-expanded]="aberto()" [title]="nome()">
        <span class="inicial" aria-hidden="true">{{ inicial() }}</span>
        <span class="nome">{{ primeiroNome() }}</span>
        <i class="fa-solid fa-chevron-down seta" aria-hidden="true"></i>
      </button>
      @if (aberto()) {
        <div class="menu" role="menu">
          <div class="quem"><b>{{ nome() }}</b><span>{{ u.email }}</span></div>
          <a role="menuitem" routerLink="/avaliacoes">Avaliações</a>
          @if (auth.papel() === 'admin') {
            <a role="menuitem" routerLink="/admin/sugestoes">Sugestões recebidas</a>
            <a role="menuitem" routerLink="/admin/usuarios">Usuários</a>
          }
          <button type="button" role="menuitem" class="sair" (click)="sair()">Sair</button>
        </div>
      }
    } @else {
      <a class="entrar" routerLink="/entrar" [queryParams]="{ retorno: '/avaliacoes' }">Entrar</a>
    }
  `,
  styles: [`
    :host { position: relative; display: block; }
    .entrar, .conta {
      display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px;
      border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--surface);
      font-family: var(--f-sans); font-size: 13.5px; font-weight: 500; color: var(--text-2);
      text-decoration: none; cursor: pointer; transition: color .14s var(--ease), border-color .14s var(--ease);
    }
    .entrar:hover, .conta:hover { color: var(--a); border-color: var(--text-3); }
    .entrar:focus-visible, .conta:focus-visible, .menu a:focus-visible, .menu button:focus-visible { outline: none; box-shadow: var(--ring); }
    .conta { padding: 0 10px 0 4px; }
    .inicial {
      display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
      background: var(--a-soft); color: var(--a); font-family: var(--f-mono); font-size: 12px; font-weight: 600;
    }
    .nome { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .seta { font-size: 10px; color: var(--text-3); }
    .menu {
      position: absolute; right: 0; top: calc(100% + 6px); min-width: 220px; z-index: 110;
      display: flex; flex-direction: column; padding: 6px;
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md); box-shadow: var(--sh-lg);
    }
    .quem { display: flex; flex-direction: column; padding: 8px 10px 10px; margin-bottom: 4px; border-bottom: 1px solid var(--line-soft); font-size: 13px; color: var(--text); }
    .quem span { font-family: var(--f-mono); font-size: 11px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; }
    .menu a, .menu button {
      display: block; width: 100%; text-align: left; padding: 8px 10px; border: 0; border-radius: var(--r-sm);
      background: none; font-family: var(--f-sans); font-size: 13.5px; color: var(--text-2); text-decoration: none; cursor: pointer;
    }
    .menu a:hover, .menu button:hover { background: var(--surface-2); color: var(--text); }
    .sair { margin-top: 4px; border-top: 1px solid var(--line-soft) !important; border-radius: 0 0 var(--r-sm) var(--r-sm) !important; }
    @media (max-width: 640px) { .nome { display: none; } .entrar { padding: 0 10px; } }
  `],
})
export class MenuContaComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly aberto = signal(false);
  readonly nome = computed(() => this.auth.perfil()?.nome || this.auth.usuario()?.email || '');
  readonly primeiroNome = computed(() => this.nome().split(/[\s@]/)[0]);
  readonly inicial = computed(() => (this.nome()[0] ?? '?').toUpperCase());

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.aberto.set(false));
  }

  ngOnInit(): void {
    // só baixa o Supabase se este navegador já tiver entrado antes
    // (se o servidor não responder, segue mostrando "Entrar"; a página de login avisa)
    if (this.auth.temSessaoSalva()) this.auth.iniciar().catch(() => undefined);
  }

  @HostListener('document:click', ['$event'])
  fora(ev: MouseEvent): void {
    if (this.aberto() && !this.el.nativeElement.contains(ev.target as Node)) this.aberto.set(false);
  }

  @HostListener('document:keydown.escape')
  esc(): void { this.aberto.set(false); }

  async sair(): Promise<void> {
    this.aberto.set(false);
    await this.auth.sair();
    this.router.navigateByUrl('/');
  }
}
