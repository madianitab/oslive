import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OsButtonComponent } from '../../ui/button/button.component';
import { OsCardComponent } from '../../ui/card/card.component';
import { OsCardIconComponent } from '../../ui/card-icon/card-icon.component';
import { OsBadgeComponent } from '../../ui/badge/badge.component';

@Component({
  selector: 'app-simulacoes',
  standalone: true,
  imports: [OsButtonComponent, OsCardComponent, OsCardIconComponent, OsBadgeComponent],
  styleUrls: ['./simulacoes.component.css'],
  template: `
<div class="sim-page">
  <header class="sim-head">
    <div class="section-idx">Simulações</div>
    <h1 class="sim-title">Escolha um simulador</h1>
    <p class="sim-sub">Mergulhe no comportamento do sistema operacional, um módulo de cada vez.</p>
  </header>

  <!-- ───── MEMÓRIA ───── -->
  <section class="sim-group">
    <div class="sub-label">Memória</div>
    <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4">

      <os-card title="Paginação por Demanda" [accent]="true">
        <os-card-icon slot="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        </os-card-icon>
        <os-badge slot="badge" variant="s">exercícios</os-badge>
        Substituição de páginas entre memória física e disco, com exercícios passo a passo.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/PaginacaoPorDemandaExercicios')">Abrir →</os-button></div>
      </os-card>

      <os-card title="Segmentação">
        <os-card-icon slot="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="5" rx="1"/><rect x="3" y="11" width="18" height="4" rx="1"/><rect x="3" y="17" width="18" height="3" rx="1"/></svg>
        </os-card-icon>
        <os-badge slot="badge" variant="n">simulador</os-badge>
        Segmentos mapeando memória lógica para a memória física.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/Segmentacao')">Abrir →</os-button></div>
      </os-card>

      <os-card title="Exercício de Segmentação">
        <os-card-icon slot="icon" variant="ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
        </os-card-icon>
        <os-badge slot="badge" variant="s">exercícios</os-badge>
        Pratique a alocação de segmentos e fixe o conteúdo.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/ExercicioDeSegmentacao')">Abrir →</os-button></div>
      </os-card>

    </div>
  </section>

  <!-- ───── PROCESSOS ───── -->
  <section class="sim-group">
    <div class="sub-label">Processos</div>
    <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4">

      <os-card title="Escalonamento de Processos">
        <os-card-icon slot="icon" variant="info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h6l2-7 4 14 2-7h4"/></svg>
        </os-card-icon>
        <os-badge slot="badge" variant="a">interativo</os-badge>
        Round Robin, prioridades e filas de prontos em tempo real.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/EscalonamentoDeProcessos')">Abrir →</os-button></div>
      </os-card>

    </div>
  </section>
</div>
  `,
})
export class SimulacoesComponent {
  private readonly router = inject(Router);
  go(path: string): void {
    this.router.navigateByUrl(path);
  }
}
