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

  it('escolherProcesso deve retornar o de maior prioridade (menor número)', () => {
    const p1 = new Processo('P1', 0, 3, 1, '#fff');
    const p2 = new Processo('P2', 0, 3, 5, '#fff');
    const p3 = new Processo('P3', 0, 3, 3, '#fff');
    prio.addProcesso(p1);
    prio.addProcesso(p2);
    prio.addProcesso(p3);
    expect(prio.escolherProcesso()).toBe(p1); // prioridade 1 (maior)
    expect(prio.escolherProcesso()).toBe(p3); // prioridade 3
    expect(prio.escolherProcesso()).toBe(p2); // prioridade 5 (menor)
  });

  it('prioridade 0 deve vir antes da prioridade 1', () => {
    const p1 = new Processo('P1', 0, 3, 1, '#fff');
    const p0 = new Processo('P0', 0, 3, 0, '#fff');
    prio.addProcesso(p1);
    prio.addProcesso(p0);
    expect(prio.escolherProcesso()).toBe(p0);
  });

  it('empate de prioridade deve respeitar a ordem de chegada', () => {
    const p1 = new Processo('P1', 0, 3, 2, '#fff');
    const p2 = new Processo('P2', 0, 3, 2, '#fff');
    prio.addProcesso(p1);
    prio.addProcesso(p2);
    expect(prio.escolherProcesso()).toBe(p1);
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
