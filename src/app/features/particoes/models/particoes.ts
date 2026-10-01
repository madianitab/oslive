/**
 * Alocação contígua (Aula 11; Silberschatz; Oliveira, Carissimi e Toscani).
 * Unidade: KB. A memória começa com a área do Sistema Operacional.
 *
 * Partições fixas: a área de usuário é dividida em partições que não mudam;
 *   o processo ocupa uma partição inteira → sobra = FRAGMENTAÇÃO INTERNA.
 * Partições variáveis: o processo recebe exatamente o que precisa; o resto vira lacuna →
 *   lacunas pequenas e espalhadas = FRAGMENTAÇÃO EXTERNA (remédio: compactação).
 */

export interface ProcessoMem {
  nome: string;
  tamanho: number; // KB
  cor: string;
}

export interface Lacuna {
  inicio: number;
  tamanho: number;
}

export type AlgoritmoFit = 'FIRST' | 'BEST' | 'WORST' | 'CIRCULAR';

export const ALGORITMOS_FIT: { valor: AlgoritmoFit; nome: string; regra: string }[] = [
  { valor: 'FIRST', nome: 'First-fit', regra: 'a primeira lacuna que comporta o processo, começando sempre do início' },
  { valor: 'BEST', nome: 'Best-fit', regra: 'a lacuna que resulta na menor sobra' },
  { valor: 'WORST', nome: 'Worst-fit', regra: 'a lacuna que resulta na maior sobra' },
  { valor: 'CIRCULAR', nome: 'Circular-fit', regra: 'como o first-fit, mas começando na lacuna seguinte à última alocação' },
];

/** Escolhe a lacuna (lista em ordem de endereço) conforme o algoritmo. */
export function escolherLacuna(lacunas: Lacuna[], tamanho: number, alg: AlgoritmoFit, ponteiro: number): Lacuna | null {
  const cabem = lacunas.filter(l => l.tamanho >= tamanho);
  if (cabem.length === 0) return null;
  switch (alg) {
    case 'FIRST':
      return cabem[0];
    case 'BEST':
      return [...cabem].sort((a, b) => a.tamanho - b.tamanho || a.inicio - b.inicio)[0];
    case 'WORST':
      return [...cabem].sort((a, b) => b.tamanho - a.tamanho || a.inicio - b.inicio)[0];
    case 'CIRCULAR':
      return cabem.find(l => l.inicio >= ponteiro) ?? cabem[0];
  }
}

export function lacunasEntre(ocupados: { inicio: number; tamanho: number }[], inicio: number, fim: number): Lacuna[] {
  const ord = [...ocupados].sort((a, b) => a.inicio - b.inicio);
  const out: Lacuna[] = [];
  let cursor = inicio;
  for (const o of ord) {
    if (o.inicio > cursor) out.push({ inicio: cursor, tamanho: o.inicio - cursor });
    cursor = Math.max(cursor, o.inicio + o.tamanho);
  }
  if (cursor < fim) out.push({ inicio: cursor, tamanho: fim - cursor });
  return out;
}

export interface ResultadoProtecao {
  ok: boolean;
  fisico: number | null;
  mensagem: string;
}

/** Registradores de base e limite: físico = base + lógico, se lógico < limite; senão, interrupção. */
export function protecao(base: number, limite: number, logico: number): ResultadoProtecao {
  if (logico < 0 || logico >= limite) {
    return { ok: false, fisico: null, mensagem: `Endereço lógico ${logico} ≥ limite ${limite}: interrupção de endereço ilegal.` };
  }
  return { ok: true, fisico: base + logico, mensagem: `${logico} < limite ${limite} ✓ → físico = ${logico} + base ${base} = ${base + logico}` };
}
