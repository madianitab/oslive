/**
 * Segunda Chance e Segunda Chance Melhorada em sequência (exercício de situações encadeadas).
 *
 * Representação do material: fila em ordem de momento da carga, com o bit de referência (R)
 * e, na versão melhorada, o bit de modificação (M).
 *
 * Regras:
 * - Carga: a página entra no fim da fila com R = 0 e M = 0.
 * - Acesso de leitura liga R; acesso de escrita liga R e M.
 * - Segunda Chance: percorre a fila a partir do início. Com R = 1, a página ganha segunda chance:
 *   R vira 0, recebe o momento atual e vai para o fim da fila (o relógio avança um).
 *   A primeira com R = 0 é a vítima. Se todas tinham R = 1, depois da volta completa sai a
 *   primeira da fila original (comportamento de FIFO).
 * - Segunda Chance Melhorada (classes R,M: (0,0) → (0,1) → (1,0) → (1,1)):
 *   1ª volta: procura (0,0) sem alterar nada;
 *   2ª volta: procura (0,1); quem tem R = 1 e é ultrapassada tem R zerado, recebe o momento
 *   atual e vai para o fim da fila (M é mantido);
 *   se não encontrar, repete as voltas (agora todas com R = 0).
 * - Momentos: a falta ocorre no momento t; cada página que ganha segunda chance recebe t, t+1…
 *   e a nova página entra no momento seguinte (como no slide: A recebe 20 e X entra em 21).
 */

export type AlgoritmoSC = 'SC' | 'SCM';

export interface PaginaFila {
  nome: string;
  carga: number;
  r: 0 | 1;
  m: 0 | 1;
}

export interface Acesso {
  momento: number;
  pagina: string;
  escrita: boolean;
}

/** Um passo da busca pela vítima, usado na explicação. */
export interface PassoSC {
  pagina: string;
  volta: number;
  acao: 'segunda-chance' | 'pulada' | 'vitima';
  r: 0 | 1;
  m: 0 | 1;
  novoMomento?: number;
}

/** Caso didático da situação (usado para variar os cenários). */
export type CasoSC =
  | 'fifo'          // nenhuma com bit ligado: sai a primeira (vira FIFO)
  | 'primeira'      // a primeira da fila sai direto
  | 'meio'          // algumas ganham segunda chance e sai uma do meio
  | 'ultima'        // todas antes da última ganham segunda chance
  | 'volta'         // todas com R = 1: volta completa
  | 'pula'          // melhorada: 1ª volta pula páginas até achar (0,0)
  | 'segunda-volta' // melhorada: não há (0,0); sai a primeira (0,1) na 2ª volta
  | 'todas-r1';     // melhorada: todas com R = 1; voltas extras

export const CASOS_OBRIGATORIOS: Record<AlgoritmoSC, CasoSC[]> = {
  SC: ['primeira', 'meio', 'ultima', 'volta', 'fifo'],
  SCM: ['pula', 'segunda-volta', 'todas-r1'],
};

/**
 * Acessos só ligam bits; quem zera R é a própria substituição. Por isso alguns casos dependem do histórico:
 * - SC 'fifo' (todas com R = 0) aparece depois de uma volta completa ('volta');
 * - melhorada 'primeira' só ocorre enquanto a mais antiga for (0,0); quando possível, é escolhida logo.
 */
const PREPARO: Partial<Record<AlgoritmoSC, { caso: CasoSC; via: CasoSC }>> = {
  SC: { caso: 'fifo', via: 'volta' },
};
const RAROS: Record<AlgoritmoSC, CasoSC[]> = { SC: ['fifo'], SCM: ['primeira', 'fifo'] };

export const NOMES_CASOS: Record<CasoSC, string> = {
  fifo: 'nenhum bit ligado (FIFO)',
  primeira: 'sai a primeira da fila',
  meio: 'sai uma do meio da fila',
  ultima: 'sai a última da fila',
  volta: 'todas com R = 1 (volta completa)',
  pula: '1ª volta pula até achar (0,0)',
  'segunda-volta': 'sem (0,0): sai (0,1) na 2ª volta',
  'todas-r1': 'todas com R = 1 (voltas extras)',
};

export interface ResultadoSubstituicao {
  vitima: PaginaFila;
  /** Posição da vítima na fila antes da falta (0 = início). */
  posicaoVitima: number;
  passos: PassoSC[];
  filaFinal: PaginaFila[];
  /** Momento em que a nova página entrou. */
  momentoNova: number;
  caso: CasoSC;
}

export function copiarFila(fila: PaginaFila[]): PaginaFila[] {
  return fila.map(p => ({ ...p }));
}

/** Aplica os acessos (liga R; na escrita liga também M). */
export function aplicarAcessos(fila: PaginaFila[], acessos: Acesso[]): PaginaFila[] {
  const nova = copiarFila(fila);
  for (const a of acessos) {
    const p = nova.find(x => x.nome === a.pagina);
    if (!p) continue;
    p.r = 1;
    if (a.escrita) p.m = 1;
  }
  return nova;
}

/**
 * Executa a substituição para a página `nova`, com a falta no momento `momento`.
 * `fila` é a fila já com os acessos aplicados.
 */
export function substituir(fila: PaginaFila[], nova: string, momento: number, algoritmo: AlgoritmoSC): ResultadoSubstituicao {
  if (fila.length === 0) throw new Error('Fila vazia');
  const original = copiarFila(fila);
  const q = copiarFila(fila);
  const passos: PassoSC[] = [];
  let t = momento;
  let vitima: PaginaFila | null = null;

  const daSegundaChance = (volta: number) => {
    const p = q.shift()!;
    passos.push({ pagina: p.nome, volta, acao: 'segunda-chance', r: p.r, m: p.m, novoMomento: t });
    p.r = 0;
    p.carga = t++;
    q.push(p);
  };

  if (algoritmo === 'SC') {
    // No máximo n segundas chances: depois disso todas têm R = 0.
    for (let i = 0; i <= original.length && !vitima; i++) {
      if (q[0].r === 0) {
        passos.push({ pagina: q[0].nome, volta: 1, acao: 'vitima', r: 0, m: q[0].m });
        vitima = q.shift()!;
      } else {
        daSegundaChance(1);
      }
    }
  } else {
    // Voltas alternadas: ímpares procuram (0,0) sem alterar; pares procuram (0,1) e zeram R.
    for (let volta = 1; volta <= 4 && !vitima; volta++) {
      if (volta % 2 === 1) {
        const idx = q.findIndex(p => p.r === 0 && p.m === 0);
        const limite = idx === -1 ? q.length : idx;
        for (let k = 0; k < limite; k++) passos.push({ pagina: q[k].nome, volta, acao: 'pulada', r: q[k].r, m: q[k].m });
        if (idx !== -1) {
          passos.push({ pagina: q[idx].nome, volta, acao: 'vitima', r: 0, m: 0 });
          vitima = q.splice(idx, 1)[0];
        }
      } else {
        const n = q.length;
        for (let k = 0; k < n && !vitima; k++) {
          const p = q[0];
          if (p.r === 0 && p.m === 1) {
            passos.push({ pagina: p.nome, volta, acao: 'vitima', r: 0, m: 1 });
            vitima = q.shift()!;
          } else if (p.r === 1) {
            daSegundaChance(volta);
          } else {
            // (0,0) não aparece aqui (a volta anterior teria escolhido); só por segurança.
            passos.push({ pagina: p.nome, volta, acao: 'pulada', r: p.r, m: p.m });
            q.push(q.shift()!);
          }
        }
      }
    }
  }

  const v = vitima!;
  const momentoNova = t;
  q.push({ nome: nova, carga: momentoNova, r: 0, m: 0 });
  return {
    vitima: v,
    posicaoVitima: original.findIndex(p => p.nome === v.nome),
    passos,
    filaFinal: q,
    momentoNova,
    caso: classificar(original, v, algoritmo),
  };
}

export function classificar(fila: PaginaFila[], vitima: PaginaFila, algoritmo: AlgoritmoSC): CasoSC {
  const pos = fila.findIndex(p => p.nome === vitima.nome);
  if (algoritmo === 'SC') {
    if (fila.every(p => p.r === 0)) return 'fifo';
    if (fila.every(p => p.r === 1)) return 'volta';
    if (pos === 0) return 'primeira';
    if (pos === fila.length - 1) return 'ultima';
    return 'meio';
  }
  if (fila.every(p => p.r === 0 && p.m === 0)) return 'fifo';
  const tem00 = fila.some(p => p.r === 0 && p.m === 0);
  if (tem00) return pos === 0 ? 'primeira' : 'pula';
  if (fila.some(p => p.r === 0 && p.m === 1)) return 'segunda-volta';
  return 'todas-r1';
}

// ───────────────────────── geração aleatória ─────────────────────────

export type Aleatorio = () => number;

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function inteiro(rnd: Aleatorio, min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

/** Fila inicial: páginas em ordem alfabética de carga, momentos crescentes e bits aleatórios. */
export function gerarFilaInicial(algoritmo: AlgoritmoSC, rnd: Aleatorio = Math.random): PaginaFila[] {
  const n = inteiro(rnd, 6, 8);
  let momento = 0;
  return LETRAS.slice(0, n).map((nome, i) => {
    if (i > 0) momento += inteiro(rnd, 1, 4);
    let r = (rnd() < 0.45 ? 1 : 0) as 0 | 1;
    let m = (algoritmo === 'SCM' && rnd() < 0.4 ? 1 : 0) as 0 | 1;
    // Melhorada: muitas vezes a mais antiga começa (0,0), para o caso "sai a primeira" ser possível.
    if (algoritmo === 'SCM' && i === 0 && rnd() < 0.6) { r = 0; m = 0; }
    return { nome, carga: momento, r, m };
  });
}

/** Próximo momento livre: depois da última carga. */
export function proximoMomento(fila: PaginaFila[]): number {
  return Math.max(...fila.map(p => p.carga)) + 1;
}

/** Página que provoca a falta: uma que não está na memória (às vezes, uma vítima anterior que volta). */
export function escolherNova(fila: PaginaFila[], vitimasAnteriores: string[], rnd: Aleatorio = Math.random): string {
  const naMemoria = new Set(fila.map(p => p.nome));
  const voltam = vitimasAnteriores.filter(n => !naMemoria.has(n));
  if (voltam.length && rnd() < 0.3) return voltam[inteiro(rnd, 0, voltam.length - 1)];
  const livres = LETRAS.filter(l => !naMemoria.has(l) && !vitimasAnteriores.includes(l));
  const fim = livres.slice(-10); // letras do fim do alfabeto, como X e W nos slides
  const lista = fim.length ? fim : LETRAS.filter(l => !naMemoria.has(l));
  return lista[inteiro(rnd, 0, lista.length - 1)];
}

export interface Situacao {
  /** Fila no início da situação (antes dos acessos). */
  filaInicial: PaginaFila[];
  acessos: Acesso[];
  /** Fila depois dos acessos, no momento da falta. */
  filaFalta: PaginaFila[];
  momentoFalta: number;
  nova: string;
  resultado: ResultadoSubstituicao;
}

/**
 * Gera os acessos de uma situação buscando um caso ainda não visto (para variar os cenários).
 * Testa vários conjuntos de acessos e escolhe um que produza o caso desejado.
 */
export function gerarSituacao(
  fila: PaginaFila[],
  algoritmo: AlgoritmoSC,
  casosVistos: CasoSC[],
  vitimasAnteriores: string[],
  ultimoCaso: CasoSC | null,
  rnd: Aleatorio = Math.random,
): Situacao {
  const inicio = proximoMomento(fila);
  const candidatos: { acessos: { pagina: string; escrita: boolean }[]; caso: CasoSC }[] = [];

  const avaliar = (escolhas: { pagina: string; escrita: boolean }[]) => {
    const acessos = escolhas.map((e, i) => ({ ...e, momento: inicio + i }));
    const filaFalta = aplicarAcessos(fila, acessos);
    const res = substituir(filaFalta, '?', inicio + acessos.length, algoritmo);
    candidatos.push({ acessos: escolhas, caso: res.caso });
  };

  // Sem acessos.
  avaliar([]);
  // Prefixos: acessa as k primeiras (leva a vítima mais para o fim) e, às vezes, outras depois delas.
  for (let k = 1; k <= fila.length; k++) {
    for (let rep = 0; rep < 4; rep++) {
      const escolhas: { pagina: string; escrita: boolean }[] = [];
      fila.forEach((p, i) => {
        const acessar = i < k ? p.r === 0 || rnd() < 0.25 : rnd() < 0.2;
        if (acessar) escolhas.push({ pagina: p.nome, escrita: algoritmo === 'SCM' && rnd() < 0.35 });
      });
      avaliar(embaralharAcessos(escolhas, rnd));
    }
  }
  // Conjuntos aleatórios com intensidades diferentes.
  for (const prob of [0.15, 0.3, 0.5, 0.7]) {
    for (let rep = 0; rep < 6; rep++) {
      const escolhas = fila.filter(() => rnd() < prob)
        .map(p => ({ pagina: p.nome, escrita: algoritmo === 'SCM' && rnd() < 0.35 }));
      avaliar(escolhas);
    }
  }
  // Melhorada: acessar só as (0,0), deixando as (0,1) → leva à 2ª volta.
  if (algoritmo === 'SCM') {
    for (let rep = 0; rep < 4; rep++) {
      const escolhas = fila.filter(p => p.r === 0 && p.m === 0)
        .map(p => ({ pagina: p.nome, escrita: rnd() < 0.3 }));
      avaliar(embaralharAcessos(escolhas, rnd));
    }
  }

  const possiveis = Array.from(new Set(candidatos.map(c => c.caso)));
  const faltando = CASOS_OBRIGATORIOS[algoritmo].filter(c => !casosVistos.includes(c) && possiveis.includes(c));
  let alvo: CasoSC;
  const raro = RAROS[algoritmo].find(c => !casosVistos.includes(c) && possiveis.includes(c));
  if (raro) {
    alvo = raro;
  } else if (faltando.length) {
    alvo = faltando[inteiro(rnd, 0, faltando.length - 1)];
  } else {
    // Alguns casos só ficam possíveis depois que os bits R são zerados por uma volta completa
    // (acessos só ligam bits): SC 'fifo' depende de 'volta'; melhorada 'primeira' depende de 'todas-r1'.
    const preparo = PREPARO[algoritmo];
    const precisaPreparar = !!preparo && !casosVistos.includes(preparo.caso) && possiveis.includes(preparo.via);
    const variados = possiveis.filter(c => c !== ultimoCaso);
    if (precisaPreparar) alvo = preparo!.via;
    else alvo = (variados.length ? variados : possiveis)[inteiro(rnd, 0, (variados.length ? variados : possiveis).length - 1)];
  }

  // Entre os candidatos do caso escolhido, prefere poucos acessos (no máximo 5, quando possível).
  const doCaso = candidatos.filter(c => c.caso === alvo);
  const curtos = doCaso.filter(c => c.acessos.length <= 5);
  const lista = curtos.length ? curtos : doCaso;
  const escolhido = lista[inteiro(rnd, 0, lista.length - 1)];

  const acessos = escolhido.acessos.map((e, i) => ({ ...e, momento: inicio + i }));
  const filaFalta = aplicarAcessos(fila, acessos);
  const momentoFalta = inicio + acessos.length;
  const nova = escolherNova(fila, vitimasAnteriores, rnd);
  return {
    filaInicial: copiarFila(fila),
    acessos,
    filaFalta,
    momentoFalta,
    nova,
    resultado: substituir(filaFalta, nova, momentoFalta, algoritmo),
  };
}

function embaralharAcessos<T>(lista: T[], rnd: Aleatorio): T[] {
  const c = [...lista];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}
