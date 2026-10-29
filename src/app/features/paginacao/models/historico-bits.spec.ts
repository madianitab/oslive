import { bitsT1aT4, deslocarHistorico, valorHistoricoBits, vitimaHistorico } from './historico-bits';

// historico guarda o mais recente primeiro: [T4, T3, T2, T1]
const pag = (nome: string, t1: number, t2: number, t3: number, t4: number, timestamp: number) =>
  ({ nome, historico: [t4, t3, t2, t1], timestamp });

describe('histórico de bits de referência', () => {
  it('compara a partir de T4: quem tem bit 0 em T4 é candidata', () => {
    const v = vitimaHistorico([pag('A0', 0, 0, 0, 1, 100), pag('B0', 1, 1, 1, 0, 101)]);
    expect(v!.nome).toBe('B0');
  });

  it('no empate em T4, olha T3, depois T2 e T1', () => {
    const v = vitimaHistorico([
      pag('A0', 0, 1, 1, 0, 100),
      pag('B0', 1, 0, 1, 0, 101),
      pag('C0', 1, 1, 0, 0, 102),
    ]);
    expect(v!.nome).toBe('C0');
  });

  it('empate em todos os bits: sai a de menor timestamp', () => {
    const v = vitimaHistorico([pag('A0', 1, 0, 1, 0, 105), pag('B0', 1, 0, 1, 0, 101), pag('C0', 1, 1, 1, 1, 100)]);
    expect(v!.nome).toBe('B0');
  });

  it('valor lido de T4 para T1', () => {
    expect(valorHistoricoBits(pag('X', 1, 0, 0, 0, 0).historico)).toBe(1);   // só T1
    expect(valorHistoricoBits(pag('X', 0, 0, 0, 1, 0).historico)).toBe(8);   // só T4
  });

  it('a passagem do instante coloca o bit de referência em T4 e descarta T1', () => {
    const h = pag('X', 1, 0, 1, 1, 0).historico;           // T1..T4 = 1 0 1 1
    expect(bitsT1aT4(deslocarHistorico(h, 0, 4))).toEqual([0, 1, 1, 0]);
    expect(bitsT1aT4(deslocarHistorico(h, 1, 4))).toEqual([0, 1, 1, 1]);
  });
});
