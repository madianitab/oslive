import { SJF } from 'src/app/features/escalonamento/models/sjf';
import { Processo } from 'src/app/features/escalonamento/models/processo';

describe('SJF', () => {
  let sjf: SJF;

  beforeEach(() => {
    sjf = new SJF();
  });

  it('deve iniciar vazio', () => {
    expect(sjf.vazio()).toBeTrue();
  });

  it('escolherProcesso deve retornar o de menor burst time', () => {
    const p1 = new Processo('P1', 0, 5, null, '#fff');
    const p2 = new Processo('P2', 0, 2, null, '#fff');
    const p3 = new Processo('P3', 0, 8, null, '#fff');
    sjf.addProcesso(p1);
    sjf.addProcesso(p2);
    sjf.addProcesso(p3);
    expect(sjf.escolherProcesso()).toBe(p2);
    expect(sjf.escolherProcesso()).toBe(p1);
    expect(sjf.escolherProcesso()).toBe(p3);
  });

  it('escolherProcesso em fila vazia deve retornar undefined', () => {
    expect(sjf.escolherProcesso()).toBeUndefined();
  });

  it('addProcesso com burst null nao deve quebrar a ordenacao', () => {
    const p1 = new Processo('P1', 0, 3, null, '#fff');
    const p2 = new Processo('P2', 0, null, null, '#fff');
    sjf.addProcesso(p1);
    sjf.addProcesso(p2);
    expect(sjf.vazio()).toBeFalse();
  });

  it('addTEspera deve incrementar tempoEspera de todos na fila', () => {
    const p1 = new Processo('P1', 0, 5, null, '#fff');
    const p2 = new Processo('P2', 0, 2, null, '#fff');
    sjf.addProcesso(p1);
    sjf.addProcesso(p2);
    sjf.addTEspera();
    sjf.addTEspera();
    expect(p1.tempoEspera).toBe(2);
    expect(p2.tempoEspera).toBe(2);
  });
});
