/** Exercício de segmentação sem Angular (usado também pelas avaliações). */
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
} from './segmentacao';
import { Aleatorio, embaralhar as embaralharR, inteiro } from '../../../core/aleatorio';

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
    descricao: 'Um novo processo vai ser criado. Aloque cada segmento por best-fit (na ordem código, dados, pilha) e registre o resultado preenchendo a BASE na tabela de segmentos do processo.' },
];

export const NOMES_EX_SEG = ['A', 'B', 'C'];
export const QTD_PERGUNTAS_TRADUCAO = 4;

export interface PerguntaTraducaoSeg {
  processo: ProcessoSegmentado;
  segmento: number;
  deslocamento: number;
}

export type Correcao = boolean | null;

function tamanhosAleatorios(rnd: Aleatorio, max = 4): Record<TipoSegmento, number> {
  return { C: inteiro(rnd, 1, max), D: inteiro(rnd, 1, max), P: inteiro(rnd, 1, max) };
}

export function normalizarBinario(v: string | null | undefined): string {
  return (v ?? '').replace(/[\s|_.-]/g, '');
}

export function normalizarResposta(v: string | null | undefined): string {
  const t = (v ?? '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (['ERRO', 'INTERRUPCAO', 'INT', 'X'].includes(t)) return 'erro';
  return normalizarBinario(t);
}

export function normalizarByte(v: string | null | undefined): string {
  return (v ?? '').trim().toUpperCase().replace(/\s/g, '');
}

export interface ExercicioSegmentacao {
  processos: ProcessoSegmentado[];
  alvo: number;
  perguntas: PerguntaTraducaoSeg[];
  /** Exercício de alocação: o novo processo e o resultado do best-fit (gabarito). */
  novo: { nome: string; cor: string; tamanhos: Record<TipoSegmento, number> } | null;
  gabaritoAlocacao: ResultadoAlocacao | null;
}

/**
 * Monta a memória com A, B e C alocados por best-fit, intercalados com processos
 * temporários que depois são removidos, para deixar lacunas espalhadas.
 */
function montarCenario(rnd: Aleatorio, minLivre: number): ProcessoSegmentado[] | null {
  let processos: ProcessoSegmentado[] = [];
  const ordem = ['A', 'X', 'B', 'Y', 'C'];
  for (const nome of ordem) {
    const temporario = nome === 'X' || nome === 'Y';
    const r = alocar(processos, nome, temporario ? '#000000' : '', tamanhosAleatorios(rnd, temporario ? 3 : 4));
    if (!r.ok) return null;
    processos = [...processos, r.processo!];
  }
  processos = processos.filter(p => NOMES_EX_SEG.includes(p.nome));
  const livre = ocupacao(processos).filter(b => !b.processo).length;
  return livre >= minLivre ? processos : null;
}

/** Sempre 3 processos (A, B e C) alocados por best-fit. Cores ficam por conta da tela. */
export function gerarSegmentacao(tipo: TipoExercicioSeg, rnd: Aleatorio = Math.random): ExercicioSegmentacao {
  let processos: ProcessoSegmentado[] | null = null;
  let novo: ExercicioSegmentacao['novo'] = null;
  let gabarito: ResultadoAlocacao | null = null;

  // alocação: ~70% dos exercícios o processo cabe; nos demais, falha por fragmentação externa
  let querFragmentacao = rnd() < 0.3;
  for (let tentativa = 0; tentativa < 2000; tentativa++) {
    if (tentativa === 1500) querFragmentacao = false; // garantia: sempre gera um exercício
    processos = montarCenario(rnd, tipo === 'MEMORIA_FISICA' ? 6 : 3);
    if (!processos) continue;
    if (tipo !== 'ALOCACAO') break;

    const tamanhos = tamanhosAleatorios(rnd, querFragmentacao ? 6 : 4);
    const r = alocar(processos, 'D', '', tamanhos);
    const serve = querFragmentacao ? (!r.ok && r.motivo === 'fragmentacao') : r.ok;
    if (serve) {
      novo = { nome: 'D', cor: '', tamanhos };
      gabarito = r;
      break;
    }
    processos = null;
  }
  if (!processos) throw new Error('Não foi possível gerar o exercício de segmentação.');

  return {
    processos,
    alvo: tipo === 'TABELA' ? 0 : inteiro(rnd, 0, processos.length - 1),
    perguntas: sortearPerguntas(rnd, processos),
    novo,
    gabaritoAlocacao: gabarito,
  };
}

/** 4 perguntas de processos variados; uma delas gera interrupção (deslocamento ≥ limite). */
function sortearPerguntas(rnd: Aleatorio, processos: ProcessoSegmentado[]): PerguntaTraducaoSeg[] {
  const embaralhar = <T>(l: T[]) => embaralharR(rnd, l);
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
  escolhidas.push({ processo: p, segmento: s.numero, deslocamento: inteiro(rnd, s.tamanho, Math.min(15, s.tamanho + 3)) });
  return embaralhar(escolhidas);
}
