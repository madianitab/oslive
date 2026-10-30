/**
 * Exercícios de partições (lógica pura, sem Angular).
 *
 * Mesmas regras dos simuladores:
 * - Fixas: o processo ocupa uma partição livre inteira ("primeira que comporta" ou "menor que comporta");
 *   a sobra é fragmentação interna; se nenhuma partição livre comporta, o processo vai para a fila.
 *   Quando um processo termina, o primeiro da fila (ordem de chegada) que couber na partição liberada entra nela.
 * - Variáveis: o processo recebe exatamente o que precisa numa lacuna escolhida por first, best, worst ou
 *   circular-fit (desempate pelo menor endereço). Sem lacuna: fragmentação externa (há memória livre
 *   suficiente no total) ou memória insuficiente; o processo vai para a fila e tenta de novo quando
 *   memória é liberada. Lacunas vizinhas são unificadas. Compactação: processos vão para o início da área
 *   de usuário, na ordem de endereço, e as bases mudam.
 */
import { AlgoritmoFit, Lacuna, escolherLacuna, lacunasEntre } from './particoes';

export type Aleatorio = () => number;

function inteiro(rnd: Aleatorio, min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

function multiplo(rnd: Aleatorio, min: number, max: number, passo: number): number {
  return inteiro(rnd, Math.ceil(min / passo), Math.floor(max / passo)) * passo;
}

// ───────────────────────── partições fixas ─────────────────────────

export const SO_FIXAS = 120;
export const AREA_FIXAS = 380;

export type PoliticaFixa = 'FIRST' | 'BEST';

export interface ProcessoEx { nome: string; tamanho: number; }

export type EventoFixa =
  | { tipo: 'chegada'; processo: ProcessoEx; particao: number | null; frag: number | null; externa: boolean }
  | { tipo: 'termino'; processo: string; particaoLiberada: number; entra: ProcessoEx | null; fragEntra: number | null };

export interface ExercicioFixas {
  politica: PoliticaFixa;
  /** Tamanhos das partições, na ordem de endereço (partição 1 = primeira). */
  particoes: number[];
  eventos: EventoFixa[];
  /** Fragmentação interna total ao final. */
  fragFinal: number;
}

/** Início de cada partição (logo após o SO). */
export function iniciosParticoes(particoes: number[]): number[] {
  let inicio = SO_FIXAS;
  return particoes.map(t => { const i = inicio; inicio += t; return i; });
}

function escolherParticao(particoes: number[], ocupadas: (ProcessoEx | null)[], tamanho: number, politica: PoliticaFixa): number | null {
  const livres = particoes.map((t, i) => ({ t, i })).filter(x => !ocupadas[x.i] && x.t >= tamanho);
  if (!livres.length) return null;
  if (politica === 'BEST') livres.sort((a, b) => a.t - b.t || a.i - b.i);
  return livres[0].i;
}

/**
 * Executa uma sequência (chegada: tamanho; término: nome) e devolve os eventos com o gabarito.
 * Retorna null se a sequência mandar terminar um processo que não está numa partição.
 */
export function resolverFixas(particoes: number[], politica: PoliticaFixa, passos: ({ chega: ProcessoEx } | { termina: string })[]): ExercicioFixas | null {
  const ocupadas: (ProcessoEx | null)[] = particoes.map(() => null);
  const fila: ProcessoEx[] = [];
  const eventos: EventoFixa[] = [];
  for (const p of passos) {
    if ('chega' in p) {
      const i = escolherParticao(particoes, ocupadas, p.chega.tamanho, politica);
      if (i === null) {
        const livre = particoes.reduce((t, x, k) => t + (ocupadas[k] ? 0 : x), 0);
        fila.push(p.chega);
        eventos.push({ tipo: 'chegada', processo: p.chega, particao: null, frag: null, externa: livre >= p.chega.tamanho });
      } else {
        ocupadas[i] = p.chega;
        eventos.push({ tipo: 'chegada', processo: p.chega, particao: i + 1, frag: particoes[i] - p.chega.tamanho, externa: false });
      }
    } else {
      const i = ocupadas.findIndex(x => x?.nome === p.termina);
      if (i === -1) return null;
      ocupadas[i] = null;
      const k = fila.findIndex(f => f.tamanho <= particoes[i]);
      let entra: ProcessoEx | null = null;
      if (k !== -1) {
        entra = fila.splice(k, 1)[0];
        ocupadas[i] = entra;
      }
      eventos.push({ tipo: 'termino', processo: p.termina, particaoLiberada: i + 1, entra, fragEntra: entra ? particoes[i] - entra.tamanho : null });
    }
  }
  const fragFinal = ocupadas.reduce((t, x, k) => t + (x ? particoes[k] - x.tamanho : 0), 0);
  return { politica, particoes, eventos, fragFinal };
}

/**
 * Gera um exercício de partições fixas que tenha: processo indo para a fila, processo saindo da fila
 * quando outro termina e fragmentação interna (às vezes também encaixe exato e fragmentação externa).
 */
export function gerarFixas(politica: PoliticaFixa, rnd: Aleatorio = Math.random): ExercicioFixas {
  for (let tentativa = 0; tentativa < 500; tentativa++) {
    const n = inteiro(rnd, 4, 5);
    let particoes: number[];
    do {
      particoes = Array.from({ length: n }, () => multiplo(rnd, 30, 160, 10));
    } while (particoes.reduce((a, b) => a + b, 0) > AREA_FIXAS);
    const maior = Math.max(...particoes);

    const passos: ({ chega: ProcessoEx } | { termina: string })[] = [];
    const ativos: string[] = [];
    let cont = 0;
    const total = inteiro(rnd, 7, 9);
    for (let e = 0; e < total; e++) {
      if (ativos.length >= 2 && rnd() < 0.3) {
        const nome = ativos.splice(inteiro(rnd, 0, ativos.length - 1), 1)[0];
        passos.push({ termina: nome });
      } else {
        // às vezes o tamanho é exatamente o de uma partição (encaixe exato)
        const tamanho = rnd() < 0.2 ? particoes[inteiro(rnd, 0, n - 1)] : multiplo(rnd, 10, maior, 5);
        const nome = `P${++cont}`;
        passos.push({ chega: { nome, tamanho } });
        ativos.push(nome);
      }
    }
    const ex = resolverFixas(particoes, politica, passos);
    if (!ex) continue; // só termina quem está numa partição

    const temFila = ex.eventos.some(ev => ev.tipo === 'chegada' && ev.particao === null);
    const saiDaFila = ex.eventos.some(ev => ev.tipo === 'termino' && ev.entra);
    const temFrag = ex.eventos.some(ev => ev.tipo === 'chegada' && (ev.frag ?? 0) > 0);
    if (temFila && saiDaFila && temFrag) return ex;
  }
  // Exemplo fixo do material, caso o sorteio não encontre uma sequência adequada.
  return resolverFixas([200, 100, 50, 30], politica, [
    { chega: { nome: 'P1', tamanho: 150 } }, { chega: { nome: 'P2', tamanho: 120 } }, { chega: { nome: 'P3', tamanho: 50 } },
    { chega: { nome: 'P4', tamanho: 25 } }, { termina: 'P1' }, { chega: { nome: 'P5', tamanho: 90 } },
  ])!;
}

// ───────────────────────── partições variáveis ─────────────────────────

export const SO_VAR = 100;
export const TOTAL_VAR = 500;

export interface AlocadoEx { nome: string; tamanho: number; base: number; }

export type ResultadoVar = 'alocado' | 'fragmentacao' | 'insuficiente';

export type EventoVar =
  | { tipo: 'chegada'; processo: ProcessoEx; resultado: ResultadoVar; base: number | null; baseFirst: number | null }
  | { tipo: 'termino'; processo: string; liberado: Lacuna; entra: ProcessoEx | null; baseEntra: number | null };

export interface EstadoVar {
  alocados: AlocadoEx[];
  /** Circular-fit: a próxima busca começa neste endereço. */
  ponteiro: number;
}

export interface ExercicioAlocacao {
  algoritmo: AlgoritmoFit;
  inicial: EstadoVar;
  eventos: EventoVar[];
  final: EstadoVar;
}

export function lacunasVar(alocados: AlocadoEx[]): Lacuna[] {
  return lacunasEntre(alocados.map(a => ({ inicio: a.base, tamanho: a.tamanho })), SO_VAR, TOTAL_VAR);
}

export function resolverAlocacao(
  algoritmo: AlgoritmoFit,
  inicial: EstadoVar,
  passos: ({ chega: ProcessoEx } | { termina: string })[],
): ExercicioAlocacao | null {
  let alocados = inicial.alocados.map(a => ({ ...a }));
  let ponteiro = inicial.ponteiro;
  const fila: ProcessoEx[] = [];
  const eventos: EventoVar[] = [];

  const alocar = (p: ProcessoEx): number | null => {
    const lac = escolherLacuna(lacunasVar(alocados), p.tamanho, algoritmo, ponteiro);
    if (!lac) return null;
    alocados.push({ ...p, base: lac.inicio });
    ponteiro = lac.inicio + p.tamanho;
    return lac.inicio;
  };

  for (const passo of passos) {
    if ('chega' in passo) {
      const lacunas = lacunasVar(alocados);
      const baseFirst = escolherLacuna(lacunas, passo.chega.tamanho, 'FIRST', ponteiro)?.inicio ?? null;
      const base = alocar(passo.chega);
      if (base === null) {
        const livre = lacunas.reduce((t, l) => t + l.tamanho, 0);
        fila.push(passo.chega);
        eventos.push({ tipo: 'chegada', processo: passo.chega, resultado: livre >= passo.chega.tamanho ? 'fragmentacao' : 'insuficiente', base: null, baseFirst });
      } else {
        eventos.push({ tipo: 'chegada', processo: passo.chega, resultado: 'alocado', base, baseFirst });
      }
    } else {
      const a = alocados.find(x => x.nome === passo.termina);
      if (!a) return null; // só termina quem está na memória
      alocados = alocados.filter(x => x !== a);
      // Tenta a fila em ordem de chegada; o exercício só aceita no máximo um processo entrando por término.
      let entra: ProcessoEx | null = null;
      let baseEntra: number | null = null;
      for (let k = 0; k < fila.length; k++) {
        const b = alocar(fila[k]);
        if (b !== null) {
          if (entra) return null;
          entra = fila.splice(k, 1)[0];
          baseEntra = b;
          k--;
        }
      }
      eventos.push({ tipo: 'termino', processo: passo.termina, liberado: { inicio: a.base, tamanho: a.tamanho }, entra, baseEntra });
    }
  }
  return { algoritmo, inicial, eventos, final: { alocados, ponteiro } };
}

/** Estado inicial com processos e lacunas espalhadas (alocação contígua a partir do SO, depois saídas). */
export function gerarEstadoInicial(rnd: Aleatorio, minLacunas = 2): { estado: EstadoVar; proximoNumero: number } {
  for (;;) {
    const alocados: AlocadoEx[] = [];
    let cursor = SO_VAR;
    let n = 0;
    while (true) {
      const tamanho = multiplo(rnd, 20, 90, 10);
      if (cursor + tamanho > TOTAL_VAR - 20) break;
      alocados.push({ nome: `P${++n}`, tamanho, base: cursor });
      cursor += tamanho;
    }
    // Remove alguns (não vizinhos de propósito, mas pode acontecer: as lacunas se unificam)
    const restantes = alocados.filter(() => rnd() > 0.4);
    const lacunas = lacunasVar(restantes);
    if (restantes.length >= 2 && lacunas.length >= minLacunas && lacunas.length <= 5) {
      const ultimo = restantes.reduce((m, a) => Math.max(m, a.base + a.tamanho), SO_VAR);
      return { estado: { alocados: restantes, ponteiro: ultimo }, proximoNumero: n + 1 };
    }
  }
}

/**
 * Exercício de alocação: estado inicial com lacunas + sequência de chegadas e términos.
 * Garante ao menos uma fragmentação externa e, fora do first-fit, ao menos uma escolha diferente do first-fit.
 */
export function gerarAlocacao(algoritmo: AlgoritmoFit, rnd: Aleatorio = Math.random): ExercicioAlocacao {
  for (let tentativa = 0; tentativa < 2000; tentativa++) {
    const { estado, proximoNumero } = gerarEstadoInicial(rnd, 3);
    let num = proximoNumero;
    const ativos = estado.alocados.map(a => a.nome);
    const passos: ({ chega: ProcessoEx } | { termina: string })[] = [];
    const total = inteiro(rnd, 5, 7);
    for (let e = 0; e < total; e++) {
      if (e > 0 && rnd() < 0.3 && ativos.length) {
        passos.push({ termina: ativos.splice(inteiro(rnd, 0, ativos.length - 1), 1)[0] });
      } else {
        const nome = `P${num++}`;
        passos.push({ chega: { nome, tamanho: multiplo(rnd, 10, 120, 10) } });
        ativos.push(nome);
      }
    }
    const ex = resolverAlocacao(algoritmo, estado, passos);
    if (!ex) continue;
    const chegadas = ex.eventos.filter(e => e.tipo === 'chegada') as Extract<EventoVar, { tipo: 'chegada' }>[];
    const temExterna = chegadas.some(c => c.resultado === 'fragmentacao');
    const alocadas = chegadas.filter(c => c.resultado === 'alocado').length;
    const diferente = algoritmo === 'FIRST' || chegadas.some(c => c.resultado === 'alocado' && c.base !== c.baseFirst);
    if (temExterna && alocadas >= 2 && diferente) return ex;
  }
  throw new Error('Não foi possível gerar o exercício de alocação');
}

/** Exercício "tabela de lacunas": processos espalhados; o aluno informa início e tamanho de cada lacuna. */
export interface ExercicioLacunas { alocados: AlocadoEx[]; lacunas: Lacuna[]; }

export function gerarLacunas(rnd: Aleatorio = Math.random): ExercicioLacunas {
  const { estado } = gerarEstadoInicial(rnd, 2);
  return { alocados: estado.alocados, lacunas: lacunasVar(estado.alocados) };
}

/** Exercício de compactação: novas bases (ordem de endereço) e a lacuna única resultante. */
export interface ExercicioCompactacao {
  alocados: AlocadoEx[];
  novasBases: Record<string, number>;
  lacunaFinal: Lacuna;
}

export function compactar(alocados: AlocadoEx[]): { novasBases: Record<string, number>; lacunaFinal: Lacuna } {
  let cursor = SO_VAR;
  const novasBases: Record<string, number> = {};
  [...alocados].sort((a, b) => a.base - b.base).forEach(a => { novasBases[a.nome] = cursor; cursor += a.tamanho; });
  return { novasBases, lacunaFinal: { inicio: cursor, tamanho: TOTAL_VAR - cursor } };
}

export function gerarCompactacao(rnd: Aleatorio = Math.random): ExercicioCompactacao {
  const { estado } = gerarEstadoInicial(rnd, 3);
  return { alocados: estado.alocados, ...compactar(estado.alocados) };
}

/** Embaralha (para mostrar os processos fora da ordem de endereço quando for útil). */
export function embaralhar<T>(lista: T[], rnd: Aleatorio = Math.random): T[] {
  const c = [...lista];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}
