import { TAM, TAM_HISTORICO_REF, TIMESTAMP_INICIAL } from '../../../core/constantes';
import { Aleatorio, embaralhar as embaralharR, inteiro } from '../../../core/aleatorio';
import { valorHistoricoBits, vitimaHistorico } from './historico-bits';

/**
 * Exercícios de Paginação por Demanda (ideia original do módulo de Carlos Bruno):
 *  1. Preencher a memória lógica: a partir da memória física, completar a tabela de páginas (End. MF e bit V/I);
 *  2. Preencher a memória física: a partir das tabelas de páginas, dizer qual página está em cada quadro;
 *  3. Determinar a página vítima: com a memória cheia, escolher quem sai por FIFO,
 *     Histórico de bits de referência ou Segunda Chance.
 *  4. Segunda Chance em sequência: situações encadeadas (serviço próprio: ExercicioSegundaChanceService).
 */
export type TipoExercicio = 'LOGICA' | 'FISICA' | 'VITIMA' | 'SEQUENCIA';
export type AlgoritmoVitima = 'FIFO' | 'HISTORICO' | 'SEGUNDA_CHANCE';

export const TIPOS_EXERCICIO: { valor: TipoExercicio; nome: string; descricao: string }[] = [
  { valor: 'LOGICA', nome: 'Preencher a tabela de páginas',
    descricao: 'Observe a memória física e complete a tabela de páginas de cada processo (quadro e bit V/I).' },
  { valor: 'FISICA', nome: 'Preencher a memória física',
    descricao: 'Observe as tabelas de páginas e indique qual página está em cada quadro da memória física.' },
  { valor: 'VITIMA', nome: 'Determinar a página vítima',
    descricao: 'A memória física está cheia e uma nova página precisa entrar: escolha a página que será substituída.' },
  { valor: 'SEQUENCIA', nome: 'Segunda Chance em sequência',
    descricao: 'Até 10 situações encadeadas: aplique os acessos e escolha a vítima pela Segunda Chance ou pela Segunda Chance Melhorada.' },
];

export const ALGORITMOS_VITIMA: { valor: AlgoritmoVitima; nome: string }[] = [
  { valor: 'FIFO', nome: 'FIFO (first-in, first-out)' },
  { valor: 'HISTORICO', nome: 'Histórico de bits de referência' },
  { valor: 'SEGUNDA_CHANCE', nome: 'Segunda Chance' },
];

export const NOMES_PROCESSOS = ['A', 'B', 'C', 'D'];
export const BITS_HISTORICO = TAM_HISTORICO_REF;

export interface PaginaExercicio {
  processo: string;
  indice: number;
  cor: string;
  /** Quadro da memória física (null = página só no disco, bit I). */
  quadro: number | null;
  /** Momento da carga na memória física. */
  timestamp: number | null;
  /** Segunda Chance: bit de referência. */
  bitRef: 0 | 1;
  /** Histórico de bits de referência (posição 0 = acesso mais recente). */
  historico: number[];
}

export interface ProcessoExercicio {
  nome: string;
  cor: string;
  paginas: PaginaExercicio[];
}

export type Correcao = boolean | null;

export interface RespostaPagina {
  quadro: string;   // '' = não respondido, '-' = fora da memória, '0'..'7' = quadro
  bit: string;      // '' = não respondido, 'V' ou 'I'
}

export function nomePagina(p: PaginaExercicio): string {
  return `${p.processo}${p.indice}`;
}

export function valorHistorico(p: PaginaExercicio): number {
  return valorHistoricoBits(p.historico);
}

export interface ExercicioPaginacaoDemanda {
  processos: ProcessoExercicio[];
  /** Página que está em cada quadro (gabarito). */
  quadros: (PaginaExercicio | null)[];
  /** Exercício 3: página que provocou a falta de página e precisa entrar. */
  paginaSolicitada: PaginaExercicio | null;
}

/** Processos com 1 a 4 páginas, parte delas carregada em quadros aleatórios. Cores ficam por conta da tela. */
export function gerarPaginacaoDemanda(tipo: TipoExercicio, quantidade: number, rnd: Aleatorio = Math.random): ExercicioPaginacaoDemanda {
  const embaralhar = <T>(l: T[]) => embaralharR(rnd, l);
  const nomes = NOMES_PROCESSOS.slice(0, quantidade);

  // Na página vítima a memória precisa ficar cheia e sobrar ao menos uma página no disco.
  let tamanhos: number[];
  do {
    tamanhos = nomes.map(() => tipo === 'VITIMA' ? inteiro(rnd, 2, 4) : inteiro(rnd, 1, 4));
  } while (tipo === 'VITIMA' && tamanhos.reduce((a, b) => a + b, 0) <= TAM);

  const processos: ProcessoExercicio[] = nomes.map((nome, i) => ({
    nome, cor: '',
    paginas: Array.from({ length: tamanhos[i] }, (_, k) =>
      ({ processo: nome, indice: k, cor: '', quadro: null, timestamp: null, bitRef: 0 as 0 | 1, historico: [] as number[] })),
  }));

  const todas = processos.flatMap(p => p.paginas);
  const total = todas.length;

  // Quantas páginas ficam carregadas:
  // - exercícios 1 e 2: parte das páginas (sempre sobra ao menos uma no disco quando possível);
  // - exercício 3: a memória física fica cheia.
  let carregadas: number;
  if (tipo === 'VITIMA') {
    carregadas = TAM;
  } else if (total === 1) {
    carregadas = 1;
  } else {
    const maximo = Math.min(TAM, total - 1);
    const minimo = Math.max(1, Math.min(maximo, Math.ceil(total / 2)));
    carregadas = inteiro(rnd, minimo, maximo);
  }

  const ordemCarga = embaralhar(todas).slice(0, carregadas);
  const quadrosLivres = embaralhar([...Array(TAM).keys()]);
  const quadros: (PaginaExercicio | null)[] = Array(TAM).fill(null);

  ordemCarga.forEach((pagina, i) => {
    const quadro = quadrosLivres[i];
    pagina.quadro = quadro;
    pagina.timestamp = TIMESTAMP_INICIAL + i;
    pagina.bitRef = rnd() < 0.5 ? 0 : 1;
    pagina.historico = Array.from({ length: BITS_HISTORICO }, () => (rnd() < 0.5 ? 0 : 1));
    quadros[quadro] = pagina;
  });

  const paginaSolicitada = tipo === 'VITIMA' ? (embaralhar(todas.filter(p => p.quadro === null))[0] ?? null) : null;
  return { processos, quadros, paginaSolicitada };
}

/**
 * Página vítima com a memória cheia:
 * - FIFO: a carregada há mais tempo (menor timestamp);
 * - Histórico de bits (como no material): compara a partir de T4 (mais recente) e descarta quem tem 1,
 *   seguindo para T3, T2, T1; equivale ao menor valor lendo T4…T1 como binário; empate → menor timestamp;
 * - Segunda Chance: percorre em ordem de timestamp; bit 1 ganha segunda chance (vira 0 e vai para o fim);
 *   a primeira com bit 0 sai. Se todas tiverem bit 1, a mais antiga sai depois da volta completa.
 */
export function calcularVitimaPaginacao(quadros: (PaginaExercicio | null)[], algoritmo: AlgoritmoVitima): PaginaExercicio | null {
  const fila = quadros.filter((q): q is PaginaExercicio => q !== null)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  if (fila.length === 0) return null;
  switch (algoritmo) {
    case 'FIFO':
      return fila[0];
    case 'HISTORICO':
      return vitimaHistorico(fila);
    case 'SEGUNDA_CHANCE':
      return fila.find(p => p.bitRef === 0) ?? fila[0];
  }
}
