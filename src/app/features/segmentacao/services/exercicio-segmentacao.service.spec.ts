import { ExercicioSegmentacaoService } from './exercicio-segmentacao.service';
import { binario } from '../models/segmentacao';

describe('ExercicioSegmentacaoService', () => {
  let ex: ExercicioSegmentacaoService;
  beforeEach(() => (ex = new ExercicioSegmentacaoService()));

  it('gerar(): sempre 3 processos (A, B, C) sem sobreposição', () => {
    for (let i = 0; i < 30; i++) {
      ex.gerar();
      expect(ex.processos().map(p => p.nome)).toEqual(['A', 'B', 'C']);
      const usados = ex.memoria().filter(b => b.processo).length;
      const soma = ex.processos().reduce((t, p) => t + p.segmentos.reduce((s, x) => s + x.tamanho, 0), 0);
      expect(usados).toBe(soma);
    }
  });

  it('tradução: inclui uma pergunta com interrupção e aceita "erro"', () => {
    ex.definirTipo('TRADUCAO');
    ex.gerar();
    expect(ex.perguntas().some(q => ex.gabaritoTraducao(q) === 'erro')).toBeTrue();
    ex.perguntas().forEach((q, i) => ex.responderTraducao(i, ex.gabaritoTraducao(q) === 'erro' ? 'Interrupção' : ex.gabaritoTraducao(q)));
    ex.corrigir();
    const r = ex.placar()!;
    expect(r.acertos).toBe(r.total);
  });

  it('tabela de segmentos: respostas certas somam 100%', () => {
    ex.definirTipo('TABELA');
    ex.gerar();
    ex.processos()[0].segmentos.forEach(s => {
      ex.responderTabela(`${s.tipo}-base`, binario(s.base, 5));
      ex.responderTabela(`${s.tipo}-limite`, String(s.tamanho));
    });
    ex.corrigir();
    expect(ex.placar()).toEqual({ acertos: 6, total: 6 });
  });

  it('alocação: gera casos que cabem e casos de fragmentação externa', () => {
    ex.definirTipo('ALOCACAO');
    const motivos = new Set<string>();
    for (let i = 0; i < 40; i++) {
      ex.gerar();
      const g = ex.gabaritoAlocacao()!;
      motivos.add(g.ok ? 'ok' : g.motivo!);
      if (!g.ok) expect(g.livreTotal).toBeGreaterThanOrEqual(g.necessario);
    }
    expect(motivos.has('ok')).toBeTrue();
    expect(motivos.has('fragmentacao')).toBeTrue();
  });
});
