/**
 * Exercício de paginação simples sem Angular (usado também pelas avaliações).
 */
import {
  MAX_BYTES_PROCESSO,
  QUANTIDADE_QUADROS,
  TAMANHO_PAGINA,
  binario,
} from './paginacao-simples';
import { Aleatorio, embaralhar as embaralharR, inteiro } from '../../../core/aleatorio';

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
    descricao: 'Parte da memória física já está ocupada por outros processos. Use a tabela de páginas do processo para digitar cada byte (ou "sobra") no endereço físico correto, entre os quadros livres.' },
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

export interface ExercicioPaginacaoSimples {
  processos: ProcessoExSimples[];
  /** Processo cujas lacunas estão na memória física (exercício 2). */
  alvoMemoria: number;
  perguntas: PerguntaTraducao[];
}

/** Três processos com tamanhos aleatórios que cabem juntos nos 8 quadros, em quadros aleatórios. Cores ficam por conta da tela. */
export function gerarPaginacaoSimples(tipo: TipoExercicioSimples, rnd: Aleatorio = Math.random): ExercicioPaginacaoSimples {
  const embaralhar = <T>(l: T[]) => embaralharR(rnd, l);
  let tamanhos: number[];
  do {
    tamanhos = NOMES_EXERCICIO_SIMPLES.map(() => inteiro(rnd, 1, MAX_BYTES_PROCESSO));
  } while (
    tamanhos.reduce((t, b) => t + paginasNecessarias(b), 0) > QUANTIDADE_QUADROS ||
    // o primeiro processo (exercício da tabela de páginas) tem pelo menos 2 páginas
    paginasNecessarias(tamanhos[0]) < 2 ||
    // memória física: sobram pelo menos 2 quadros livres, para os quadros editáveis não entregarem a resposta
    (tipo === 'MEMORIA_FISICA' &&
      tamanhos.reduce((t, b) => t + paginasNecessarias(b), 0) > QUANTIDADE_QUADROS - 2) ||
    // pelo menos um processo com sobra, para trabalhar a fragmentação interna
    tamanhos.every(b => fragmentacaoInterna(b) === 0)
  );

  const livres = embaralhar([...Array(QUANTIDADE_QUADROS).keys()]);
  const processos: ProcessoExSimples[] = NOMES_EXERCICIO_SIMPLES.map((nome, i) =>
    ({ nome, bytes: tamanhos[i], cor: '', quadros: livres.splice(0, paginasNecessarias(tamanhos[i])) }));

  // lacunas da memória física num processo com 2 páginas ou mais, para o exercício ter conteúdo
  const candidatos = processos.map((p, i) => ({ p, i })).filter(x => x.p.quadros.length >= 2);
  const alvoMemoria = embaralhar(candidatos)[0].i;
  return { processos, alvoMemoria, perguntas: sortearPerguntas(processos, embaralhar) };
}

/** Perguntas de tradução em processos e páginas variados (sem repetir o mesmo byte). */
function sortearPerguntas(processos: ProcessoExSimples[], embaralhar: <T>(l: T[]) => T[]): PerguntaTraducao[] {
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
