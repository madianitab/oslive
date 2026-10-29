/**
 * Histórico de bits de referência (paginação por demanda), conforme o material:
 * colunas T1…T4, sendo T4 o instante mais recente.
 *
 * Convenção interna: o vetor `historico` guarda o mais recente primeiro
 * (historico[0] = T4, historico[3] = T1).
 */

export interface ComHistorico {
  historico: number[];
  timestamp: number | null;
}

/** Valor do histórico lido de T4 (bit mais significativo) para T1. */
export function valorHistoricoBits(historico: number[]): number {
  return historico.reduce((acc, bit) => acc * 2 + (bit ? 1 : 0), 0);
}

/**
 * Página vítima: compara a partir de T4 e descarta quem tem bit 1; no empate, segue para T3, T2 e T1
 * (equivale ao menor valor lendo T4…T1 como binário). Persistindo o empate, sai a de menor timestamp.
 */
export function vitimaHistorico<T extends ComHistorico>(paginas: T[]): T | null {
  if (paginas.length === 0) return null;
  return [...paginas].sort((a, b) =>
    valorHistoricoBits(a.historico) - valorHistoricoBits(b.historico) ||
    (a.timestamp ?? 0) - (b.timestamp ?? 0))[0];
}

/**
 * Passagem de um instante: o bit de referência do intervalo entra como o novo T4,
 * os demais andam uma coluna para a esquerda e o T1 mais antigo é descartado.
 */
export function deslocarHistorico(historico: number[], bitRef: number, tamanho: number): number[] {
  return [bitRef ? 1 : 0, ...historico].slice(0, tamanho);
}

/** Bits na ordem das colunas T1…T4 (para exibir). */
export function bitsT1aT4(historico: number[]): number[] {
  return [...historico].reverse();
}
