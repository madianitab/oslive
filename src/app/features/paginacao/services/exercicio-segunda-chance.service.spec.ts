import { ExercicioSegundaChanceService, MAX_SITUACOES } from './exercicio-segunda-chance.service';

describe('ExercicioSegundaChanceService', () => {
  let sc: ExercicioSegundaChanceService;
  beforeEach(() => sc = new ExercicioSegundaChanceService());

  it('começa sem exercício e cria a primeira situação', () => {
    expect(sc.gerado()).toBeFalse();
    sc.novoExercicio();
    expect(sc.numeroAtual()).toBe(1);
    expect(sc.atual()!.filaFalta.length).toBeGreaterThanOrEqual(6);
  });

  it('pede a vítima antes de corrigir', () => {
    sc.novoExercicio();
    expect(sc.corrigir()).toContain('vítima');
    expect(sc.respondida()).toBeFalse();
  });

  it('acerto conta ponto e a próxima situação continua da fila resultante', () => {
    sc.novoExercicio();
    const s = sc.atual()!;
    sc.escolherVitima(s.resultado.vitima.nome);
    expect(sc.corrigir()).toBeNull();
    expect(sc.placar().acertos).toBe(1);
    sc.proxima();
    expect(sc.numeroAtual()).toBe(2);
    expect(sc.atual()!.filaInicial).toEqual(s.resultado.filaFinal);
    expect(sc.respondida()).toBeFalse();
  });

  it('erro é registrado e "Ver resposta" conta como erro', () => {
    sc.novoExercicio();
    const errada = sc.atual()!.filaFalta.find(p => p.nome !== sc.atual()!.resultado.vitima.nome)!;
    sc.escolherVitima(errada.nome);
    sc.corrigir();
    sc.proxima();
    sc.verResposta();
    expect(sc.placar()).toEqual(jasmine.objectContaining({ acertos: 0, total: 2 }));
  });

  it('modo fila: só acerta tudo com a fila completa e correta', () => {
    sc.definirModo('FILA');
    sc.novoExercicio();
    const s = sc.atual()!;
    sc.escolherVitima(s.resultado.vitima.nome);
    s.resultado.filaFinal.forEach((p, i) => {
      sc.responderFila(i, 'pagina', p.nome);
      sc.responderFila(i, 'r', String(p.r));
    });
    expect(sc.corrigir()).toBeNull();
    expect(sc.placar()).toEqual(jasmine.objectContaining({ acertos: 2, total: 2 }));
  });

  it(`encerra ao chegar a ${MAX_SITUACOES} situações`, () => {
    sc.novoExercicio();
    for (let i = 0; i < MAX_SITUACOES; i++) {
      sc.verResposta();
      sc.proxima();
    }
    expect(sc.numeroAtual()).toBe(MAX_SITUACOES);
    expect(sc.encerrado()).toBeTrue();
    expect(sc.podeAvancar()).toBeFalse();
  });
});
