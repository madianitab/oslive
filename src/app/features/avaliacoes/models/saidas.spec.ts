import { ContadorSaidas, tempoFora } from './saidas';

describe('saídas da página durante a prova', () => {
  it('conta uma saída por vez e soma o tempo fora', () => {
    const c = new ContadorSaidas();
    c.sair(1000);
    c.sair(2000);            // blur e aba escondida juntos: continua sendo uma saída
    c.voltar(31_000);
    c.voltar(40_000);        // voltar de novo não soma
    expect(c.retirar()).toEqual({ saidas: 1, segundos: 30 });
    expect(c.retirar()).toEqual({ saidas: 0, segundos: 0 });
  });

  it('guarda a fração de segundo e o que não foi enviado', () => {
    const c = new ContadorSaidas();
    c.sair(0); c.voltar(1500);
    c.sair(2000); c.voltar(2600);
    expect(c.retirar()).toEqual({ saidas: 2, segundos: 2 });   // 2,1 s → 2 s; sobram 0,1 s
    c.devolver({ saidas: 2, segundos: 2 });
    expect(c.retirar()).toEqual({ saidas: 2, segundos: 2 });
  });

  it('a saída conta na hora, antes de voltar', () => {
    const c = new ContadorSaidas();
    c.sair(0);
    expect(c.estaFora).toBeTrue();
    expect(c.retirar()).toEqual({ saidas: 1, segundos: 0 });
  });

  it('formata o tempo fora', () => {
    expect(tempoFora(0)).toBe('0 s');
    expect(tempoFora(45)).toBe('45 s');
    expect(tempoFora(185)).toBe('3 min 05 s');
    expect(tempoFora(3720)).toBe('1 h 02 min');
    expect(tempoFora(null)).toBe('0 s');
  });
});
