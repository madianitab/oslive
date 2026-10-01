import { escolherLacuna, lacunasEntre, protecao, Lacuna } from './particoes';
import { SimuladorParticoesVariaveisService } from '../services/simulador-particoes-variaveis.service';
import { SimuladorParticoesFixasService } from '../services/simulador-particoes-fixas.service';

describe('partições', () => {
  const lac: Lacuna[] = [{ inicio: 100, tamanho: 60 }, { inicio: 200, tamanho: 100 }, { inicio: 340, tamanho: 30 }, { inicio: 410, tamanho: 90 }];

  it('first, best, worst e circular-fit escolhem lacunas diferentes', () => {
    expect(escolherLacuna(lac, 25, 'FIRST', 0)!.inicio).toBe(100);
    expect(escolherLacuna(lac, 25, 'BEST', 0)!.inicio).toBe(340);
    expect(escolherLacuna(lac, 25, 'WORST', 0)!.inicio).toBe(200);
    expect(escolherLacuna(lac, 25, 'CIRCULAR', 360)!.inicio).toBe(410);
    expect(escolherLacuna(lac, 95, 'CIRCULAR', 360)!.inicio).toBe(200); // volta ao início
    expect(escolherLacuna(lac, 200, 'FIRST', 0)).toBeNull();
  });

  it('lacunas adjacentes são unificadas', () => {
    expect(lacunasEntre([{ inicio: 150, tamanho: 50 }], 100, 500)).toEqual([{ inicio: 100, tamanho: 50 }, { inicio: 200, tamanho: 300 }]);
  });

  it('proteção com base e limite (exemplo do material: 123 + 500 = 623)', () => {
    expect(protecao(500, 200, 123).fisico).toBe(623);
    expect(protecao(500, 100, 123).ok).toBeFalse();
  });

  it('variáveis: detecta fragmentação externa e a compactação resolve', () => {
    const s = new SimuladorParticoesVariaveisService();
    [100, 50, 100, 50, 100].forEach(t => s.criar(t));
    s.encerrar('P2'); s.encerrar('P4');
    s.criar(80);
    expect(s.decisao()!.resultado).toBe('fragmentacao');
    expect(s.bloqueadosPorFragmentacao().length).toBe(1);
    s.compactar();
    expect(s.fila().length).toBe(0);
    expect(s.lacunas().length).toBe(1);
  });

  it('fixas: fragmentação interna é a sobra dentro da partição', () => {
    const s = new SimuladorParticoesFixasService();
    s.criar(35);                       // primeira que comporta: partição 1 (200)
    expect(s.fragInterna()).toBe(165);
    s.definirPolitica('BEST');
    s.criar(35);                       // menor que comporta: partição 3 (50)
    expect(s.fragInterna()).toBe(180);
    expect(s.criar(300)).toContain('maior que a maior partição');
  });

  it('fixas: fragmentação externa quando as partições livres somadas caberiam o processo', () => {
    const s = new SimuladorParticoesFixasService();
    s.criar(150);                      // partição 1
    s.criar(120);                      // não cabe em nenhuma livre (100, 50, 30 = 180 livres)
    expect(s.ultimo()!.motivo).toContain('FRAGMENTAÇÃO EXTERNA');
    expect(s.fila().length).toBe(1);
  });
});
