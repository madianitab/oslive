import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';
import {
  MAX_BYTES_PROCESSO,
  QUANTIDADE_QUADROS,
  TAMANHO_PAGINA,
  binario,
} from './simulador-paginacao-simples.service';

/**
 * Exercícios de Paginação Simples (mesmo modelo do simulador):
 * páginas/quadros de 4 bytes, memória física de 32 bytes (8 quadros),
 * endereço lógico = página (2 bits) + deslocamento (2 bits),
 * endereço físico = quadro (3 bits) + deslocamento (2 bits).
 * Todo exercício tem 3 processos com tamanhos aleatórios.
 */
export type TipoExercicioSimples = 'TRADUCAO' | 'MEMORIA_FISICA' | 'TABELA' | 'CALCULOS';

export const TIPOS_EXERCICIO_SIMPLES: { valor: TipoExercicioSimples; nome: string; descricao: string }[] = [
  { valor: 'TRADUCAO', nome: 'Traduzir endereços',
    descricao: 'Use as tabelas de páginas para converter endereços lógicos em endereços físicos.' },
  { valor: 'MEMORIA_FISICA', nome: 'Preencher a memória física',
    descricao: 'A memória física está vazia. Use a tabela de páginas do processo para digitar cada byte (ou "sobra") no endereço físico correto.' },
  { valor: 'TABELA', nome: 'Preencher a tabela de páginas',
    descricao: 'Observe a memória física e as informações dos outros processos para completar a tabela de páginas do primeiro processo.' },
  { valor: 'CALCULOS', nome: 'Calcular páginas e fragmentação',
    descricao: 'Calcule quantas páginas cada processo ocupa, a fragmentação interna e o espaço livre na memória física.' },
];

export const NOMES_EXERCICIO_SIMPLES = ['A', 'B', 'C'];
export const QUANTIDADE_PROCESSOS_EXERCICIO = 3;
export const QUANTIDADE_PERGUNTAS_TRADUCAO = 4;
export const BITS_PAGINA = 2;
export const BITS_QUADRO = 3;
export const BITS_DESLOCAMENTO = 2;

export interface ProcessoExSimples {
  nome: string;
  bytes: number;
  cor: string;
  /** quadros[i] = quadro físico da página lógica i */
  quadros: number[];
}

export interface PerguntaTraducao {
  processo: ProcessoExSimples;
  pagina: number;
  deslocamento: number;
}

export interface ByteMemoria {
  quadro: number;
  deslocamento: number;
  processo: ProcessoExSimples | null;
  pagina: number | null;
  /** 'A5' etc.; null = sobra (fragmentação interna) ou quadro livre */
  conteudo: string | null;
}

export type Correcao = boolean | null;

function aleatorio(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function paginasNecessarias(bytes: number): number {
  return Math.ceil(bytes / TAMANHO_PAGINA);
}

export function fragmentacaoInterna(bytes: number): number {
  return paginasNecessarias(bytes) * TAMANHO_PAGINA - bytes;
}

export function enderecoLogico(pagina: number, deslocamento: number): string {
  return binario(pagina, BITS_PAGINA) + binario(deslocamento, BITS_DESLOCAMENTO);
}

export function enderecoFisico(quadro: number, deslocamento: number): string {
  return binario(quadro, BITS_QUADRO) + binario(deslocamento, BITS_DESLOCAMENTO);
}

/** Aceita a resposta com espaços, "|" ou "_" entre os bits (ex.: "101|10"). */
export function normalizarBinario(valor: string | null | undefined): string {
  return (valor ?? '').replace(/[\s|_.-]/g, '');
}

@Injectable()
export class ExercicioPaginacaoSimplesService {

  readonly tipo = signal<TipoExercicioSimples>('TRADUCAO');
  readonly processos = signal<ProcessoExSimples[]>([]);
  /** Processo cujas lacunas estão na memória física (exercício 2). */
  readonly alvoMemoria = signal<number>(0);
  readonly perguntas = signal<PerguntaTraducao[]>([]);

  // respostas
  readonly respostasTraducao = signal<string[]>([]);
  readonly respostasMemoria = signal<Record<string, string>>({}); // chave "quadro-desloc", texto digitado
  readonly respostasTabela = signal<string[]>([]);                // quadro (binário) por página do 1º processo
  readonly respostasCalculo = signal<Record<string, string>>({});  // "A-paginas", "A-sobra", "livre", "quadros"

  readonly corrigido = signal(false);
  readonly mostrarResposta = signal(false);

  readonly gerado = computed(() => this.processos().length > 0);

  readonly memoria = computed<ByteMemoria[]>(() => {
    const donos: ({ processo: ProcessoExSimples; pagina: number } | null)[] = Array(QUANTIDADE_QUADROS).fill(null);
    this.processos().forEach(p => p.quadros.forEach((q, pagina) => donos[q] = { processo: p, pagina }));
    const bytes: ByteMemoria[] = [];
    donos.forEach((dono, quadro) => {
      for (let d = 0; d < TAMANHO_PAGINA; d++) {
        const indice = dono ? dono.pagina * TAMANHO_PAGINA + d : -1;
        bytes.push({
          quadro,
          deslocamento: d,
          processo: dono?.processo ?? null,
          pagina: dono?.pagina ?? null,
          conteudo: dono && indice < dono.processo.bytes ? `${dono.processo.nome}${indice}` : null,
        });
      }
    });
    return bytes;
  });

  readonly quadrosOcupados = computed(() => this.processos().reduce((t, p) => t + p.quadros.length, 0));
  readonly bytesLivres = computed(() => (QUANTIDADE_QUADROS - this.quadrosOcupados()) * TAMANHO_PAGINA);

  readonly placar = computed(() => this.calcularPlacar());

  // ───────────────────────── configuração ─────────────────────────

  definirTipo(tipo: TipoExercicioSimples): void {
    this.tipo.set(tipo);
    if (this.gerado()) this.gerar();
  }

  /** Três processos com tamanhos aleatórios que cabem juntos nos 8 quadros, em quadros aleatórios. */
  gerar(): void {
    let tamanhos: number[];
    do {
      tamanhos = NOMES_EXERCICIO_SIMPLES.map(() => aleatorio(1, MAX_BYTES_PROCESSO));
    } while (
      tamanhos.reduce((t, b) => t + paginasNecessarias(b), 0) > QUANTIDADE_QUADROS ||
      // o primeiro processo (exercício da tabela de páginas) tem pelo menos 2 páginas
      paginasNecessarias(tamanhos[0]) < 2 ||
      // pelo menos um processo com sobra, para trabalhar a fragmentação interna
      tamanhos.every(b => fragmentacaoInterna(b) === 0)
    );

    const livres = embaralhar([...Array(QUANTIDADE_QUADROS).keys()]);
    const processos: ProcessoExSimples[] = [];
    NOMES_EXERCICIO_SIMPLES.forEach((nome, i) => {
      const n = paginasNecessarias(tamanhos[i]);
      processos.push({ nome, bytes: tamanhos[i], cor: gera_cor(processos), quadros: livres.splice(0, n) });
    });

    this.processos.set(processos);
    // lacunas da memória física num processo com 2 páginas ou mais, para o exercício ter conteúdo
    const candidatos = processos.map((p, i) => ({ p, i })).filter(x => x.p.quadros.length >= 2);
    this.alvoMemoria.set(embaralhar(candidatos)[0].i);
    this.perguntas.set(this.sortearPerguntas(processos));
    this.limparRespostas();
  }

  /** Perguntas de tradução em processos e páginas variados (sem repetir o mesmo byte). */
  private sortearPerguntas(processos: ProcessoExSimples[]): PerguntaTraducao[] {
    const candidatos: PerguntaTraducao[] = [];
    processos.forEach(p => {
      for (let i = 0; i < p.bytes; i++) {
        candidatos.push({ processo: p, pagina: Math.floor(i / TAMANHO_PAGINA), deslocamento: i % TAMANHO_PAGINA });
      }
    });
    const escolhidas: PerguntaTraducao[] = [];
    // primeiro, uma pergunta por processo; depois completa com as demais
    for (const p of embaralhar(processos)) {
      const doProcesso = embaralhar(candidatos.filter(c => c.processo === p));
      if (doProcesso.length) escolhidas.push(doProcesso[0]);
    }
    for (const c of embaralhar(candidatos)) {
      if (escolhidas.length >= QUANTIDADE_PERGUNTAS_TRADUCAO) break;
      if (!escolhidas.some(e => e.processo === c.processo && e.pagina === c.pagina)) escolhidas.push(c);
    }
    return escolhidas.slice(0, QUANTIDADE_PERGUNTAS_TRADUCAO);
  }

  limparRespostas(): void {
    this.respostasTraducao.set(Array(this.perguntas().length).fill(''));
    this.respostasMemoria.set({});
    this.respostasTabela.set(Array(this.processos()[0]?.quadros.length ?? 0).fill(''));
    this.respostasCalculo.set({});
    this.corrigido.set(false);
    this.mostrarResposta.set(false);
  }

  // ───────────────────────── respostas ─────────────────────────

  responderTraducao(i: number, valor: string): void {
    this.respostasTraducao.update(r => r.map((v, k) => k === i ? valor : v));
    this.corrigido.set(false);
  }

  responderMemoria(b: ByteMemoria, valor: string): void {
    this.respostasMemoria.update(r => ({ ...r, [`${b.quadro}-${b.deslocamento}`]: valor }));
    this.corrigido.set(false);
  }

  responderTabela(pagina: number, valor: string): void {
    this.respostasTabela.update(r => r.map((v, k) => k === pagina ? valor : v));
    this.corrigido.set(false);
  }

  responderCalculo(chave: string, valor: string): void {
    this.respostasCalculo.update(r => ({ ...r, [chave]: valor }));
    this.corrigido.set(false);
  }

  corrigir(): void { this.corrigido.set(true); }
  alternarResposta(): void { this.mostrarResposta.update(v => !v); }

  // ───────────────────────── gabarito e correção ─────────────────────────

  /** Byte que pertence ao processo do exercício 2 (onde o aluno deve escrever algo). */
  ehLacuna(b: ByteMemoria): boolean {
    return this.tipo() === 'MEMORIA_FISICA' && b.processo === this.processos()[this.alvoMemoria()];
  }

  /** Exercício 2: toda a memória física fica livre e editável; o aluno escolhe onde escrever. */
  ehEditavel(): boolean {
    return this.tipo() === 'MEMORIA_FISICA';
  }

  /** Resposta esperada em cada endereço: o byte (ou "sobra") do processo-alvo; vazio nos demais. */
  respostaEsperadaMemoria(b: ByteMemoria): string {
    if (!this.ehLacuna(b)) return '';
    return b.conteudo ?? 'sobra';
  }

  private normalizarByte(valor: string | null | undefined): string {
    const v = (valor ?? '').trim().toUpperCase();
    return v === 'SOBRA' ? 'sobra' : v;
  }

  gabaritoTraducao(p: PerguntaTraducao): string {
    return enderecoFisico(p.processo.quadros[p.pagina], p.deslocamento);
  }

  corretoTraducao(i: number): Correcao {
    if (!this.corrigido()) return null;
    return normalizarBinario(this.respostasTraducao()[i]) === this.gabaritoTraducao(this.perguntas()[i]);
  }

  corretoMemoria(b: ByteMemoria): Correcao {
    if (!this.corrigido()) return null;
    const resposta = this.normalizarByte(this.respostasMemoria()[`${b.quadro}-${b.deslocamento}`]);
    const esperado = this.respostaEsperadaMemoria(b);
    // endereço que deve ficar livre: só é marcado se o aluno escreveu algo nele
    if (esperado === '') return resposta === '' ? null : false;
    return resposta === this.normalizarByte(esperado);
  }

  corretoTabela(pagina: number): Correcao {
    if (!this.corrigido()) return null;
    const p = this.processos()[0];
    return normalizarBinario(this.respostasTabela()[pagina]) === binario(p.quadros[pagina], BITS_QUADRO);
  }

  gabaritoCalculo(chave: string): number {
    if (chave === 'livre') return this.bytesLivres();
    if (chave === 'quadros') return this.quadrosOcupados();
    const [nome, campo] = chave.split('-');
    const p = this.processos().find(x => x.nome === nome)!;
    return campo === 'paginas' ? paginasNecessarias(p.bytes) : fragmentacaoInterna(p.bytes);
  }

  corretoCalculo(chave: string): Correcao {
    if (!this.corrigido()) return null;
    const r = (this.respostasCalculo()[chave] ?? '').trim();
    return r !== '' && Number(r) === this.gabaritoCalculo(chave);
  }

  chavesCalculo(): string[] {
    return [
      ...this.processos().flatMap(p => [`${p.nome}-paginas`, `${p.nome}-sobra`]),
      'quadros',
      'livre',
    ];
  }

  private calcularPlacar(): { acertos: number; total: number } | null {
    if (!this.corrigido() || !this.gerado()) return null;
    let resultados: Correcao[] = [];
    switch (this.tipo()) {
      case 'TRADUCAO':
        resultados = this.perguntas().map((_, i) => this.corretoTraducao(i));
        break;
      case 'MEMORIA_FISICA':
        // conta os bytes do processo e, como erro, o que foi escrito em endereços que deveriam ficar livres
        resultados = this.memoria()
          .map(b => this.corretoMemoria(b))
          .filter((c, i) => this.ehLacuna(this.memoria()[i]) || c === false);
        break;
      case 'TABELA':
        resultados = this.processos()[0].quadros.map((_, i) => this.corretoTabela(i));
        break;
      case 'CALCULOS':
        resultados = this.chavesCalculo().map(c => this.corretoCalculo(c));
        break;
    }
    return { acertos: resultados.filter(r => r === true).length, total: resultados.length };
  }
}
