import {
  CASOS_OBRIGATORIOS,
  PaginaFila,
  aplicarAcessos,
  gerarFilaInicial,
  gerarSituacao,
  substituir,
} from './segunda-chance-sequencia';

/** Monta a fila a partir de "A:0:1" (nome:carga:R) ou "A:0:1:0" (com M). */
function fila(...itens: string[]): PaginaFila[] {
  return itens.map(s => {
    const [nome, carga, r, m] = s.split(':');
    return { nome, carga: +carga, r: +r as 0 | 1, m: (m ? +m : 0) as 0 | 1 };
  });
}
const nomes = (f: PaginaFila[]) => f.map(p => `${p.nome}${p.carga}/${p.r}`).join(' ');

/** Gerador determinístico para os testes de geração. */
function semente(s: number) {
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

describe('Segunda Chance em sequência (exemplo dos slides)', () => {
  const inicial = fila('A:0:1', 'B:3:0', 'C:7:0', 'D:8:0', 'E:12:1', 'F:14:1', 'G:15:0', 'H:18:0');

  it('momento 20, acesso a X: A ganha segunda chance (20) e B é a vítima; X entra em 21', () => {
    const r = substituir(inicial, 'X', 20, 'SC');
    expect(r.vitima.nome).toBe('B');
    expect(r.caso).toBe('meio');
    expect(r.momentoNova).toBe(21);
    expect(nomes(r.filaFinal)).toBe('C7/0 D8/0 E12/1 F14/1 G15/0 H18/0 A20/0 X21/0');
  });

  it('momento 22 C é acessada; momento 23 W é solicitada: C ganha segunda chance e D sai', () => {
    const depois = substituir(inicial, 'X', 20, 'SC').filaFinal;
    const comAcesso = aplicarAcessos(depois, [{ momento: 22, pagina: 'C', escrita: false }]);
    const r = substituir(comAcesso, 'W', 23, 'SC');
    expect(r.vitima.nome).toBe('D');
    expect(nomes(r.filaFinal)).toBe('E12/1 F14/1 G15/0 H18/0 A20/0 X21/0 C23/0 W24/0');
  });

  it('nenhum bit ligado: sai a primeira (FIFO)', () => {
    const r = substituir(fila('A:0:0', 'B:1:0', 'C:2:0'), 'Z', 5, 'SC');
    expect(r.vitima.nome).toBe('A');
    expect(r.caso).toBe('fifo');
    expect(r.momentoNova).toBe(5);
  });

  it('todas com bit 1: volta completa e sai a primeira da fila original', () => {
    const r = substituir(fila('A:0:1', 'B:1:1', 'C:2:1'), 'Z', 5, 'SC');
    expect(r.vitima.nome).toBe('A');
    expect(r.caso).toBe('volta');
    expect(nomes(r.filaFinal)).toBe('B6/0 C7/0 Z8/0');
  });

  it('todas antes da última com bit 1: sai a última', () => {
    const r = substituir(fila('A:0:1', 'B:1:1', 'C:2:0'), 'Z', 5, 'SC');
    expect(r.vitima.nome).toBe('C');
    expect(r.caso).toBe('ultima');
  });
});

describe('Segunda Chance Melhorada', () => {
  it('1ª volta: pula (0,1) e (1,x) e escolhe a primeira (0,0), sem alterar bits', () => {
    const f = fila('A:0:0:1', 'B:1:1:0', 'C:2:0:0', 'D:3:1:1');
    const r = substituir(f, 'Z', 9, 'SCM');
    expect(r.vitima.nome).toBe('C');
    expect(r.caso).toBe('pula');
    expect(r.filaFinal.map(p => `${p.nome}${p.r}${p.m}`).join(' ')).toBe('A01 B10 D11 Z00');
    expect(r.momentoNova).toBe(9);
  });

  it('sem (0,0): na 2ª volta zera R de quem passa e escolhe a primeira (0,1)', () => {
    const f = fila('A:0:1:0', 'B:1:0:1', 'C:2:1:1');
    const r = substituir(f, 'Z', 9, 'SCM');
    expect(r.vitima.nome).toBe('B');
    expect(r.caso).toBe('segunda-volta');
    expect(r.filaFinal.map(p => `${p.nome}${p.carga}/${p.r}${p.m}`).join(' ')).toBe('C2/11 A9/00 Z10/00');
  });

  it('todas com R = 1: após a 2ª volta, a 3ª acha a primeira (0,0)', () => {
    const f = fila('A:0:1:1', 'B:1:1:0', 'C:2:1:1');
    const r = substituir(f, 'Z', 9, 'SCM');
    expect(r.vitima.nome).toBe('B');
    expect(r.caso).toBe('todas-r1');
  });

  it('todas (1,1): após zerar R, a 4ª volta escolhe a primeira (0,1)', () => {
    const f = fila('A:0:1:1', 'B:1:1:1');
    const r = substituir(f, 'Z', 9, 'SCM');
    expect(r.vitima.nome).toBe('A');
  });

  it('escrita liga R e M', () => {
    const f = aplicarAcessos(fila('A:0:0:0'), [{ momento: 1, pagina: 'A', escrita: true }]);
    expect(f[0].r).toBe(1);
    expect(f[0].m).toBe(1);
  });
});

describe('Geração das situações', () => {
  it('situação 1: a fila começa com bits 0 e todo bit ligado vem de um acesso mostrado', () => {
    for (let s = 1; s <= 30; s++) {
      for (const alg of ['SC', 'SCM'] as const) {
        const rnd = semente(s);
        const f = gerarFilaInicial(alg, rnd);
        expect(f.every(p => p.r === 0 && p.m === 0)).toBeTrue();
        const sit = gerarSituacao(f, alg, [], [], null, rnd);
        const acessadas = new Set(sit.acessos.map(a => a.pagina));
        sit.filaFalta.filter(p => p.r === 1 || p.m === 1).forEach(p => expect(acessadas.has(p.nome)).toBeTrue());
      }
    }
  });

  for (const alg of ['SC', 'SCM'] as const) {
    it(`${alg}: 10 situações encadeadas cobrem os casos obrigatórios`, () => {
      // Várias sementes: a cobertura deve acontecer em todas.
      let comPrimeira = 0;
      for (let s = 1; s <= 20; s++) {
        const rnd = semente(s);
        let f = gerarFilaInicial(alg, rnd);
        const vistos: any[] = [];
        const vitimas: string[] = [];
        for (let i = 0; i < 10; i++) {
          const sit = gerarSituacao(f, alg, vistos, vitimas, vistos[vistos.length - 1] ?? null, rnd);
          expect(sit.filaFalta.some(p => p.nome === sit.nova)).toBeFalse();
          vistos.push(sit.resultado.caso);
          vitimas.push(sit.resultado.vitima.nome);
          f = sit.resultado.filaFinal;
        }
        const faltam = CASOS_OBRIGATORIOS[alg].filter(c => !vistos.includes(c));
        expect(faltam).withContext(`semente ${s}: ${vistos.join(',')}`).toEqual([]);
        if (vistos.includes('primeira')) comPrimeira++;
      }
      // "Sai a primeira" aparece na maioria dos exercícios (na melhorada depende da fila inicial).
      expect(comPrimeira).toBeGreaterThanOrEqual(10);
    });
  }
});
