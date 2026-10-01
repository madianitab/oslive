import { Estado, gerarProcessos, simular } from './estados';

/** Transições permitidas pelo diagrama de estados do livro (Figura 4.2). */
const PERMITIDAS: Record<string, string> = {
  'null>CRIACAO': 'CRIACAO', 'CRIACAO>APTO': 'ADMISSAO', 'APTO>EXECUTANDO': 'SELECAO',
  'EXECUTANDO>APTO': 'PREEMPCAO', 'EXECUTANDO>BLOQUEADO': 'SOLICITA_ES', 'BLOQUEADO>APTO': 'ES_CONCLUIDA',
  'EXECUTANDO>DESTRUICAO': 'TERMINO', 'EXECUTANDO>EXECUTANDO': 'RETORNO_IMEDIATO', 'BLOQUEADO>DESTRUICAO': 'ENCERRAMENTO_BLOQUEADO',
};

describe('diagrama de estados do processo', () => {
  it('cenários aleatórios só usam transições do diagrama e todos os processos terminam', () => {
    for (let k = 0; k < 200; k++) {
      const q = 1 + (k % 3);
      const c = simular(gerarProcessos({ quantidade: 3 + (k % 3), quantum: q, especiais: k % 2 === 0 }), q);
      c.eventos.forEach(e => expect(PERMITIDAS[`${e.de}>${e.para}`]).toBe(e.transicao));
      c.processos.forEach(p => expect(c.fotos[c.fotos.length - 1].estados[p.nome]).toBe('DESTRUICAO'));
      // no máximo um processo executando em cada momento
      c.fotos.forEach(f => expect(Object.values(f.estados).filter((s: Estado | null) => s === 'EXECUTANDO').length).toBeLessThanOrEqual(1));
    }
  });

  it('sem situações especiais, todo processo faz o ciclo criação → CPU → CPU → E/S → CPU → fim', () => {
    for (let k = 0; k < 100; k++) {
      const q = 1 + (k % 3);
      const c = simular(gerarProcessos({ quantidade: 3 + (k % 3), quantum: q, especiais: false }), q);
      c.processos.forEach(p => {
        expect(p.passos.map(x => x.tipo)).toEqual(['CPU', 'ES', 'CPU']);
        expect(p.passos[0].duracao).toBeGreaterThan(q);           // precisa de 2 usos da CPU
        expect(p.passos[0].duracao).toBeLessThanOrEqual(2 * q);
        const seq = c.eventos.filter(e => e.processo === p.nome && e.de !== e.para).map(e => e.para);
        // fim do ciclo: E/S, volta para apto, executa e termina
        expect(seq.slice(-4)).toEqual(['BLOQUEADO', 'APTO', 'EXECUTANDO', 'DESTRUICAO']);
      });
    }
  });

  it('o processo criado passa por Admissão antes de ser selecionado', () => {
    const c = simular(gerarProcessos({ quantidade: 3, quantum: 2, especiais: false }), 2);
    c.processos.forEach(p => {
      const seq = c.eventos.filter(e => e.processo === p.nome).map(e => e.transicao);
      expect(seq.slice(0, 3)).toEqual(['CRIACAO', 'ADMISSAO', 'SELECAO']);
    });
  });
});
