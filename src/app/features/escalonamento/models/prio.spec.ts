import { Prio } from 'src/app/features/escalonamento/models/prio';
import { Processo } from 'src/app/features/escalonamento/models/processo';

describe('Prio (nao-preemptivo)', () => {
  let prio: Prio;

  beforeEach(() => {
    prio = new Prio();
  });

  it('deve iniciar vazio', () => {
    expect(prio.vazio()).toBeTrue();
  });

  it('escolherProcesso deve retornar o de maior prioridade', () => {
    const p1 = new Processo('P1', 0, 3, 1, '#fff');
    const p2 = new Processo('P2', 0, 3, 5, '#fff');
    const p3 = new Processo('P3', 0, 3, 3, '#fff');
    prio.addProcesso(p1);
    prio.addProcesso(p2);
    prio.addProcesso(p3);
    expect(prio.escolherProcesso()).toBe(p2); // maior prioridade (5)
    expect(prio.escolherProcesso()).toBe(p3); // segunda maior (3)
    expect(prio.escolherProcesso()).toBe(p1); // menor (1)
  });

  it('escolherProcesso em fila vazia deve retornar undefined', () => {
    expect(prio.escolherProcesso()).toBeUndefined();
  });

  it('dois processos com mesma prioridade devem ser retornados sem erro', () => {
    const p1 = new Processo('P1', 0, 3, 2, '#fff');
    const p2 = new Processo('P2', 0, 3, 2, '#fff');
    prio.addProcesso(p1);
    prio.addProcesso(p2);
    const primeiro = prio.escolherProcesso();
    expect(primeiro).toBeDefined();
  });

  it('addTEspera deve incrementar tempoEspera de todos na fila', () => {
    const p1 = new Processo('P1', 0, 3, 1, '#fff');
    const p2 = new Processo('P2', 0, 3, 5, '#fff');
    prio.addProcesso(p1);
    prio.addProcesso(p2);
    prio.addTEspera();
    prio.addTEspera();
    expect(p1.tempoEspera).toBe(2);
    expect(p2.tempoEspera).toBe(2);
  });
});
