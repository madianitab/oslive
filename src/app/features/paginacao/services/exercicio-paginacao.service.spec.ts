import { ExercicioPaginacaoService, PaginaExercicio } from './exercicio-paginacao.service';

function pag(processo: string, indice: number, quadro: number, timestamp: number, bitRef: 0 | 1 = 0, historico: number[] = [0, 0, 0, 0]): PaginaExercicio {
  return { processo, indice, cor: '#000', quadro, timestamp, bitRef, historico };
}

describe('ExercicioPaginacaoService', () => {
  let ex: ExercicioPaginacaoService;
  beforeEach(() => (ex = new ExercicioPaginacaoService()));

  function carregar(paginas: PaginaExercicio[]) {
    const quadros: (PaginaExercicio | null)[] = Array(8).fill(null);
    paginas.forEach(p => quadros[p.quadro!] = p);
    ex.processos.set([{ nome: 'A', cor: '#000', paginas }]);
    ex.quadros.set(quadros);
  }

  it('FIFO: vítima é a de menor timestamp', () => {
    carregar([pag('A', 0, 3, 102), pag('A', 1, 5, 100), pag('A', 2, 1, 101)]);
    ex.definirAlgoritmo('FIFO');
    expect(ex.vitima()?.indice).toBe(1);
  });

  it('Histórico: vítima é a de menor valor; empate vai para a mais antiga', () => {
    carregar([pag('A', 0, 0, 100, 0, [1, 0, 0, 0]), pag('A', 1, 1, 101, 0, [0, 1, 1, 1]), pag('A', 2, 2, 102, 0, [0, 1, 1, 1])]);
    ex.definirAlgoritmo('HISTORICO');
    expect(ex.vitima()?.indice).toBe(1);
  });

  it('Segunda Chance: pula quem tem bit 1 e escolhe a primeira com bit 0', () => {
    carregar([pag('A', 0, 0, 100, 1), pag('A', 1, 1, 101, 1), pag('A', 2, 2, 102, 0), pag('A', 3, 3, 103, 0)]);
    ex.definirAlgoritmo('SEGUNDA_CHANCE');
    expect(ex.vitima()?.indice).toBe(2);
  });

  it('Segunda Chance: com todos os bits 1, sai a mais antiga', () => {
    carregar([pag('A', 0, 4, 101, 1), pag('A', 1, 6, 100, 1)]);
    ex.definirAlgoritmo('SEGUNDA_CHANCE');
    expect(ex.vitima()?.indice).toBe(1);
  });

  it('gerar(): exercício de página vítima deixa a memória cheia e uma página no disco para entrar', () => {
    ex.definirTipo('VITIMA');
    ex.gerar();
    expect(ex.quadros().every(q => q !== null)).toBeTrue();
    expect(ex.paginaSolicitada()?.quadro).toBeNull();
  });

  it('corrigir(): respostas certas na memória lógica somam 100%', () => {
    ex.definirTipo('LOGICA');
    ex.gerar();
    ex.todasPaginas().forEach(p => {
      ex.responderLogica(p, 'quadro', p.quadro === null ? '-' : String(p.quadro));
      ex.responderLogica(p, 'bit', p.quadro === null ? 'I' : 'V');
    });
    ex.corrigir();
    const placar = ex.placar()!;
    expect(placar.acertos).toBe(placar.total);
  });
});
