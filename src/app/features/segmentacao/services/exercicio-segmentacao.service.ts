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

/**
 * Exercícios de Segmentação (mesmo padrão dos exercícios de paginação simples):
 * sempre 3 processos (A, B e C) com segmentos de tamanhos aleatórios, alocados por best-fit.
 */
export type TipoExercicioSeg = 'TRADUCAO' | 'TABELA' | 'MEMORIA_FISICA' | 'ALOCACAO';

export const TIPOS_EXERCICIO_SEG: { valor: TipoExercicioSeg; nome: string; descricao: string }[] = [
  { valor: 'TRADUCAO', nome: 'Traduzir endereços',
    descricao: 'Use as tabelas de segmentos para converter endereços lógicos em físicos. Se o deslocamento não for menor que o limite (ou o segmento não existir), responda "erro": ocorre uma interrupção.' },
  { valor: 'TABELA', nome: 'Preencher a tabela de segmentos',
    descricao: 'Observe a memória física e complete a base e o limite de cada segmento do processo A.' },
  { valor: 'MEMORIA_FISICA', nome: 'Preencher a memória física',
    descricao: 'Parte da memória está ocupada por outros processos. Use a tabela de segmentos para digitar cada byte do processo no endereço físico correto, entre os espaços livres.' },
  { valor: 'ALOCACAO', nome: 'Alocar um processo (best-fit)',
    descricao: 'Um novo processo vai ser criado. Pelo best-fit (menor segmento primeiro, na menor lacuna que o comporta), diga se ele cabe e a base de cada segmento.' },
];

export const NOMES_EX_SEG = ['A', 'B', 'C'];
export const QTD_PERGUNTAS_TRADUCAO = 4;

export interface PerguntaTraducaoSeg {
  processo: ProcessoSegmentado;
  segmento: number;
  deslocamento: number;
}

export type Correcao = boolean | null;

function aleatorio(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function embaralhar<T>(lista: T[]): T[] {
  const c = [...lista];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function tamanhosAleatorios(max = 4): Record<TipoSegmento, number> {
  return { C: aleatorio(1, max), D: aleatorio(1, max), P: aleatorio(1, max) };
}

export function normalizarBinario(v: string | null | undefined): string {
  return (v ?? '').replace(/[\s|_.-]/g, '');
}

function normalizarResposta(v: string | null | undefined): string {
  const t = (v ?? '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (['ERRO', 'INTERRUPCAO', 'INT', 'X'].includes(t)) return 'erro';
  return normalizarBinario(t);
}

function normalizarByte(v: string | null | undefined): string {
  return (v ?? '').trim().toUpperCase().replace(/\s/g, '');
}

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

  /**
   * Monta a memória com A, B e C alocados por best-fit, intercalados com processos
   * temporários que depois são removidos, para deixar lacunas espalhadas.
   */
  private montarCenario(minLivre: number): ProcessoSegmentado[] | null {
    let processos: ProcessoSegmentado[] = [];
    const ordem = ['A', 'X', 'B', 'Y', 'C'];
    for (const nome of ordem) {
      const temporario = nome === 'X' || nome === 'Y';
      const r = alocar(processos, nome, temporario ? '#000000' : gera_cor(processos), tamanhosAleatorios(temporario ? 3 : 4));
      if (!r.ok) return null;
      processos = [...processos, r.processo!];
    }
    processos = processos.filter(p => NOMES_EX_SEG.includes(p.nome));
    const livre = ocupacao(processos).filter(b => !b.processo).length;
    return livre >= minLivre ? processos : null;
  }

  gerar(): void {
    const tipo = this.tipo();
    let processos: ProcessoSegmentado[] | null = null;
    let novo: { nome: string; cor: string; tamanhos: Record<TipoSegmento, number> } | null = null;
    let gabarito: ResultadoAlocacao | null = null;

    for (let tentativa = 0; tentativa < 500; tentativa++) {
      processos = this.montarCenario(tipo === 'MEMORIA_FISICA' ? 6 : 3);
      if (!processos) continue;
      if (tipo !== 'ALOCACAO') break;

      // alocação: ~70% dos exercícios o processo cabe; nos demais, falha por fragmentação externa
      const querFragmentacao = Math.random() < 0.3;
      const tamanhos = tamanhosAleatorios(querFragmentacao ? 6 : 4);
      const cor = gera_cor(processos);
      const r = alocar(processos, 'D', cor, tamanhos);
      const serve = querFragmentacao ? (!r.ok && r.motivo === 'fragmentacao') : r.ok;
      if (serve) {
        novo = { nome: 'D', cor, tamanhos };
        gabarito = r;
        break;
      }
      processos = null;
    }
    if (!processos) return;

    this.processos.set(processos);
    this.alvo.set(tipo === 'TABELA' ? 0 : aleatorio(0, processos.length - 1));
    this.perguntas.set(this.sortearPerguntas(processos));
    this.novo.set(novo);
    this.gabaritoAlocacao.set(gabarito);
    this.limparRespostas();
  }

  /** 4 perguntas de processos variados; uma delas gera interrupção (deslocamento ≥ limite). */
  private sortearPerguntas(processos: ProcessoSegmentado[]): PerguntaTraducaoSeg[] {
    const validas: PerguntaTraducaoSeg[] = [];
    processos.forEach(p => p.segmentos.forEach(s => {
      for (let d = 0; d < s.tamanho; d++) validas.push({ processo: p, segmento: s.numero, deslocamento: d });
    }));
    const escolhidas: PerguntaTraducaoSeg[] = [];
    for (const p of embaralhar(processos)) {
      if (escolhidas.length >= QTD_PERGUNTAS_TRADUCAO - 1) break;
      const c = embaralhar(validas.filter(v => v.processo === p))[0];
      if (c) escolhidas.push(c);
    }
    // pergunta com erro de proteção: deslocamento igual ou maior que o limite
    const p = embaralhar(processos)[0];
    const s = embaralhar(p.segmentos)[0];
    escolhidas.push({ processo: p, segmento: s.numero, deslocamento: aleatorio(s.tamanho, Math.min(15, s.tamanho + 3)) });
    return embaralhar(escolhidas);
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
