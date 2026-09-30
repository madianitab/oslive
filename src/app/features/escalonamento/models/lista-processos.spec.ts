import { ListaProcessos } from 'src/app/features/escalonamento/models/lista-processos';
import { Processo } from 'src/app/features/escalonamento/models/processo';

describe('ListaProcessos', () => {
  it('deve ordenar processos por chegada no construtor', () => {
    const p1 = new Processo('P1', 3, 2, null, '#fff');
    const p2 = new Processo('P2', 0, 2, null, '#fff');
    const p3 = new Processo('P3', 1, 2, null, '#fff');
    const lista = new ListaProcessos([p1, p2, p3]);
    const chegados = lista.processosPorTempo(10);
    expect(chegados[0]).toBe(p2);
    expect(chegados[1]).toBe(p3);
    expect(chegados[2]).toBe(p1);
  });

  it('vazio deve retornar true quando nao ha processos', () => {
    const lista = new ListaProcessos([]);
    expect(lista.vazio()).toBeTrue();
  });

  it('processosPorTempo deve retornar apenas processos que chegaram ate o tempo', () => {
    const p1 = new Processo('P1', 0, 2, null, '#fff');
    const p2 = new Processo('P2', 2, 2, null, '#fff');
    const p3 = new Processo('P3', 5, 2, null, '#fff');
    const lista = new ListaProcessos([p1, p2, p3]);
    const chegados = lista.processosPorTempo(2);
    expect(chegados.length).toBe(2);
    expect(chegados).toContain(p1);
    expect(chegados).toContain(p2);
  });

  it('processosPorTempo deve remover processos retornados da lista interna', () => {
    const p1 = new Processo('P1', 0, 2, null, '#fff');
    const p2 = new Processo('P2', 5, 2, null, '#fff');
    const lista = new ListaProcessos([p1, p2]);
    lista.processosPorTempo(0);
    expect(lista.vazio()).toBeFalse();
    lista.processosPorTempo(5);
    expect(lista.vazio()).toBeTrue();
  });

  it('tabelaResultado deve calcular espera, execucao e turnaround corretamente', () => {
    const p1 = new Processo('P1', 0, 3, null, '#fff');
    p1.tempoEspera = 2;

    const p2 = new Processo('P2', 0, 4, null, '#fff');
    p2.tempoEspera = 1;

    const lista = new ListaProcessos([]);
    lista.addFinalizado(p1);
    lista.addFinalizado(p2);

    const resultado = lista.tabelaResultado();

    expect(resultado[0]).toEqual({ nome: 'P1', espera: 2, execucao: 3, turn: 5 });
    expect(resultado[1]).toEqual({ nome: 'P2', espera: 1, execucao: 4, turn: 5 });

    const media = resultado[2];
    expect(media.nome).toBe('Média');
    expect(media.espera).toBe(1.5);
    expect(media.execucao).toBe(3.5);
    expect(media.turn).toBe(5);
  });

  it('tabelaResultado deve aceitar lista externa de processos', () => {
    const p1 = new Processo('P1', 0, 2, null, '#fff');
    p1.tempoEspera = 0;
    const lista = new ListaProcessos([]);
    const resultado = lista.tabelaResultado([p1]);
    expect(resultado[0]).toEqual({ nome: 'P1', espera: 0, execucao: 2, turn: 2 });
  });

  it('addFinalizado deve ignorar null', () => {
    const lista = new ListaProcessos([]);
    lista.addFinalizado(null);
    const resultado = lista.tabelaResultado();
    expect(resultado.length).toBe(1);
    expect(resultado[0].nome).toBe('Média');
  });
});
