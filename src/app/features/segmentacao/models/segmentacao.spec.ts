import { ProcessoSegmentado, alocar, compactar, lacunasDe, traduzir, nomeByte } from './segmentacao';

function cria(processos: ProcessoSegmentado[], nome: string, C: number, D: number, P: number) {
  const r = alocar(processos, nome, '#000000', { C, D, P });
  return r.ok ? [...processos, r.processo!] : processos;
}

describe('motor da segmentação', () => {
  it('D2 = 01 0010 (dados, deslocamento 2) e, com base 0, físico 00010', () => {
    const p: ProcessoSegmentado = { nome: 'A', cor: '#000', segmentos: [
      { tipo: 'C', numero: 0, nome: 'Código', tamanho: 3, base: 10 },
      { tipo: 'D', numero: 1, nome: 'Dados', tamanho: 4, base: 0 },
      { tipo: 'P', numero: 2, nome: 'Pilha', tamanho: 2, base: 20 },
    ] };
    expect(nomeByte('D', 2)).toBe('D2');
    expect(traduzir(p, 1, 2)).toEqual({ ok: true, fisico: 2, erro: null });
  });

  it('deslocamento maior ou igual ao limite e segmento inexistente geram interrupção', () => {
    const p = cria([], 'A', 2, 2, 2)[0];
    expect(traduzir(p, 0, 2).ok).toBeFalse();
    expect(traduzir(p, 3, 0).ok).toBeFalse();
  });

  it('números dos segmentos são 00, 01 e 10', () => {
    const p = cria([], 'A', 3, 1, 2)[0];
    expect(p.segmentos.map(s => s.numero)).toEqual([0, 1, 2]);
  });

  it('best-fit na ordem do processo (código → dados → pilha), menor lacuna que comporta', () => {
    let ps = cria([], 'A', 4, 4, 4);   // 0..11
    ps = cria(ps, 'B', 1, 1, 1);       // 12..14
    ps = cria(ps, 'C', 4, 4, 4);       // 15..26  → livre 27..31 (5)
    ps = ps.filter(p => p.nome !== 'B'); // lacunas: 12 (3) e 27 (5)
    const r = alocar(ps, 'D', '#000', { C: 4, D: 2, P: 1 });
    expect(r.ok).toBeTrue();
    const base = (t: string) => r.processo!.segmentos.find(s => s.tipo === t)!.base;
    expect(r.passos.map(p => p.segmento)).toEqual(['C', 'D', 'P']);
    expect(base('C')).toBe(27); // 4 bytes: só cabe na lacuna de 5
    expect(base('D')).toBe(12); // 2 bytes: menor lacuna que comporta (3)
    expect(base('P')).toBe(14); // 1 byte: lacunas de 1 em 14 e em 31 → empate, menor endereço
  });

  it('caso do exercício: código de 3 bytes vai para a lacuna de 3 (encaixe exato)', () => {
    // monta lacunas de 6 (em 8), 5 (em 20) e 3 (em 29)
    const p = (nome: string, segs: [number, number][]): ProcessoSegmentado => ({
      nome, cor: '#000', segmentos: segs.map(([base, tamanho], i) => ({
        tipo: (['C', 'D', 'P'] as const)[i], numero: i, nome: '', tamanho, base })),
    });
    const ps = [p('A', [[0, 3], [3, 3], [6, 2]]), p('B', [[14, 1], [15, 1], [16, 4]]), p('C', [[25, 1], [26, 1], [27, 2]])];
    expect(lacunasDe(ps)).toEqual([{ inicio: 8, tamanho: 6 }, { inicio: 20, tamanho: 5 }, { inicio: 29, tamanho: 3 }]);
    const r = alocar(ps, 'D', '#000', { C: 3, D: 1, P: 4 });
    const base = (t: string) => r.processo!.segmentos.find(s => s.tipo === t)!.base;
    expect([base('C'), base('D'), base('P')]).toEqual([29, 20, 21]);
  });

  it('compactação junta as lacunas e só muda as bases', () => {
    let ps = cria([], 'A', 2, 2, 2);
    ps = cria(ps, 'B', 3, 3, 3);
    ps = cria(ps, 'C', 2, 2, 2);
    ps = ps.filter(p => p.nome !== 'B');
    expect(lacunasDe(ps).length).toBe(2);
    const comp = compactar(ps);
    expect(lacunasDe(comp)).toEqual([{ inicio: 12, tamanho: 20 }]);
    expect(comp.map(p => p.segmentos.map(s => s.tamanho))).toEqual(ps.map(p => p.segmentos.map(s => s.tamanho)));
  });

  it('fragmentação externa: memória livre suficiente, mas nenhuma lacuna comporta o segmento', () => {
    let ps = cria([], 'A', 3, 3, 3);   // 0..8
    ps = cria(ps, 'B', 1, 1, 1);       // 9..11
    ps = cria(ps, 'C', 5, 6, 6);       // 12..28 → livre 29..31
    ps = ps.filter(p => p.nome !== 'B'); // lacunas de 3 bytes em 9 e em 29 (6 livres)
    expect(lacunasDe(ps)).toEqual([{ inicio: 9, tamanho: 3 }, { inicio: 29, tamanho: 3 }]);
    const frag = alocar(ps, 'D', '#000', { C: 4, D: 1, P: 1 }); // 6 bytes, mas o código (4) não cabe
    expect(frag.ok).toBeFalse();
    expect(frag.motivo).toBe('fragmentacao');
    const insuf = alocar(ps, 'D', '#000', { C: 3, D: 3, P: 1 }); // 7 > 6
    expect(insuf.motivo).toBe('insuficiente');
  });
});
