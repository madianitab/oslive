import { CATALOGO, gerarProva, montarModelo, validarModelo } from './catalogo';
import { corrigirProva, corrigirQuestao, normalizar } from './corrigir';
import { criarAleatorio } from '../../../core/aleatorio';

describe('questões das avaliações', () => {
  for (const t of CATALOGO) {
    describe(t.id, () => {
      it('cada campo aparece numa tabela e tem gabarito; o gabarito dá 100%', () => {
        for (let s = 0; s < 15; s++) {
          const q = t.gerar(criarAleatorio(`${t.id}:${s}`));
          const ids = q.publica.campos.map(c => c.id);
          expect(new Set(ids).size).toBe(ids.length);
          const nasTabelas = q.publica.respostas.flatMap(tb => tb.linhas.flat())
            .filter((c): c is { campo: string } => typeof c !== 'string').map(c => c.campo);
          expect(nasTabelas.sort()).toEqual([...ids].sort());
          ids.forEach(id => expect(q.gabarito[id]).withContext(id).toBeDefined());

          // opção do gabarito precisa existir na lista
          q.publica.campos.filter(c => c.tipo === 'opcao').forEach(c =>
            expect(c.opcoes!.map(o => o.valor)).withContext(c.id).toContain(q.gabarito[c.id]));

          const r = corrigirQuestao(q, q.gabarito);
          expect(r.acertos).toBe(r.total);
          expect(r.total).toBeGreaterThan(0);
        }
      });

      it('respostas em branco dão 0 e a mesma semente gera a mesma questão', () => {
        const a = t.gerar(criarAleatorio('x'));
        const b = t.gerar(criarAleatorio('x'));
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
        expect(corrigirQuestao(a, {}).acertos).toBe(0);
      });

      it('a parte pública não contém o gabarito', () => {
        const q = t.gerar(criarAleatorio('y'));
        expect(JSON.stringify(q.publica)).not.toContain('gabarito');
      });
    });
  }

  it('normaliza números, binários e textos', () => {
    expect(normalizar('numero', '2,50')).toBe(normalizar('numero', '2.5'));
    expect(normalizar('binario', '101 | 10')).toBe('10110');
    expect(normalizar('texto', ' erro ')).toBe('ERRO');
    expect(normalizar('numero', '—')).toBe('-');
  });

  it('modelo distribui as questões entre os tipos escolhidos', () => {
    const m = montarModelo(['esc-RR', 'var-BEST', 'seg-traducao'], 7, criarAleatorio(1));
    expect(m.length).toBe(7);
    ['esc-RR', 'var-BEST', 'seg-traducao'].forEach(t =>
      expect(m.filter(i => i.tipo === t).length).toBeGreaterThanOrEqual(2));
    expect(() => validarModelo([{ tipo: 'nao-existe' }])).toThrow();
    expect(() => validarModelo([])).toThrow();
  });

  it('nota proporcional: valor dividido entre as questões, campos certos / total', () => {
    const modelo = [{ tipo: 'esc-FIFO' }, { tipo: 'var-lacunas' }, { tipo: 'pag-calculos' }];
    const prova = gerarProva(modelo, 'prova:aluno');
    const tudo = Object.fromEntries(prova.map((q, i) => [String(i), q.gabarito]));
    expect(corrigirProva(prova, tudo, 10).nota).toBe(10);
    // só a primeira questão certa
    expect(corrigirProva(prova, { 0: prova[0].gabarito }, 9).nota).toBe(3);
    // alunos diferentes, provas diferentes
    expect(JSON.stringify(gerarProva(modelo, 'prova:outro'))).not.toBe(JSON.stringify(prova));
  });

  it('tabela de segmentos: 4 processos na memória, 2 tabelas, base e limite em binário de 5 bits', () => {
    const t = CATALOGO.find(x => x.id === 'seg-tabela')!;
    for (let s = 0; s < 15; s++) {
      const q = t.gerar(criarAleatorio(`tab:${s}`));
      const mem = q.publica.dados[0].linhas.flat().join(' ');
      ['A:', 'B:', 'C:', 'D:'].forEach(n => expect(mem).withContext(n).toContain(n));
      expect(q.publica.respostas.length).toBe(2);
      expect(q.publica.campos.length).toBe(12);
      q.publica.campos.forEach(c => {
        expect(c.tipo).toBe('binario');
        expect(q.gabarito[c.id]).toMatch(/^[01]{5}$/);
      });
      expect(q.publica.apoio?.[0].linhas.length).toBe(8);
    }
  });
});
