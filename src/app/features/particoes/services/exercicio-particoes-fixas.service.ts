import { Injectable, computed, signal } from '@angular/core';
import { ExercicioFixas, PoliticaFixa, gerarFixas, iniciosParticoes } from '../models/exercicios-particoes';

/** Resposta do aluno a um evento: na chegada, partição e fragmentação; no término, quem entra. */
export interface RespostaFixa {
  particao: string;   // '1'..'n' ou 'fila'
  frag: string;       // KB
  entra: string;      // 'ninguem' ou nome do processo
}

export type Correcao = boolean | null;

/** Estado do exercício de partições fixas (uma instância por visita à tela). */
@Injectable()
export class ExercicioParticoesFixasService {
  readonly politica = signal<PoliticaFixa>('FIRST');
  readonly ex = signal<ExercicioFixas | null>(null);
  readonly respostas = signal<RespostaFixa[]>([]);
  readonly respostaFragFinal = signal('');
  readonly corrigido = signal(false);
  readonly mostrarResposta = signal(false);

  readonly gerado = computed(() => this.ex() !== null);
  readonly inicios = computed(() => iniciosParticoes(this.ex()?.particoes ?? []));
  /** Nomes dos processos que já chegaram até cada evento (para o "quem entra"). */
  readonly processos = computed(() => (this.ex()?.eventos ?? []).flatMap(e => e.tipo === 'chegada' ? [e.processo.nome] : []));

  readonly placar = computed(() => {
    const ex = this.ex();
    if (!ex || !this.corrigido()) return null;
    let acertos = 0;
    let total = 0;
    ex.eventos.forEach((e, i) => {
      if (e.tipo === 'chegada') {
        total++; if (this.correto(i, 'particao')) acertos++;
        if (e.particao !== null) { total++; if (this.correto(i, 'frag')) acertos++; }
      } else {
        total++; if (this.correto(i, 'entra')) acertos++;
      }
    });
    total++; if (this.corretoFragFinal()) acertos++;
    return { acertos, total, percentual: Math.round((acertos / total) * 100) };
  });

  definirPolitica(p: PoliticaFixa): void {
    this.politica.set(p);
    this.ex.set(null);
    this.limpar();
  }

  gerar(): void {
    this.ex.set(gerarFixas(this.politica()));
    this.limpar();
  }

  limpar(): void {
    const n = this.ex()?.eventos.length ?? 0;
    this.respostas.set(Array.from({ length: n }, () => ({ particao: '', frag: '', entra: '' })));
    this.respostaFragFinal.set('');
    this.corrigido.set(false);
    this.mostrarResposta.set(false);
  }

  responder(i: number, campo: keyof RespostaFixa, valor: string): void {
    this.respostas.update(l => l.map((r, k) => k === i ? { ...r, [campo]: String(valor ?? '').trim() } : r));
    this.corrigido.set(false);
  }

  responderFragFinal(v: string): void {
    this.respostaFragFinal.set(String(v ?? '').trim());
    this.corrigido.set(false);
  }

  corrigir(): void { this.corrigido.set(true); }
  alternarResposta(): void { this.mostrarResposta.update(v => !v); }

  /** Valor esperado de um campo (para o gabarito). */
  esperado(i: number, campo: keyof RespostaFixa): string {
    const e = this.ex()!.eventos[i];
    if (e.tipo === 'chegada') {
      if (campo === 'particao') return e.particao === null ? 'fila' : String(e.particao);
      if (campo === 'frag') return e.frag === null ? '—' : String(e.frag);
      return '';
    }
    return campo === 'entra' ? (e.entra ? e.entra.nome : 'ninguem') : '';
  }

  correto(i: number, campo: keyof RespostaFixa): Correcao {
    if (!this.corrigido() || !this.ex()) return null;
    const r = this.respostas()[i][campo];
    const esp = this.esperado(i, campo);
    if (campo === 'frag') return r !== '' && Number(r) === Number(esp);
    return r === esp;
  }

  corretoFragFinal(): Correcao {
    if (!this.corrigido() || !this.ex()) return null;
    const r = this.respostaFragFinal();
    return r !== '' && Number(r) === this.ex()!.fragFinal;
  }
}
