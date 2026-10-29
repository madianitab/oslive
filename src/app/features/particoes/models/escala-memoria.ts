/** Marca da régua de endereços ao lado da barra de memória. */
export interface MarcaEscala {
  /** Endereço (KB) que a marca representa. */
  valor: number;
  /** Posição vertical (px) onde o rótulo é desenhado. */
  topo: number;
}

/**
 * Monta a régua de endereços com os limites reais das regiões (SO, partições, processos, lacunas),
 * em vez de marcas fixas de 100 em 100 KB.
 *
 * Os rótulos muito próximos são afastados (`espacoMin` px) para não se sobreporem; o último
 * rótulo nunca passa da altura da barra.
 */
export function marcasEscala(limites: number[], total: number, pxPorKb: number, espacoMin = 12): MarcaEscala[] {
  const valores = [...new Set([0, ...limites, total])]
    .filter(v => v >= 0 && v <= total)
    .sort((a, b) => a - b);

  const marcas = valores.map(valor => ({ valor, topo: valor * pxPorKb }));

  // de cima para baixo: empurra para baixo quem está colado no anterior
  for (let i = 1; i < marcas.length; i++) {
    marcas[i].topo = Math.max(marcas[i].topo, marcas[i - 1].topo + espacoMin);
  }
  // de baixo para cima: o último fica no fim da barra, e os anteriores sobem se preciso
  const altura = total * pxPorKb;
  for (let i = marcas.length - 1; i >= 0; i--) {
    const limite = i === marcas.length - 1 ? altura : marcas[i + 1].topo - espacoMin;
    marcas[i].topo = Math.min(marcas[i].topo, limite);
  }
  return marcas;
}
