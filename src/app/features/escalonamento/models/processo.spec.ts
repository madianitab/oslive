import { Processo } from 'src/app/features/escalonamento/models/processo';

describe('Processo', () => {
  let p: Processo;

  beforeEach(() => {
    p = new Processo('P1', 0, 3, 2, '#fff');
  });

  it('deve criar processo com valores corretos', () => {
    expect(p.nome).toBe('P1');
    expect(p.chegada).toBe(0);
    expect(p.execucao).toBe(3);
    expect(p.prioridade).toBe(2);
    expect(p.tempoEspera).toBe(0);
    expect(p.tempoExecucao).toBe(0);
  });

  it('incrTEspera deve incrementar tempoEspera', () => {
    p.incrTEspera();
    p.incrTEspera();
    expect(p.tempoEspera).toBe(2);
  });

  it('incrTExecucao deve retornar false enquanto nao terminou', () => {
    expect(p.incrTExecucao()).toBeFalse();
    expect(p.incrTExecucao()).toBeFalse();
    expect(p.tempoExecucao).toBe(2);
  });

  it('incrTExecucao deve retornar true ao completar execucao', () => {
    p.incrTExecucao();
    p.incrTExecucao();
    expect(p.incrTExecucao()).toBeTrue();
    expect(p.tempoExecucao).toBe(3);
  });

  it('incrTExecucao deve retornar false se execucao for null', () => {
    const pNull = new Processo('P2', 0, null, null, '#fff');
    expect(pNull.incrTExecucao()).toBeFalse();
  });

  it('clone deve criar copia independente', () => {
    p.tempoEspera = 5;
    p.tempoExecucao = 2;
    const clone = p.clone();

    expect(clone.nome).toBe(p.nome);
    expect(clone.chegada).toBe(p.chegada);
    expect(clone.execucao).toBe(p.execucao);
    expect(clone.prioridade).toBe(p.prioridade);
    expect(clone.tempoEspera).toBe(5);
    expect(clone.tempoExecucao).toBe(2);

    clone.tempoEspera = 99;
    expect(p.tempoEspera).toBe(5);
  });
});
