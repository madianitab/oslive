import { ProcessoSegmentado, alocar, lacunasDe, traduzir, nomeByte } from './segmentacao';

function cria(processos: ProcessoSegmentado[], nome: string, C: number, D: number, P: number) {
  const r = alocar(processos, nome, '#000000', { C, D, P });
  return r.ok ? [...processos, r.processo!] : processos;
}

describe('motor da segmentação', () => {
  it('exemplo do material: D3 = 01 0010 e, com base 0, físico 00010', () => {
    const p: ProcessoSegmentado = { nome: 'A', cor: '#000', segmentos: [
      { tipo: 'C', numero: 0, nome: 'Código', tamanho: 3, base: 10 },
      { tipo: 'D', numero: 1, nome: 'Dados', tamanho: 4, base: 0 },
      { tipo: 'P', numero: 2, nome: 'Pilha', tamanho: 2, base: 20 },
    ] };
    expect(nomeByte('D', 2)).toBe('D3');
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

  it('best-fit: menor segmento primeiro, na menor lacuna que comporta', () => {
    let ps = cria([], 'A', 4, 4, 4);   // 0..11
    ps = cria(ps, 'B', 1, 1, 1);       // 12..14
    ps = cria(ps, 'C', 4, 4, 4);       // 15..26  → livre 27..31 (5)
    ps = ps.filter(p => p.nome !== 'B'); // lacunas: 12 (3) e 27 (5)
    const r = alocar(ps, 'D', '#000', { C: 4, D: 2, P: 1 });
    expect(r.ok).toBeTrue();
    const base = (t: string) => r.processo!.segmentos.find(s => s.tipo === t)!.base;
    expect(base('P')).toBe(12); // 1 byte → menor lacuna (3)
    expect(base('D')).toBe(13); // 2 bytes → lacuna de 2 que sobrou em 13
    expect(base('C')).toBe(27); // 4 bytes → só cabe na lacuna de 5
    expect(r.passos.map(p => p.segmento)).toEqual(['P', 'D', 'C']);
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
