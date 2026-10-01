import { Component, computed } from '@angular/core';
import { NgStyle } from '@angular/common';
import { SimuladorEstadosService } from 'src/app/features/processos/services/simulador-estados.service';
import { Estado, NOMES_ESTADO, ROTULOS_TRANSICAO, Transicao } from 'src/app/features/processos/models/estados';

interface No { x: number; y: number; cor: string; }

/** Posições dos estados no diagrama (mesma disposição da Figura 4.2 do livro). */
export const NOS: Record<Estado, No> = {
  CRIACAO: { x: 115, y: 75, cor: '#2e7d32' },
  APTO: { x: 285, y: 190, cor: '#1e88e5' },
  EXECUTANDO: { x: 585, y: 190, cor: '#fb8c00' },
  BLOQUEADO: { x: 435, y: 395, cor: '#6a1b9a' },
  DESTRUICAO: { x: 790, y: 75, cor: '#e53935' },
};

@Component({
  selector: 'app-area-estados',
  templateUrl: './area-estados.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', './area-estados.component.css'],
  standalone: true,
  imports: [NgStyle],
})
export class AreaEstadosComponent {
  readonly nos = NOS;
  readonly estados: Estado[] = ['CRIACAO', 'APTO', 'EXECUTANDO', 'BLOQUEADO', 'DESTRUICAO'];
  readonly nomes = NOMES_ESTADO;
  readonly rotulos = ROTULOS_TRANSICAO;

  constructor(public sim: SimuladorEstadosService) {}

  readonly transicao = computed<Transicao | null>(() => this.sim.evento()?.transicao ?? null);

  /** Posição de cada processo no diagrama, conforme a foto atual. */
  readonly tokens = computed(() => {
    const f = this.sim.foto();
    const procs = this.sim.cenario().processos;
    const grupos: Record<Estado, string[]> = { CRIACAO: [], APTO: [...f.fila], EXECUTANDO: f.cpu ? [f.cpu] : [], BLOQUEADO: f.bloqueados.map(b => b.nome), DESTRUICAO: [] };
    procs.forEach(p => {
      const e = f.estados[p.nome];
      if (e === 'CRIACAO' || e === 'DESTRUICAO') grupos[e].push(p.nome);
    });
    return procs.map(p => {
      const e = f.estados[p.nome];
      const estado: Estado = e ?? 'CRIACAO';
      const lista = grupos[estado];
      const i = Math.max(0, lista.indexOf(p.nome));
      const n = Math.max(1, lista.length);
      const no = NOS[estado];
      return {
        nome: p.nome, cor: p.cor, visivel: e !== null,
        x: no.x - (n - 1) * 15 + i * 30, y: no.y + 22,
        ativo: this.sim.evento()?.processo === p.nome,
      };
    });
  });

  readonly duracao = computed(() => Array.from({ length: this.sim.cenario().duracao }, (_, i) => i));

  ativa(...t: Transicao[]): boolean {
    const atual = this.transicao();
    return !!atual && t.includes(atual);
  }

  celula(nome: string, t: number): Estado | null {
    if (this.sim.indice() < 0 || t >= this.sim.tempo()) return null;
    return this.sim.cenario().linhaTempo[nome][t] ?? null;
  }

  corEstado(e: Estado | null): string {
    return e ? NOS[e].cor : 'transparent';
  }

  rotuloEvento(i: number): string {
    const e = this.sim.cenario().eventos[i];
    return `${e.de ? this.nomes[e.de] : '—'} → ${this.nomes[e.para]}`;
  }
}
