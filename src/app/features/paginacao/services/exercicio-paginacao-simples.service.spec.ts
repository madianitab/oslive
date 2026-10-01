import {
  ExercicioPaginacaoSimplesService,
  enderecoFisico,
  fragmentacaoInterna,
  normalizarBinario,
  paginasNecessarias,
} from './exercicio-paginacao-simples.service';

describe('ExercicioPaginacaoSimplesService', () => {
  let ex: ExercicioPaginacaoSimplesService;
  beforeEach(() => (ex = new ExercicioPaginacaoSimplesService()));

  it('cálculos básicos de paginação (página de 4 bytes)', () => {
    expect(paginasNecessarias(1)).toBe(1);
    expect(paginasNecessarias(8)).toBe(2);
    expect(paginasNecessarias(9)).toBe(3);
    expect(fragmentacaoInterna(9)).toBe(3);
    expect(fragmentacaoInterna(16)).toBe(0);
    expect(enderecoFisico(5, 2)).toBe('10110');
    expect(normalizarBinario('101|10')).toBe('10110');
  });

  it('gerar(): sempre 3 processos que cabem nos 8 quadros, sem quadro repetido', () => {
    for (let i = 0; i < 50; i++) {
      ex.gerar();
      const ps = ex.processos();
      expect(ps.length).toBe(3);
      const quadros = ps.flatMap(p => p.quadros);
      expect(quadros.length).toBeLessThanOrEqual(8);
      expect(new Set(quadros).size).toBe(quadros.length);
      ps.forEach(p => expect(p.quadros.length).toBe(paginasNecessarias(p.bytes)));
      expect(ps[0].quadros.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('tradução: respostas certas somam 100%', () => {
    ex.definirTipo('TRADUCAO');
    ex.gerar();
    ex.perguntas().forEach((q, i) => ex.responderTraducao(i, ex.gabaritoTraducao(q)));
    ex.corrigir();
    const r = ex.placar()!;
    expect(r.acertos).toBe(r.total);
  });

  it('memória física: só os bytes do processo-alvo são lacunas', () => {
    ex.definirTipo('MEMORIA_FISICA');
    ex.gerar();
    const alvo = ex.processos()[ex.alvoMemoria()];
    const lacunas = ex.memoria().filter(b => ex.ehLacuna(b));
    expect(lacunas.length).toBe(alvo.quadros.length * 4);
    lacunas.forEach(b => ex.responderMemoria(b, ex.respostaEsperadaMemoria(b)));
    ex.corrigir();
    const r = ex.placar()!;
    expect(r.acertos).toBe(r.total);
  });
});
