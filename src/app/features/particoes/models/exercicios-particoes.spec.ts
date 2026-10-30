import {
  SO_VAR,
  TOTAL_VAR,
  compactar,
  gerarAlocacao,
  gerarCompactacao,
  gerarFixas,
  gerarLacunas,
  resolverAlocacao,
  resolverFixas,
} from './exercicios-particoes';

function semente(s: number) {
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

describe('Exercícios de partições fixas', () => {
  it('primeira que comporta, fila, fragmentação externa e saída da fila (exemplo do material)', () => {
    const ex = resolverFixas([200, 100, 50, 30], 'FIRST', [
      { chega: { nome: 'P1', tamanho: 150 } },
      { chega: { nome: 'P2', tamanho: 120 } },
      { termina: 'P1' },
    ])!;
    expect(ex.eventos[0]).toEqual(jasmine.objectContaining({ particao: 1, frag: 50 }));
    expect(ex.eventos[1]).toEqual(jasmine.objectContaining({ particao: null, externa: true }));
    expect(ex.eventos[2]).toEqual(jasmine.objectContaining({ particaoLiberada: 1, fragEntra: 80 }));
    expect(ex.fragFinal).toBe(80);
  });

  it('menor que comporta escolhe a partição de menor sobra', () => {
    const ex = resolverFixas([200, 100, 50, 30], 'BEST', [{ chega: { nome: 'P1', tamanho: 35 } }])!;
    expect(ex.eventos[0]).toEqual(jasmine.objectContaining({ particao: 3, frag: 15 }));
  });

  it('não deixa terminar processo que está na fila', () => {
    expect(resolverFixas([50], 'FIRST', [{ chega: { nome: 'P1', tamanho: 50 } }, { chega: { nome: 'P2', tamanho: 40 } }, { termina: 'P2' }])).toBeNull();
  });

  it('o gerador sempre inclui fila, saída da fila e fragmentação interna', () => {
    for (let s = 1; s <= 30; s++) {
      const ex = gerarFixas(s % 2 ? 'FIRST' : 'BEST', semente(s));
      expect(ex.particoes.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(380);
      expect(ex.eventos.some(e => e.tipo === 'chegada' && e.particao === null)).toBeTrue();
      expect(ex.eventos.some(e => e.tipo === 'termino' && e.entra)).toBeTrue();
    }
  });
});

describe('Exercícios de partições variáveis', () => {
  const inicial = { alocados: [{ nome: 'P1', tamanho: 60, base: 160 }, { nome: 'P2', tamanho: 70, base: 330 }], ponteiro: 400 };
  // lacunas: 100–159 (60), 220–329 (110), 400–499 (100)

  it('first, best e worst-fit escolhem lacunas diferentes', () => {
    const passo = [{ chega: { nome: 'P3', tamanho: 50 } }];
    const base = (alg: any) => (resolverAlocacao(alg, inicial, passo)!.eventos[0] as any).base;
    expect(base('FIRST')).toBe(100);
    expect(base('BEST')).toBe(100);
    expect(base('WORST')).toBe(220);
    expect(base('CIRCULAR')).toBe(400);
  });

  it('fragmentação externa e entrada da fila quando um vizinho termina (lacunas unificadas)', () => {
    const ex = resolverAlocacao('FIRST', inicial, [
      { chega: { nome: 'P3', tamanho: 150 } },
      { termina: 'P2' },
    ])!;
    expect(ex.eventos[0]).toEqual(jasmine.objectContaining({ resultado: 'fragmentacao', base: null }));
    // P2 sai: 220–499 vira uma lacuna de 280 KB; P3 entra em 220
    expect(ex.eventos[1]).toEqual(jasmine.objectContaining({ baseEntra: 220 }));
  });

  it('memória insuficiente quando o total livre não basta', () => {
    const ex = resolverAlocacao('FIRST', inicial, [{ chega: { nome: 'P3', tamanho: 300 } }])!;
    expect((ex.eventos[0] as any).resultado).toBe('insuficiente');
  });

  it('compactação leva os processos para o início, em ordem de endereço', () => {
    const r = compactar([{ nome: 'B', tamanho: 70, base: 330 }, { nome: 'A', tamanho: 60, base: 160 }]);
    expect(r.novasBases).toEqual({ A: 100, B: 160 });
    expect(r.lacunaFinal).toEqual({ inicio: 230, tamanho: 270 });
  });

  it('geradores: alocação com fragmentação externa; lacunas e compactação consistentes', () => {
    for (let s = 1; s <= 20; s++) {
      const rnd = semente(s);
      for (const alg of ['FIRST', 'BEST', 'WORST', 'CIRCULAR'] as const) {
        const ex = gerarAlocacao(alg, rnd);
        expect(ex.eventos.some(e => e.tipo === 'chegada' && e.resultado === 'fragmentacao')).toBeTrue();
      }
      const l = gerarLacunas(rnd);
      const ocupado = l.alocados.reduce((t, a) => t + a.tamanho, 0);
      const livre = l.lacunas.reduce((t, a) => t + a.tamanho, 0);
      expect(ocupado + livre).toBe(TOTAL_VAR - SO_VAR);
      const c = gerarCompactacao(rnd);
      expect(c.lacunaFinal.inicio + c.lacunaFinal.tamanho).toBe(TOTAL_VAR);
    }
  });
});
