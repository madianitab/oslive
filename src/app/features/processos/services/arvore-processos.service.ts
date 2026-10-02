import { Injectable, computed, signal } from '@angular/core';
import { EstadoFoto, Evento, Foto, Ordem, Resultado, simular } from '../models/arvore-processos';
import { EXEMPLOS_FORK } from '../models/exemplos-fork';
import { contrastText } from 'src/app/core/utils';

/** Cores dos processos, na ordem de criação. */
const PALETA = ['#4f7cf7', '#f2994a', '#27ae60', '#e5534b', '#9b51e0', '#1fa2c9', '#e0b324', '#e84393', '#16a085', '#a1887f', '#6c5ce7', '#8bb32f'];

export function corProcesso(ordem: number): string {
  return ordem < PALETA.length ? PALETA[ordem] : `hsl(${(ordem * 137.5) % 360}, 58%, 52%)`;
}

const MODELO_VAZIO = 'int main() {\n    \n}\n';

/** Estado da tela de árvore de processos (uma instância por visita). */
@Injectable()
export class ArvoreProcessosService {
  readonly exemplos = EXEMPLOS_FORK;
  readonly exemplo = signal(EXEMPLOS_FORK[0].id);
  readonly codigo = signal(EXEMPLOS_FORK[0].codigo);
  readonly ordem = signal<Ordem>('pai');
  readonly semente = signal(1);
  readonly resultado = signal<Resultado>(simular(EXEMPLOS_FORK[0].codigo));
  /** O código mudou depois da última execução. */
  readonly alterado = signal(false);
  /** Índice do evento mostrado (a tela abre no último). */
  readonly indice = signal(this.resultado().eventos.length - 1);
  readonly tocando = signal(false);
  readonly velocidade = signal(1);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly total = computed(() => this.resultado().eventos.length);
  readonly evento = computed<Evento | null>(() => this.resultado().eventos[this.indice()] ?? null);
  readonly foto = computed<Foto | null>(() => this.resultado().fotos[this.indice()] ?? null);
  readonly saida = computed(() => this.resultado().saida.slice(0, this.foto()?.nSaida ?? 0));
  readonly cores = computed(() => {
    const m: Record<number, string> = {};
    this.resultado().processos.forEach(p => m[p.pid] = corProcesso(p.ordem));
    return m;
  });
  /** Cor de texto legível sobre a cor de cada processo. */
  readonly textos = computed(() => {
    const m: Record<number, string> = {};
    Object.entries(this.cores()).forEach(([pid, cor]) => m[+pid] = contrastText(cor) || '#fff');
    return m;
  });

  estadoDe(pid: number): EstadoFoto | null {
    return this.foto()?.procs[pid] ?? null;
  }

  executar(): void {
    this.pausar();
    const r = simular(this.codigo(), { ordem: this.ordem(), semente: this.semente() });
    this.resultado.set(r);
    this.indice.set(r.eventos.length - 1);
    this.alterado.set(false);
  }

  /** Outra execução possível: ordem aleatória com nova semente. */
  outraExecucao(): void {
    this.ordem.set('aleatoria');
    this.semente.update(s => s + 1);
    this.executar();
  }

  definirOrdem(o: Ordem): void {
    this.ordem.set(o);
    this.executar();
  }

  carregarExemplo(id: string): void {
    const ex = this.exemplos.find(e => e.id === id);
    if (!ex) return;
    this.exemplo.set(id);
    this.codigo.set(ex.codigo);
    this.executar();
  }

  editar(codigo: string): void {
    this.codigo.set(codigo);
    this.alterado.set(true);
  }

  limpar(): void {
    this.pausar();
    this.exemplo.set('');
    this.codigo.set(MODELO_VAZIO);
    this.resultado.set(simular(MODELO_VAZIO));
    this.indice.set(-1);
    this.alterado.set(true);
  }

  // ─── reprodução passo a passo ───
  irPara(i: number): void {
    this.pausar();
    this.indice.set(Math.max(0, Math.min(i, this.total() - 1)));
  }

  passo(d: number): void {
    this.irPara(this.indice() + d);
  }

  tocar(): void {
    if (this.total() === 0) return;
    if (this.indice() >= this.total() - 1) this.indice.set(0);
    this.tocando.set(true);
    this.agendar();
  }

  pausar(): void {
    this.tocando.set(false);
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private agendar(): void {
    this.timer = setTimeout(() => {
      if (!this.tocando()) return;
      if (this.indice() >= this.total() - 1) { this.pausar(); return; }
      this.indice.update(i => i + 1);
      this.agendar();
    }, 900 / this.velocidade());
  }
}
