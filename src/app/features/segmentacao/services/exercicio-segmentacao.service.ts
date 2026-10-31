import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';
import {
  BITS_FISICO,
  ByteFisico,
  ProcessoSegmentado,
  ResultadoAlocacao,
  TipoSegmento,
  alocar,
  binario,
  lacunasDe,
  ocupacao,
  traduzir,
} from '../models/segmentacao';
import {
  Correcao,
  NOMES_EX_SEG,
  PerguntaTraducaoSeg,
  QTD_PERGUNTAS_TRADUCAO,
  TIPOS_EXERCICIO_SEG,
  TipoExercicioSeg,
  gerarSegmentacao,
  normalizarBinario,
  normalizarByte,
  normalizarResposta,
} from '../models/exercicio-segmentacao';

export {
  TIPOS_EXERCICIO_SEG,
  NOMES_EX_SEG,
  QTD_PERGUNTAS_TRADUCAO,
  normalizarBinario,
  normalizarResposta,
  normalizarByte,
} from '../models/exercicio-segmentacao';
export type {
  TipoExercicioSeg,
  PerguntaTraducaoSeg,
  Correcao,
} from '../models/exercicio-segmentacao';

@Injectable()
export class ExercicioSegmentacaoService {

  readonly tipo = signal<TipoExercicioSeg>('TRADUCAO');
  readonly processos = signal<ProcessoSegmentado[]>([]);
  readonly alvo = signal<number>(0);
  readonly perguntas = signal<PerguntaTraducaoSeg[]>([]);
  /** Exercício de alocação: o novo processo e o resultado do best-fit (gabarito). */
  readonly novo = signal<{ nome: string; cor: string; tamanhos: Record<TipoSegmento, number> } | null>(null);
  readonly gabaritoAlocacao = signal<ResultadoAlocacao | null>(null);

  readonly respostasTraducao = signal<string[]>([]);
  readonly respostasTabela = signal<Record<string, string>>({});   // "C-base", "C-limite"...
  readonly respostasMemoria = signal<Record<number, string>>({});  // endereço → texto
  readonly respostaCabe = signal<string>('');                      // 'sim' | 'nao'
  readonly respostasBase = signal<Record<string, string>>({});     // "C" → base binária

  readonly corrigido = signal(false);
  readonly mostrarResposta = signal(false);

  readonly gerado = computed(() => this.processos().length > 0);
  readonly memoria = computed(() => ocupacao(this.processos()));
  readonly lacunas = computed(() => lacunasDe(this.processos()));
  readonly livre = computed(() => this.lacunas().reduce((t, l) => t + l.tamanho, 0));
  readonly processoAlvo = computed(() => this.processos()[this.alvo()] ?? null);
  readonly placar = computed(() => this.calcularPlacar());

  definirTipo(tipo: TipoExercicioSeg): void {
    this.tipo.set(tipo);
    if (this.gerado()) this.gerar();
  }

  // ───────────────────────── geração ─────────────────────────

  /** Regras em models/exercicio-segmentacao.ts; aqui só as cores. */
  gerar(): void {
    const ex = gerarSegmentacao(this.tipo());
    const usadas: ProcessoSegmentado[] = [];
    for (const p of ex.processos) { p.cor = gera_cor(usadas); usadas.push(p); }
    if (ex.novo) {
      ex.novo.cor = gera_cor(ex.processos);
      if (ex.gabaritoAlocacao?.processo) ex.gabaritoAlocacao.processo.cor = ex.novo.cor;
    }
    this.processos.set(ex.processos);
    this.alvo.set(ex.alvo);
    this.perguntas.set(ex.perguntas);
    this.novo.set(ex.novo);
    this.gabaritoAlocacao.set(ex.gabaritoAlocacao);
    this.limparRespostas();
  }

  limparRespostas(): void {
    this.respostasTraducao.set(Array(this.perguntas().length).fill(''));
    this.respostasTabela.set({});
    this.respostasMemoria.set({});
    this.respostaCabe.set('');
    this.respostasBase.set({});
    this.corrigido.set(false);
    this.mostrarResposta.set(false);
  }

  // ───────────────────────── respostas ─────────────────────────

  responderTraducao(i: number, v: string): void { this.respostasTraducao.update(r => r.map((x, k) => k === i ? v : x)); this.corrigido.set(false); }
  responderTabela(chave: string, v: string): void { this.respostasTabela.update(r => ({ ...r, [chave]: v })); this.corrigido.set(false); }
  responderMemoria(endereco: number, v: string): void { this.respostasMemoria.update(r => ({ ...r, [endereco]: v })); this.corrigido.set(false); }
  responderCabe(v: string): void { this.respostaCabe.set(v); this.corrigido.set(false); }
  responderBase(tipo: string, v: string): void { this.respostasBase.update(r => ({ ...r, [tipo]: v })); this.corrigido.set(false); }
  corrigir(): void { this.corrigido.set(true); }
  alternarResposta(): void { this.mostrarResposta.update(v => !v); }

  // ───────────────────────── gabarito e correção ─────────────────────────

  gabaritoTraducao(q: PerguntaTraducaoSeg): string {
    const r = traduzir(q.processo, q.segmento, q.deslocamento);
    return r.ok ? binario(r.fisico!, BITS_FISICO) : 'erro';
  }

  corretoTraducao(i: number): Correcao {
    if (!this.corrigido()) return null;
    return normalizarResposta(this.respostasTraducao()[i]) === this.gabaritoTraducao(this.perguntas()[i]);
  }

  corretoTabela(tipo: TipoSegmento, campo: 'base' | 'limite'): Correcao {
    if (!this.corrigido()) return null;
    const s = this.processos()[0].segmentos.find(x => x.tipo === tipo)!;
    const r = this.respostasTabela()[`${tipo}-${campo}`] ?? '';
    return campo === 'base'
      ? normalizarBinario(r) === binario(s.base, BITS_FISICO)
      : r.trim() !== '' && Number(r) === s.tamanho;
  }

  /** Exercício de memória física: endereços dos outros processos não são editáveis. */
  ehEditavel(b: ByteFisico): boolean {
    return this.tipo() === 'MEMORIA_FISICA' && (b.processo === null || b.processo === this.processoAlvo());
  }

  ehDoAlvo(b: ByteFisico): boolean {
    return b.processo !== null && b.processo === this.processoAlvo();
  }

  corretoMemoria(b: ByteFisico): Correcao {
    if (!this.corrigido()) return null;
    const r = normalizarByte(this.respostasMemoria()[b.endereco]);
    if (!this.ehDoAlvo(b)) return r === '' ? null : false;
    return r === b.conteudo;
  }

  corretoCabe(): Correcao {
    if (!this.corrigido()) return null;
    return this.respostaCabe() === (this.gabaritoAlocacao()?.ok ? 'sim' : 'nao');
  }

  baseEsperada(tipo: TipoSegmento): number | null {
    return this.gabaritoAlocacao()?.processo?.segmentos.find(s => s.tipo === tipo)?.base ?? null;
  }

  corretoBase(tipo: TipoSegmento): Correcao {
    if (!this.corrigido()) return null;
    const esperado = this.baseEsperada(tipo);
    if (esperado === null) return null;
    return normalizarBinario(this.respostasBase()[tipo]) === binario(esperado, BITS_FISICO);
  }

  private calcularPlacar(): { acertos: number; total: number } | null {
    if (!this.corrigido() || !this.gerado()) return null;
    let r: Correcao[] = [];
    switch (this.tipo()) {
      case 'TRADUCAO':
        r = this.perguntas().map((_, i) => this.corretoTraducao(i));
        break;
      case 'TABELA':
        r = (['C', 'D', 'P'] as TipoSegmento[]).flatMap(t => [this.corretoTabela(t, 'base'), this.corretoTabela(t, 'limite')]);
        break;
      case 'MEMORIA_FISICA':
        r = this.memoria().map(b => ({ b, c: this.corretoMemoria(b) }))
          .filter(x => this.ehDoAlvo(x.b) || x.c === false).map(x => x.c);
        break;
      case 'ALOCACAO':
        r = [this.corretoCabe()];
        if (this.gabaritoAlocacao()?.ok) r.push(...(['C', 'D', 'P'] as TipoSegmento[]).map(t => this.corretoBase(t)));
        break;
    }
    return { acertos: r.filter(x => x === true).length, total: r.length };
  }
}
