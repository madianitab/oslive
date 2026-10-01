import { Injectable, computed, signal } from '@angular/core';
import { Cenario, Evento, Foto, OpcoesCenario, gerarProcessos, simular } from '../models/estados';

export const VELOCIDADES = [
  { nome: 'Lenta', ms: 3200 },
  { nome: 'Normal', ms: 2000 },
  { nome: 'Rápida', ms: 1000 },
];

/** Estado da animação do diagrama de estados (uma instância por visita à tela). */
@Injectable()
export class SimuladorEstadosService {
  readonly opcoes = signal<OpcoesCenario>({ quantidade: 3, quantum: 2, especiais: false });
  readonly cenario = signal<Cenario>(this.criar(this.opcoes()));
  /** Índice do último evento mostrado (-1 = antes do primeiro). */
  readonly indice = signal(-1);
  readonly tocando = signal(false);
  readonly velocidade = signal(VELOCIDADES[1].ms);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly total = computed(() => this.cenario().eventos.length);
  readonly evento = computed<Evento | null>(() => this.cenario().eventos[this.indice()] ?? null);
  readonly foto = computed<Foto>(() => this.indice() < 0 ? this.cenario().inicial : this.cenario().fotos[this.indice()]);
  readonly tempo = computed(() => this.evento()?.t ?? 0);
  readonly fim = computed(() => this.indice() >= this.total() - 1);
  readonly historico = computed(() => this.cenario().eventos.slice(0, this.indice() + 1).map((e, i) => ({ e, i })).reverse());

  private criar(op: OpcoesCenario): Cenario {
    return simular(gerarProcessos(op), op.quantum);
  }

  novoCenario(op?: Partial<OpcoesCenario>): void {
    this.pausar();
    if (op) this.opcoes.update(o => ({ ...o, ...op }));
    this.cenario.set(this.criar(this.opcoes()));
    this.indice.set(-1);
  }

  reiniciar(): void {
    this.pausar();
    this.indice.set(-1);
  }

  avancar(): void {
    if (!this.fim()) this.indice.update(i => i + 1);
    if (this.fim()) this.pausar();
  }

  voltar(): void {
    this.pausar();
    if (this.indice() >= 0) this.indice.update(i => i - 1);
  }

  irPara(i: number): void {
    this.pausar();
    this.indice.set(i);
  }

  alternar(): void {
    this.tocando() ? this.pausar() : this.tocar();
  }

  tocar(): void {
    if (this.fim()) this.indice.set(-1);
    this.tocando.set(true);
    this.agendar();
  }

  pausar(): void {
    this.tocando.set(false);
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  definirVelocidade(ms: number): void {
    this.velocidade.set(ms);
  }

  private agendar(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.tocando()) return;
      this.avancar();
      if (this.tocando()) this.agendar();
    }, this.indice() < 0 ? 400 : this.velocidade());
  }
}
