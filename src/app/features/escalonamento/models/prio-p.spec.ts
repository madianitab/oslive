import { PrioP } from 'src/app/features/escalonamento/models/prio-p';
import { Processo } from 'src/app/features/escalonamento/models/processo';

describe('PrioP (preemptivo)', () => {
  let prioP: PrioP;

  beforeEach(() => {
    prioP = new PrioP();
  });

  it('deve iniciar vazio', () => {
    expect(prioP.vazio()).toBeTrue();
  });

  it('escolherProcesso deve retornar o de menor numero de prioridade (maior urgencia)', () => {
    const p1 = new Processo('P1', 0, 3, 3, '#fff');
    const p2 = new Processo('P2', 0, 3, 1, '#fff');
    const p3 = new Processo('P3', 0, 3, 2, '#fff');
    prioP.addProcesso(p1);
    prioP.addProcesso(p2);
    prioP.addProcesso(p3);
    expect(prioP.escolherProcesso()).toBe(p2);
    expect(prioP.escolherProcesso()).toBe(p3);
    expect(prioP.escolherProcesso()).toBe(p1);
  });

  it('topo deve retornar o processo de maior urgencia sem remover', () => {
    const p1 = new Processo('P1', 0, 3, 5, '#fff');
    const p2 = new Processo('P2', 0, 3, 1, '#fff');
    prioP.addProcesso(p1);
    prioP.addProcesso(p2);
    expect(prioP.topo()).toBe(p2);
    expect(prioP.vazio()).toBeFalse();
  });

  it('topo em fila vazia deve retornar undefined', () => {
    expect(prioP.topo()).toBeUndefined();
  });

  it('novo processo de alta urgencia deve ficar no topo apos addProcesso', () => {
    const p1 = new Processo('P1', 0, 3, 5, '#fff');
    prioP.addProcesso(p1);
    const p2 = new Processo('P2', 1, 3, 1, '#fff');
    prioP.addProcesso(p2);
    expect(prioP.topo()).toBe(p2);
  });

  it('addTEspera deve incrementar tempoEspera de todos na fila', () => {
    const p1 = new Processo('P1', 0, 3, 2, '#fff');
    const p2 = new Processo('P2', 0, 3, 1, '#fff');
    prioP.addProcesso(p1);
    prioP.addProcesso(p2);
    prioP.addTEspera();
    expect(p1.tempoEspera).toBe(1);
    expect(p2.tempoEspera).toBe(1);
  });
});
