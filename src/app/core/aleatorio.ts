/**
 * Números aleatórios com semente, para gerar exercícios que podem ser repetidos.
 *
 * Nos exercícios do site usa-se Math.random. Nas avaliações, cada aluno recebe
 * uma semente própria: a mesma semente gera sempre a mesma prova, o que permite
 * corrigir no servidor e reabrir a prova do aluno para revisão.
 *
 * Sem Angular: também é usado pela função de avaliações no Supabase.
 */

/** Função que devolve um número em [0, 1), como Math.random. */
export type Aleatorio = () => number;

/** Gerador mulberry32 (rápido, 32 bits, boa distribuição para exercícios). */
export function criarAleatorio(semente: number | string): Aleatorio {
  let a = typeof semente === 'number' ? semente >>> 0 : hashTexto(semente);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash FNV-1a de 32 bits: transforma um texto (ex.: "prova:aluno") numa semente. */
export function hashTexto(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Inteiro entre min e max (inclusive). */
export function inteiro(rnd: Aleatorio, min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

/** Um item qualquer da lista. */
export function escolher<T>(rnd: Aleatorio, lista: readonly T[]): T {
  return lista[inteiro(rnd, 0, lista.length - 1)];
}

/** Cópia embaralhada (Fisher–Yates). */
export function embaralhar<T>(rnd: Aleatorio, lista: readonly T[]): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
