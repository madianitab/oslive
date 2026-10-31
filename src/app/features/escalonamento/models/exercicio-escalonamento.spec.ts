import { criarAleatorio } from '../../../core/aleatorio';
import { Processo } from './processo';
import { gerarGabaritoEscalonamento, gerarProcessosEscalonamento } from './exercicio-escalonamento';

describe('exercicio-escalonamento (modelo)', () => {
  it('a mesma semente gera os mesmos processos e quantum', () => {
    const a = gerarProcessosEscalonamento(criarAleatorio('s1'));
    const b = gerarProcessosEscalonamento(criarAleatorio('s1'));
    expect(a.quantum).toBe(b.quantum);
    expect(a.processos.map(p => [p.nome, p.chegada, p.execucao, p.prioridade]))
      .toEqual(b.processos.map(p => [p.nome, p.chegada, p.execucao, p.prioridade]));
  });

  it('respeita os intervalos e ordena por chegada', () => {
    for (let s = 0; s < 200; s++) {
      const { processos, quantum } = gerarProcessosEscalonamento(criarAleatorio(s));
      expect(processos.length).toBe(4);
      expect(quantum >= 1 && quantum <= 3).toBeTrue();
      processos.forEach((p, i) => {
        expect(p.chegada >= 0 && p.chegada <= 8).toBeTrue();
        expect(p.execucao! >= 1 && p.execucao! <= 7).toBeTrue();
        expect(p.prioridade! >= 0 && p.prioridade! <= 3).toBeTrue();
        if (i) expect(p.chegada >= processos[i - 1].chegada).toBeTrue();
      });
    }
  });

  it('gabarito FIFO de exemplo', () => {
    const ps = [new Processo('A', 0, 3, 0, ''), new Processo('B', 1, 2, 0, '')];
    const g = gerarGabaritoEscalonamento(ps, 'FIFO', 2);
    expect(g.diagrama.map(c => c.nome).join('')).toBe('AAABB');
    expect(g.tabela).toEqual([
      { nome: 'A', cor: '', espera: 0, turnaround: 3 },
      { nome: 'B', cor: '', espera: 2, turnaround: 4 },
    ]);
    expect(g.mediaEspera).toBe(1);
  });
});
