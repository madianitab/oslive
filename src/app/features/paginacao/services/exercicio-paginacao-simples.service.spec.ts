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

  it('memória física: respostas certas (maiúsculas ou não) somam 100%', () => {
    ex.definirTipo('MEMORIA_FISICA');
    ex.gerar();
    const alvo = ex.processos()[ex.alvoMemoria()];
    const lacunas = ex.memoria().filter(b => ex.ehLacuna(b));
    expect(lacunas.length).toBe(alvo.quadros.length * 4);
    lacunas.forEach(b => ex.responderMemoria(b, ex.respostaEsperadaMemoria(b).toLowerCase()));
    ex.corrigir();
    const r = ex.placar()!;
    expect(r.acertos).toBe(r.total);
  });

  it('memória física: quadros de outros processos ficam ocupados e os demais editáveis', () => {
    ex.definirTipo('MEMORIA_FISICA');
    ex.gerar();
    const alvo = ex.processos()[ex.alvoMemoria()];
    const ocupadosOutros = ex.processos().filter(p => p !== alvo).reduce((t, p) => t + p.quadros.length * 4, 0);
    const editaveis = ex.memoria().filter(b => ex.ehEditavel(b)).length;
    expect(editaveis).toBe(32 - ocupadosOutros);
  });

  it('memória física: escrever em endereço que deveria ficar livre conta como erro', () => {
    ex.definirTipo('MEMORIA_FISICA');
    ex.gerar();
    const livre = ex.memoria().find(b => b.processo === null) ?? ex.memoria().find(b => !ex.ehLacuna(b))!;
    ex.responderMemoria(livre, 'A0');
    ex.corrigir();
    expect(ex.corretoMemoria(livre)).toBeFalse();
    const r = ex.placar()!;
    expect(r.total).toBe(ex.processos()[ex.alvoMemoria()].quadros.length * 4 + 1);
  });
});
