import { Injectable, computed, signal } from '@angular/core';
import { CENARIOS, Cenario, Passo } from '../models/chamadas-sistema';

export const VELOCIDADES = [
  { nome: 'Lenta', ms: 4500 },
  { nome: 'Normal', ms: 3000 },
  { nome: 'Rápida', ms: 1600 },
];

export type Visao = 'USUARIO' | 'PROJETO';

/** Estado da tela "O que é um SO" (uma instância por visita à tela). */
@Injectable()
export class ChamadasSistemaService {
  readonly cenarios = CENARIOS;
  readonly cenario = signal<Cenario>(CENARIOS[0]);
  /** Visão do usuário (SO como caixa-preta) ou visão do projeto (organização interna do SO). */
  readonly visao = signal<Visao>('PROJETO');
  /** Índice do passo mostrado (-1 = antes do primeiro). */
  readonly indice = signal(-1);
  readonly tocando = signal(false);
  readonly velocidade = signal(VELOCIDADES[1].ms);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly total = computed(() => this.cenario().passos.length);
  readonly passo = computed<Passo | null>(() => this.cenario().passos[this.indice()] ?? null);
  readonly fim = computed(() => this.indice() >= this.total() - 1);
  readonly diario = computed(() => this.cenario().passos.slice(0, this.indice() + 1).map((p, i) => ({ p, i })));

  escolher(id: string): void {
    const c = CENARIOS.find(x => x.id === id);
    if (!c) return;
    this.pausar();
    this.cenario.set(c);
    this.indice.set(-1);
  }

  definirVisao(v: Visao): void {
    this.visao.set(v);
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
