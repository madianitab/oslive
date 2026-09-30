import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'os-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf],
  styleUrls: ['./topbar.component.css'],
  template: `
    <header class="os-topbar" [class.scrolled]="scrolled()">
      <a class="os-tb-brand" routerLink="/" aria-label="OSLive — início"> 
        <span class="os-tb-name">OS<b>Live</b></span>
      </a>

      <nav class="os-tb-nav">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Início</a>
        <a routerLink="/simulacoes" routerLinkActive="active">Simulações</a>
        <a routerLink="/brandkit" routerLinkActive="active">Design System</a>
      </nav>

      <button
        type="button"
        class="os-tb-theme"
        (click)="theme.toggle()"
        [attr.aria-label]="theme.theme() === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
      >
        <svg *ngIf="theme.theme() === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg *ngIf="theme.theme() !== 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
    </header>
  `,
})
export class OsTopbarComponent {
  readonly theme = inject(ThemeService);
  readonly scrolled = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    const s = window.scrollY > 12;
    if (s !== this.scrolled()) {
      this.scrolled.set(s);
    }
  }
}
