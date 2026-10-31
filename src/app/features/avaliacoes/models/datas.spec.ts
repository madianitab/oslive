import { dataHora, deCampoData, paraCampoData, tempoRestante } from './datas';

describe('datas das avaliações (horário de Brasília)', () => {
  it('campo → ISO com -03:00 e volta', () => {
    const iso = deCampoData('2026-11-10T19:30');
    expect(iso).toBe('2026-11-10T19:30:00-03:00');
    expect(new Date(iso).toISOString()).toBe('2026-11-10T22:30:00.000Z');
    expect(paraCampoData(iso)).toBe('2026-11-10T19:30');
  });

  it('mostra em Brasília mesmo vindo em UTC', () => {
    expect(dataHora('2026-11-10T22:30:00Z')).toBe('10/11/2026 19:30');
    expect(dataHora('2026-11-11T02:05:00Z')).toBe('10/11/2026 23:05');
  });

  it('recusa data incompleta', () => {
    expect(() => deCampoData('2026-11-10')).toThrow();
  });

  it('relógio', () => {
    expect(tempoRestante(65_000)).toBe('1:05');
    expect(tempoRestante(3_725_000)).toBe('1:02:05');
    expect(tempoRestante(-5)).toBe('0:00');
  });
});
