import { TrilhaPaginacaoService } from './trilha-paginacao.service';
import { Pagina } from '../models/pagina';

/** helper: cria N páginas distintas do processo 'A' (A0, A1, ...) */
function paginasA(n: number): Pagina[] {
  return Array.from({ length: n }, (_, i) => new Pagina('A', '#111', i));
}

describe('TrilhaPaginacaoService', () => {
  let svc: TrilhaPaginacaoService;
  beforeEach(() => (svc = new TrilhaPaginacaoService()));

  it('gera um passo por referência', () => {
    const fila = paginasA(3);
    const trilha = svc.construir(fila);
    expect(trilha.length).toBe(3);
    expect(trilha.map(p => p.indice)).toEqual([0, 1, 2]);
  });

  it('primeiras 8 referências únicas são faults sem vítima (RAM 8 quadros)', () => {
    const fila = paginasA(8);
    const trilha = svc.construir(fila);
    expect(trilha.every(p => p.tipo === 'fault')).toBeTrue();
    expect(trilha.every(p => p.vitima === undefined)).toBeTrue();
  });

  it('a 9ª referência única causa substituição (FIFO remove a 1ª)', () => {
    const fila = paginasA(9);
    const trilha = svc.construir(fila);
    const p9 = trilha[8];
    expect(p9.tipo).toBe('fault');
    expect(p9.vitima).toBeDefined();
    expect(p9.vitima!.toString()).toBe('A0'); // primeira a entrar
  });

  it('reacessar página presente é hit', () => {
    const a0 = new Pagina('A', '#111', 0);
    const fila = [a0, a0]; // acessa A0 duas vezes
    const trilha = svc.construir(fila);
    expect(trilha[0].tipo).toBe('fault');
    expect(trilha[1].tipo).toBe('hit');
  });

  it('cada passo carrega snapshot imutável da memória física', () => {
    const fila = paginasA(2);
    const trilha = svc.construir(fila);
    // mutar o snapshot do passo 0 não afeta o passo 1
    trilha[0].memoriaFisica[0].nome = 'XX';
    expect(trilha[1].memoriaFisica[0].nome).not.toBe('XX');
  });

  it('preenche narrativa em todo passo', () => {
    const trilha = svc.construir(paginasA(9));
    expect(trilha.every(p => p.narrativa.length > 0)).toBeTrue();
  });
});
