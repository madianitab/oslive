import { ExercicioParticoesFixasService } from './exercicio-particoes-fixas.service';
import { ExercicioParticoesVariaveisService } from './exercicio-particoes-variaveis.service';

describe('Serviços dos exercícios de partições', () => {
  it('fixas: responder o gabarito dá 100% e uma resposta errada é marcada', () => {
    const s = new ExercicioParticoesFixasService();
    s.gerar();
    s.ex()!.eventos.forEach((e, i) => {
      if (e.tipo === 'chegada') {
        s.responder(i, 'particao', s.esperado(i, 'particao'));
        if (e.particao !== null) s.responder(i, 'frag', s.esperado(i, 'frag'));
      } else {
        s.responder(i, 'entra', s.esperado(i, 'entra'));
      }
    });
    s.responderFragFinal(String(s.ex()!.fragFinal));
    s.corrigir();
    expect(s.placar()!.percentual).toBe(100);
    s.responderFragFinal('9999');
    s.corrigir();
    expect(s.corretoFragFinal()).toBeFalse();
  });

  it('variáveis: alocação, lacunas e compactação dão 100% com o gabarito', () => {
    const s = new ExercicioParticoesVariaveisService();
    for (const alg of ['FIRST', 'BEST', 'WORST', 'CIRCULAR'] as const) {
      s.definirTipo('ALOCACAO');
      s.definirAlgoritmo(alg);
      s.gerar();
      s.alocacao()!.eventos.forEach((_, i) => {
        (['resultado', 'base', 'entra', 'baseEntra'] as const).forEach(c => {
          const v = s.esperadoAloc(i, c);
          if (v && v !== '—') s.responderAloc(i, c, v);
        });
      });
      s.corrigir();
      expect(s.placar()!.percentual).withContext(alg).toBe(100);
    }

    s.definirTipo('LACUNAS');
    s.gerar();
    const lac = s.lacunas()!.lacunas;
    lac.forEach((l, i) => {
      if (i > 0) s.adicionarLacuna();
      s.responderLacuna(i, 'inicio', String(l.inicio));
      s.responderLacuna(i, 'tamanho', String(l.tamanho));
    });
    s.corrigir();
    expect(s.placar()!.percentual).toBe(100);

    s.definirTipo('COMPACTACAO');
    s.gerar();
    const c = s.compactacao()!;
    c.alocados.forEach(a => s.responderBase(a.nome, String(c.novasBases[a.nome])));
    s.responderLacunaFinal('inicio', String(c.lacunaFinal.inicio));
    s.responderLacunaFinal('tamanho', String(c.lacunaFinal.tamanho));
    s.corrigir();
    expect(s.placar()!.percentual).toBe(100);
  });
});
