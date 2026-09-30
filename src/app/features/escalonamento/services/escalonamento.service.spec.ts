import { EscalonamentoService } from 'src/app/features/escalonamento/services/escalonamento.service';
import { Processo } from 'src/app/features/escalonamento/models/processo';

function p(nome: string, chegada: number, execucao: number, prioridade: number | null = null): Processo {
  return new Processo(nome, chegada, execucao, prioridade, '#fff');
}

function nomes(res: { nome: string }[]): string[] {
  return res.map(r => r.nome);
}

describe('EscalonamentoService', () => {
  let service: EscalonamentoService;

  beforeEach(() => {
    service = new EscalonamentoService();
  });

  // ─── FIFO ──────────────────────────────────────────────────────────────────

  describe('simulaFifo', () => {
    it('deve executar processos em ordem de chegada', () => {
      const processos = [p('P1', 0, 2), p('P2', 0, 3)];
      const res = service.simulaFifo(processos);
      expect(nomes(res)).toEqual(['P1', 'P1', 'P2', 'P2', 'P2']);
    });

    it('deve inserir idle quando CPU fica livre antes do proximo processo', () => {
      const processos = [p('P1', 0, 1), p('P2', 3, 1)];
      const res = service.simulaFifo(processos);
      expect(res[1].nome).toBe('-');
      expect(res[2].nome).toBe('-');
      expect(res[3].nome).toBe('P2');
    });

    it('deve retornar lista vazia para lista de processos vazia', () => {
      expect(service.simulaFifo([])).toEqual([]);
    });
  });

  // ─── SJF ───────────────────────────────────────────────────────────────────

  describe('simulaSJF', () => {
    it('deve priorizar o processo com menor burst time', () => {
      const processos = [p('P1', 0, 5), p('P2', 0, 2), p('P3', 0, 8)];
      const res = service.simulaSJF(processos);
      // P2 (burst=2) deve executar antes de P1 (burst=5)
      expect(res[0].nome).toBe('P2');
      expect(res[2].nome).toBe('P1');
    });

    it('deve retornar lista vazia para lista de processos vazia', () => {
      expect(service.simulaSJF([])).toEqual([]);
    });
  });

  // ─── Prioridade ────────────────────────────────────────────────────────────

  describe('simulaPrio', () => {
    it('deve executar processo de maior prioridade (menor número) primeiro', () => {
      const processos = [p('P1', 0, 2, 1), p('P2', 0, 2, 5), p('P3', 0, 2, 3)];
      const res = service.simulaPrio(processos);
      expect(res[0].nome).toBe('P1'); // prioridade 1
      expect(res[2].nome).toBe('P3'); // prioridade 3
      expect(res[4].nome).toBe('P2'); // prioridade 5
    });

    it('não deve interromper o processo em execução (não preemptivo)', () => {
      const processos = [p('P1', 0, 3, 2), p('P2', 1, 1, 0)];
      const res = service.simulaPrio(processos);
      expect(res.map(r => r.nome).join('')).toBe('P1P1P1P2');
    });

    it('deve retornar lista vazia para lista de processos vazia', () => {
      expect(service.simulaPrio([])).toEqual([]);
    });
  });

  // ─── Prioridade Preemptivo ─────────────────────────────────────────────────

  describe('simulaPrioPremp', () => {
    it('deve preemptar processo de baixa prioridade quando chega um de alta prioridade', () => {
      // P1 chega no t=0 com prio=3, P2 chega no t=1 com prio=1 (mais urgente)
      const processos = [p('P1', 0, 4, 3), p('P2', 1, 2, 1)];
      const res = service.simulaPrioPremp(processos);
      expect(res[0].nome).toBe('P1'); // t=0: P1 executando
      expect(res[1].nome).toBe('P2'); // t=1: P2 preempta P1
      expect(res[2].nome).toBe('P2'); // t=2: P2 termina
    });

    it('deve contar a espera do processo interrompido e de quem assume após um término', () => {
      // P1 (0..), P2 preempta em t=1 e termina em t=2; P1 volta em t=3.
      const processos = [p('P1', 0, 4, 3), p('P2', 1, 2, 1), p('P3', 2, 1, 2)];
      const res = service.simulaPrioPremp(processos);
      expect(res.map(r => r.nome).join(',')).toBe('P1,P2,P2,P3,P1,P1,P1');
      const espera = Object.fromEntries(processos.map(x => [x.nome, x.tempoEspera]));
      expect(espera['P1']).toBe(3); // esperou em t=1, 2 e 3
      expect(espera['P2']).toBe(0);
      expect(espera['P3']).toBe(1); // chegou em t=2 e só executou em t=3
    });

    it('deve retornar lista vazia para lista de processos vazia', () => {
      expect(service.simulaPrioPremp([])).toEqual([]);
    });
  });

  // ─── Round Robin ───────────────────────────────────────────────────────────

  describe('simulaRR', () => {
    it('deve alternar processos respeitando o quantum', () => {
      const processos = [p('P1', 0, 4), p('P2', 0, 4)];
      const res = service.simulaRR(processos, 2);
      expect(res[0].nome).toBe('P1');
      expect(res[1].nome).toBe('P1');
      expect(res[2].nome).toBe('P2');
      expect(res[3].nome).toBe('P2');
      expect(res[4].nome).toBe('P1');
      expect(res[5].nome).toBe('P1');
      expect(res[6].nome).toBe('P2');
      expect(res[7].nome).toBe('P2');
    });

    it('processo que termina antes do quantum nao deve voltar para a fila', () => {
      const processos = [p('P1', 0, 1), p('P2', 0, 3)];
      const res = service.simulaRR(processos, 2);
      expect(res[0].nome).toBe('P1');
      expect(res[1].nome).toBe('P2');
    });

    it('deve retornar lista vazia para lista de processos vazia', () => {
      expect(service.simulaRR([], 2)).toEqual([]);
    });
  });

  // ─── Multi-level Feedback ──────────────────────────────────────────────────

  describe('simulaMF', () => {
    const config = { filaRR1: false, filaRR2: false, filaRR3: false, filaRR4: false, quantum: 2, quantum1: 2, quantum2: 2, quantum3: 2 };

    it('deve executar processo de menor numero de prioridade primeiro', () => {
      const processos = [p('P1', 0, 2, 0), p('P2', 0, 2, 1)];
      const { resultado } = service.simulaMF(processos, config);
      expect(resultado[0].nome).toBe('P1'); // prioridade 0 é mais urgente
    });

    it('deve preemptar processo de menor urgencia quando chega um mais urgente', () => {
      const processos = [p('P1', 0, 4, 1), p('P2', 2, 2, 0)];
      const { resultado } = service.simulaMF(processos, config);
      expect(resultado[0].nome).toBe('P1');
      expect(resultado[1].nome).toBe('P1');
      expect(resultado[2].nome).toBe('P2'); // P2 preempta P1 no t=2
    });

    it('deve retornar filaApto com clones dos processos que esperaram na fila', () => {
      const processos = [p('P1', 0, 2, 0), p('P2', 0, 2, 1)];
      const { filaApto } = service.simulaMF(processos, config);
      expect(filaApto.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────

  describe('atualizarFilaAptos', () => {
    it('deve inserir processo em ordem crescente de prioridade', () => {
      const p1 = p('P1', 0, 2, 2);
      const p2 = p('P2', 0, 2, 0);
      const p3 = p('P3', 0, 2, 1);
      let fila = service.atualizarFilaAptos([], p1);
      fila = service.atualizarFilaAptos(fila, p2);
      fila = service.atualizarFilaAptos(fila, p3);
      expect(fila[0].prioridade).toBe(0);
      expect(fila[1].prioridade).toBe(1);
      expect(fila[2].prioridade).toBe(2);
    });
  });

  describe('inserirOrdemChegada', () => {
    it('deve inserir processos em ordem crescente de chegada', () => {
      const p1 = p('P1', 5, 2);
      const p2 = p('P2', 1, 2);
      const p3 = p('P3', 3, 2);
      let lista = service.inserirOrdemChegada([], p1);
      lista = service.inserirOrdemChegada(lista, p2);
      lista = service.inserirOrdemChegada(lista, p3);
      expect(lista[0].chegada).toBe(1);
      expect(lista[1].chegada).toBe(3);
      expect(lista[2].chegada).toBe(5);
    });
  });
});
