import { FIFO } from 'src/app/features/escalonamento/models/fifo';
import { Processo } from 'src/app/features/escalonamento/models/processo';

describe('FIFO (Escalonamento)', () => {
  let fifo: FIFO;

  beforeEach(() => {
    fifo = new FIFO();
  });

  it('deve iniciar vazio', () => {
    expect(fifo.vazio()).toBeTrue();
  });

  it('addProcesso deve inserir e vazio deve retornar false', () => {
    fifo.addProcesso(new Processo('P1', 0, 3, null, '#fff'));
    expect(fifo.vazio()).toBeFalse();
  });

  it('addProcesso com undefined nao deve inserir', () => {
    fifo.addProcesso(undefined);
    expect(fifo.vazio()).toBeTrue();
  });

  it('escolherProcesso deve respeitar ordem de chegada (FIFO)', () => {
    const p1 = new Processo('P1', 0, 3, null, '#fff');
    const p2 = new Processo('P2', 1, 2, null, '#fff');
    const p3 = new Processo('P3', 2, 1, null, '#fff');
    fifo.addProcesso(p1);
    fifo.addProcesso(p2);
    fifo.addProcesso(p3);
    expect(fifo.escolherProcesso()).toBe(p1);
    expect(fifo.escolherProcesso()).toBe(p2);
    expect(fifo.escolherProcesso()).toBe(p3);
  });

  it('escolherProcesso em fila vazia deve retornar undefined', () => {
    expect(fifo.escolherProcesso()).toBeUndefined();
  });

  it('addTEspera deve incrementar tempoEspera de todos na fila', () => {
    const p1 = new Processo('P1', 0, 3, null, '#fff');
    const p2 = new Processo('P2', 1, 2, null, '#fff');
    fifo.addProcesso(p1);
    fifo.addProcesso(p2);
    fifo.addTEspera(3);
    expect(p1.tempoEspera).toBe(3);
    expect(p2.tempoEspera).toBe(3);
  });

  it('addTEspera nao deve afetar processo ja removido da fila', () => {
    const p1 = new Processo('P1', 0, 3, null, '#fff');
    const p2 = new Processo('P2', 1, 2, null, '#fff');
    fifo.addProcesso(p1);
    fifo.addProcesso(p2);
    fifo.escolherProcesso();
    fifo.addTEspera(2);
    expect(p1.tempoEspera).toBe(0);
    expect(p2.tempoEspera).toBe(2);
  });
});
