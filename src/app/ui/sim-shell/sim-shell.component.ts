import { Component, Input, signal } from '@angular/core';
import { NgIf } from '@angular/common';

/**
 * Casca padrão dos simuladores: cabeçalho (título + ações),
 * sidebar de config colapsável e área principal de visualização.
 *
 * Uso:
 *   <os-sim-shell title="Escalonamento de Processos" subtitle="...">
 *     <ng-container slot="actions"> ...botões... </ng-container>
 *     <ng-container slot="config"> ...painéis de configuração... </ng-container>
 *     ...visualização (conteúdo padrão)...
 *   </os-sim-shell>
 */
@Component({
  selector: 'os-sim-shell',
  standalone: true,
  imports: [NgIf],
  styleUrls: ['./sim-shell.component.css'],
  template: `
    <section class="os-sim" [class.collapsed]="collapsed()">
      <header class="os-sim-head">
        <div class="os-sim-head-left">
          <button
            type="button"
            class="os-sim-burger"
            (click)="toggle()"
            [attr.aria-label]="collapsed() ? 'Abrir configuração' : 'Recolher configuração'"
            [attr.aria-expanded]="!collapsed()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
          <div class="os-sim-head-titles">
            <h1 class="os-sim-title">{{ title }}</h1>
            <p *ngIf="subtitle" class="os-sim-subtitle">{{ subtitle }}</p>
          </div>
        </div>
        <div class="os-sim-head-center">
          <ng-content select="[slot=actions]"></ng-content>
        </div>
        <div class="os-sim-head-right"></div>
      </header>

      <div class="os-sim-body">
        <aside class="os-sim-side" [attr.inert]="collapsed() ? '' : null">
          <div class="os-sim-side-scroll">
            <ng-content select="[slot=config]"></ng-content>
          </div>
        </aside>
        <div class="os-sim-scrim" (click)="toggle()"></div>
        <main class="os-sim-main">
          <ng-content></ng-content>
        </main>
      </div>
    </section>
  `,
})
export class OsSimShellComponent {
  @Input() title = '';
  @Input() subtitle = '';

  /** estado do painel de config (recolhido?) */
  readonly collapsed = signal(false);

  toggle(): void {
    this.collapsed.set(!this.collapsed());
  }
}
