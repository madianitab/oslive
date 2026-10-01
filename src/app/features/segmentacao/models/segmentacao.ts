/**
 * Motor da segmentação (usado pelo simulador e pelos exercícios).
 *
 * Modelo, como no material da Aula 11:
 * - memória física de 32 bytes → endereço físico de 5 bits;
 * - endereço lógico = número do segmento (2 bits) + deslocamento (4 bits),
 *   ex.: D3 = 01 0010 (segmento de dados, deslocamento 2);
 * - cada processo tem 3 segmentos: código (00), dados (01) e pilha (10);
 * - tabela de segmentos: base (endereço físico inicial) e limite (tamanho);
 * - tradução: se deslocamento < limite → físico = base + deslocamento; senão, interrupção.
 *
 * Alocação (lógica original do OSLive): BEST-FIT, alocando primeiro o MENOR segmento.
 * Cada segmento vai para a menor lacuna onde cabe; no empate, a de menor endereço.
 * Se algum segmento não couber, o processo não é criado.
 */

export const TAMANHO_MEMORIA = 32;
export const BITS_FISICO = 5;
export const BITS_SEGMENTO = 2;
export const BITS_DESLOCAMENTO = 4;
export const MAX_TAMANHO_SEGMENTO = 16; // 4 bits de deslocamento

export type TipoSegmento = 'C' | 'D' | 'P';

export const SEGMENTOS: { tipo: TipoSegmento; numero: number; nome: string }[] = [
  { tipo: 'C', numero: 0, nome: 'Código' },
  { tipo: 'D', numero: 1, nome: 'Dados' },
  { tipo: 'P', numero: 2, nome: 'Pilha' },
];

export interface Segmento {
  tipo: TipoSegmento;
  numero: number;   // 0, 1 ou 2
  nome: string;
  tamanho: number;  // limite
  base: number;     // endereço físico inicial
}

export interface ProcessoSegmentado {
  nome: string;
  cor: string;
  segmentos: Segmento[];
}

export interface Lacuna {
  inicio: number;
  tamanho: number;
}

/** Um passo do best-fit: as lacunas no momento e a escolhida para o segmento. */
export interface PassoAlocacao {
  segmento: TipoSegmento;
  nome: string;
  tamanho: number;
  lacunas: Lacuna[];          // em ordem de endereço
  escolhida: Lacuna | null;   // null = nenhuma lacuna comporta o segmento
  sobra: number;
}

export interface ResultadoAlocacao {
  ok: boolean;
  processo: ProcessoSegmentado | null;
  passos: PassoAlocacao[];
  /** 'fragmentacao': há memória livre suficiente no total, mas nenhuma lacuna comporta um segmento. */
  motivo: 'fragmentacao' | 'insuficiente' | null;
  livreTotal: number;
  necessario: number;
}

export interface ByteFisico {
  endereco: number;
  processo: ProcessoSegmentado | null;
  segmento: Segmento | null;
  deslocamento: number | null;
  conteudo: string | null; // ex.: "AC1" → exibido como C1 com a cor do processo
}

export interface ResultadoTraducao {
  ok: boolean;
  fisico: number | null;
  erro: string | null;
}

export function binario(valor: number, bits: number): string {
  return valor.toString(2).padStart(bits, '0');
}

/** Nome do byte como no material (contagem a partir de 1): C1, D3, P2... */
export function nomeByte(tipo: TipoSegmento, deslocamento: number): string {
  return `${tipo}${deslocamento + 1}`;
}

export function corSegmento(cor: string, tipo: TipoSegmento): string {
  return tipo === 'C' ? cor : tipo === 'D' ? cor + 'C0' : cor + '90';
}

export function ocupacao(processos: ProcessoSegmentado[]): (ByteFisico)[] {
  const mem: ByteFisico[] = Array.from({ length: TAMANHO_MEMORIA }, (_, endereco) => ({
    endereco, processo: null, segmento: null, deslocamento: null, conteudo: null,
  }));
  processos.forEach(p => p.segmentos.forEach(s => {
    for (let d = 0; d < s.tamanho; d++) {
      mem[s.base + d] = { endereco: s.base + d, processo: p, segmento: s, deslocamento: d, conteudo: nomeByte(s.tipo, d) };
    }
  }));
  return mem;
}

/** Lacunas (espaços livres contíguos) em ordem de endereço. */
export function lacunas(ocupado: boolean[]): Lacuna[] {
  const out: Lacuna[] = [];
  let inicio = -1;
  for (let i = 0; i <= ocupado.length; i++) {
    const livre = i < ocupado.length && !ocupado[i];
    if (livre && inicio < 0) inicio = i;
    if (!livre && inicio >= 0) {
      out.push({ inicio, tamanho: i - inicio });
      inicio = -1;
    }
  }
  return out;
}

export function lacunasDe(processos: ProcessoSegmentado[]): Lacuna[] {
  return lacunas(ocupacao(processos).map(b => b.processo !== null));
}

/** Best-fit: menor lacuna em que o segmento cabe; empate → menor endereço. */
export function melhorLacuna(lista: Lacuna[], tamanho: number): Lacuna | null {
  return lista
    .filter(l => l.tamanho >= tamanho)
    .sort((a, b) => a.tamanho - b.tamanho || a.inicio - b.inicio)[0] ?? null;
}

/** Ordem de alocação: do menor para o maior segmento; empate segue código, dados, pilha. */
export function ordemAlocacao(tamanhos: Record<TipoSegmento, number>): TipoSegmento[] {
  return (['C', 'D', 'P'] as TipoSegmento[]).sort((a, b) => tamanhos[a] - tamanhos[b]);
}

export function alocar(
  processos: ProcessoSegmentado[],
  nome: string,
  cor: string,
  tamanhos: Record<TipoSegmento, number>,
): ResultadoAlocacao {
  const ocupado = ocupacao(processos).map(b => b.processo !== null);
  const livreTotal = ocupado.filter(o => !o).length;
  const necessario = tamanhos.C + tamanhos.D + tamanhos.P;
  const passos: PassoAlocacao[] = [];
  const segmentos: Segmento[] = [];

  for (const tipo of ordemAlocacao(tamanhos)) {
    const info = SEGMENTOS.find(s => s.tipo === tipo)!;
    const lista = lacunas(ocupado);
    const escolhida = melhorLacuna(lista, tamanhos[tipo]);
    passos.push({
      segmento: tipo, nome: info.nome, tamanho: tamanhos[tipo], lacunas: lista,
      escolhida, sobra: escolhida ? escolhida.tamanho - tamanhos[tipo] : 0,
    });
    if (!escolhida) {
      return {
        ok: false, processo: null, passos,
        motivo: livreTotal >= necessario ? 'fragmentacao' : 'insuficiente',
        livreTotal, necessario,
      };
    }
    for (let i = 0; i < tamanhos[tipo]; i++) ocupado[escolhida.inicio + i] = true;
    segmentos.push({ tipo, numero: info.numero, nome: info.nome, tamanho: tamanhos[tipo], base: escolhida.inicio });
  }

  segmentos.sort((a, b) => a.numero - b.numero);
  return { ok: true, processo: { nome, cor, segmentos }, passos, motivo: null, livreTotal, necessario };
}

export function traduzir(p: ProcessoSegmentado, numeroSegmento: number, deslocamento: number): ResultadoTraducao {
  const s = p.segmentos.find(x => x.numero === numeroSegmento);
  if (!s) {
    return { ok: false, fisico: null, erro: `Segmento ${binario(numeroSegmento, BITS_SEGMENTO)} não existe: interrupção de proteção.` };
  }
  if (deslocamento >= s.tamanho) {
    return {
      ok: false, fisico: null,
      erro: `Deslocamento ${deslocamento} ≥ limite ${s.tamanho} do segmento ${binario(s.numero, BITS_SEGMENTO)}: interrupção (endereço fora do segmento).`,
    };
  }
  return { ok: true, fisico: s.base + deslocamento, erro: null };
}
