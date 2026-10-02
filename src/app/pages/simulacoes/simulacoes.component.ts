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

  <section class="sim-group">
    <h2 class="group-title">Processos</h2>
    <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 sim-deck">
      <os-card title="Estados do Processo">
        <os-card-icon slot="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="6" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="20" r="2.5"/><path d="M7 7.5l3 3M14 10.5l3-3M12 14.5v3"/></svg></os-card-icon>
        <os-badge slot="badge" variant="a">simulador</os-badge>
        Animação do diagrama de estados: criação, apto, executando, bloqueado e destruição, com cenários aleatórios.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/processos/estados')">Abrir →</os-button></div>
      </os-card>
      <os-card title="Árvore de Processos">
        <os-card-icon slot="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="2.5" width="6" height="5" rx="1"/><rect x="2.5" y="16.5" width="6" height="5" rx="1"/><rect x="15.5" y="16.5" width="6" height="5" rx="1"/><path d="M12 7.5v4M5.5 16.5v-2.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2.5"/></svg></os-card-icon>
        <os-badge slot="badge" variant="a">simulador</os-badge>
        Programa em C com fork(), wait(), waitpid(), sleep() e exit(): saída, árvore de processos, zumbis e órfãos.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/processos/arvore')">Abrir →</os-button></div>
      </os-card>
    </div>
  </section>

  <section class="sim-group">
    <h2 class="group-title">Escalonamento de Processos</h2>
    <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 sim-deck">
      <os-card title="Simulador">
        <os-card-icon slot="icon" variant="info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h6l2-7 4 14 2-7h4"/></svg></os-card-icon>
        <os-badge slot="badge" variant="a">simulador</os-badge>
        FIFO, SJF, prioridades, Round Robin e múltiplas filas com a CPU em tempo real.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/escalonamento/simulador')">Abrir →</os-button></div>
      </os-card>
      <os-card title="Exercícios">
        <os-card-icon slot="icon" variant="info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h6l2-7 4 14 2-7h4"/></svg></os-card-icon>
        <os-badge slot="badge" variant="s">exercícios</os-badge>
        Preencha a tabela de espera/turnaround ou o diagrama de CPU e corrija na hora.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/escalonamento/exercicios')">Abrir →</os-button></div>
      </os-card>
    </div>
  </section>

  <section class="sim-group">
    <h2 class="group-title">Partições (alocação contígua)</h2>
    <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 sim-deck">
      <os-card title="Partições Fixas">
        <os-card-icon slot="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 14h18"/></svg></os-card-icon>
        <os-badge slot="badge" variant="a">simulador</os-badge>
        Partições definidas antes da execução, tabela de partições e fragmentação interna em destaque.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/particoes/fixas')">Abrir →</os-button></div>
      </os-card>
      <os-card title="Partições Variáveis">
        <os-card-icon slot="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 7h18M3 15h18M3 18h18"/></svg></os-card-icon>
        <os-badge slot="badge" variant="a">simulador</os-badge>
        First, best, worst e circular-fit na mesma simulação, fragmentação externa, compactação e swapping.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/particoes/variaveis')">Abrir →</os-button></div>
      </os-card>
    </div>
  </section>

  <section class="sim-group">
    <h2 class="group-title">Paginação</h2>
    <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 sim-deck">
      <os-card title="Simulador de Paginação Simples">
        <os-card-icon slot="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></os-card-icon>
        <os-badge slot="badge" variant="a">simulador</os-badge>
        Páginas, quadros, tabela de páginas, fragmentação interna e tradução de endereços.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/paginacao/simulador-simples')">Abrir →</os-button></div>
      </os-card>
      <os-card title="Exercícios de Paginação Simples">
        <os-card-icon slot="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></os-card-icon>
        <os-badge slot="badge" variant="s">exercícios</os-badge>
        Traduza endereços e complete a memória física, a tabela de páginas e os cálculos.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/paginacao/exercicios-simples')">Abrir →</os-button></div>
      </os-card>
      <os-card title="Simulador de Paginação por Demanda">
        <os-card-icon slot="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></os-card-icon>
        <os-badge slot="badge" variant="a">simulador</os-badge>
        Carga sob demanda e substituição de páginas por FIFO ou Segunda Chance.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/paginacao/simulador-demanda')">Abrir →</os-button></div>
      </os-card>
      <os-card title="Exercícios de Paginação por Demanda">
        <os-card-icon slot="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></os-card-icon>
        <os-badge slot="badge" variant="s">exercícios</os-badge>
        Complete as memórias lógica e física e descubra a página vítima (FIFO, histórico de bits, segunda chance).
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/paginacao/exercicios')">Abrir →</os-button></div>
      </os-card>
    </div>
  </section>

  <section class="sim-group">
    <h2 class="group-title">Segmentação</h2>
    <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 sim-deck">
      <os-card title="Simulador">
        <os-card-icon slot="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="5" rx="1"/><rect x="3" y="11" width="18" height="4" rx="1"/><rect x="3" y="17" width="18" height="3" rx="1"/></svg></os-card-icon>
        <os-badge slot="badge" variant="a">simulador</os-badge>
        Segmentos de código, dados e pilha, alocação best-fit passo a passo e tradução com verificação de limite.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/segmentacao/simulador')">Abrir →</os-button></div>
      </os-card>
      <os-card title="Exercícios">
        <os-card-icon slot="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="5" rx="1"/><rect x="3" y="11" width="18" height="4" rx="1"/><rect x="3" y="17" width="18" height="3" rx="1"/></svg></os-card-icon>
        <os-badge slot="badge" variant="s">exercícios</os-badge>
        Traduza endereços, complete tabela de segmentos e memória física e aloque processos por best-fit.
        <div slot="footer"><os-button variant="p" size="sm" (click)="go('/segmentacao/exercicios')">Abrir →</os-button></div>
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
