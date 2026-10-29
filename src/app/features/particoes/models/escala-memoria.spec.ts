import { marcasEscala } from './escala-memoria';

describe('escala da memória', () => {
  it('usa os limites reais das partições (exemplo da aula: SO 120 KB + 200, 100, 50, 30)', () => {
    const m = marcasEscala([120, 320, 420, 470], 500, 1.2);
    expect(m.map(x => x.valor)).toEqual([0, 120, 320, 420, 470, 500]);
    expect(m[1].topo).toBeCloseTo(144);
    expect(m[5].topo).toBeCloseTo(600);
  });

  it('não repete limites e ignora valores fora da memória', () => {
    expect(marcasEscala([100, 100, 600, -5], 500, 1).map(x => x.valor)).toEqual([0, 100, 500]);
  });

  it('afasta rótulos muito próximos sem passar do fim da barra', () => {
    const m = marcasEscala([490, 495], 500, 1, 12);
    expect(m.map(x => x.topo)).toEqual([0, 476, 488, 500]);
  });
});
