import { CATALOGO, MAX_QUESTOES, assuntos, gerarProva, montarModelo, tiposMarcados, validarModelo } from './catalogo';
import { GRADE_ESCALONAMENTO } from './escalonamento';
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

  describe('montagem da prova (quantidade por assunto)', () => {
    const visiveis = CATALOGO.filter(t => !t.oculto);
    const assuntoDe = (id: string) => CATALOGO.find(t => t.id === id)!.assunto;

    it('nenhum tipo repetido e todo assunto pedido aparece, com a quantidade pedida', () => {
      for (let s = 0; s < 200; s++) {
        const rnd = criarAleatorio(`montar:${s}`);
        // marca tipos ao acaso e pede de 1 até todos os marcados de cada assunto
        const tipos = visiveis.filter(() => rnd() < 0.5).map(t => t.id);
        const quantidades: Record<string, number> = {};
        for (const a of new Set(tipos.map(assuntoDe))) {
          const max = tiposMarcados(a, tipos).length;
          quantidades[a] = 1 + Math.floor(rnd() * max);
        }
        const total = Object.values(quantidades).reduce((x, y) => x + y, 0);
        if (!total || total > MAX_QUESTOES) continue;

        const m = montarModelo({ tipos, quantidades }, rnd);
        const ids = m.map(i => i.tipo);
        expect(new Set(ids).size).withContext('tipo repetido').toBe(ids.length);
        expect(ids.every(id => tipos.includes(id))).withContext('tipo não marcado').toBeTrue();
        for (const [a, n] of Object.entries(quantidades)) {
          expect(ids.filter(id => assuntoDe(id) === a).length).withContext(a).toBe(n);
        }
      }
    });

    it('não aceita mais questões que tipos marcados no assunto, nem mais de 20 no total', () => {
      expect(() => montarModelo({ tipos: ['seg-traducao'], quantidades: { 'Segmentação': 2 } })).toThrow();
      expect(() => montarModelo({ tipos: [], quantidades: {} })).toThrow();
      const todos = visiveis.map(t => t.id);
      const quantidades = Object.fromEntries([...new Set(visiveis.map(t => t.assunto))]
        .map(a => [a, tiposMarcados(a, todos).length]));
      expect(() => montarModelo({ tipos: todos, quantidades })).toThrow();
    });

    it('escalonamento: o sorteio varia algoritmo e o que pedir', () => {
      const tipos = GRADE_ESCALONAMENTO.linhas.flatMap(l => GRADE_ESCALONAMENTO.colunas.map(c => GRADE_ESCALONAMENTO.tipo(l.id, c.id)));
      for (let s = 0; s < 30; s++) {
        const m = montarModelo({ tipos, quantidades: { Escalonamento: 4 } }, criarAleatorio(s));
        const algs = new Set(m.map(i => i.tipo.split('-')[1]));
        const formas = new Set(m.map(i => i.tipo.split('-')[2]));
        expect(algs.size).toBe(4);
        expect(formas.size).toBe(4);
      }
    });

    it('tipos antigos não aparecem na criação, mas provas salvas com eles continuam válidas', () => {
      expect(assuntos().flatMap(g => g.tipos).some(t => t.oculto)).toBeFalse();
      expect(validarModelo([{ tipo: 'esc-FIFO' }]).length).toBe(1);
      expect(() => validarModelo([{ tipo: 'nao-existe' }])).toThrow();
      expect(() => validarModelo([])).toThrow();
    });

    it('a mesma semente monta o mesmo modelo', () => {
      const pedido = { tipos: ['esc-RR-diag', 'esc-SJF-tab', 'var-BEST', 'var-lacunas'], quantidades: { Escalonamento: 1, 'Partições variáveis': 1 } };
      expect(montarModelo(pedido, criarAleatorio(7))).toEqual(montarModelo(pedido, criarAleatorio(7)));
    });
  });

  it('escalonamento: diagrama com um campo por instante ("-" = ociosa) e tabela com turnaround (tempo total)', () => {
    for (let s = 0; s < 15; s++) {
      const diag = CATALOGO.find(t => t.id === 'esc-RR-diagtab')!.gerar(criarAleatorio(`d:${s}`));
      const cpu = diag.publica.campos.filter(c => c.id.startsWith('cpu-'));
      expect(cpu.length).toBeGreaterThan(0);
      cpu.forEach(c => expect(diag.gabarito[c.id]).toMatch(/^[A-H-]$/));
      expect(diag.publica.respostas[diag.publica.respostas.length - 1].cabecalho).toContain('Turnaround (tempo total)');

      const pronto = CATALOGO.find(t => t.id === 'esc-SJF-tabdiag')!.gerar(criarAleatorio(`d:${s}`));
      expect(pronto.publica.campos.some(c => c.id.startsWith('cpu-'))).toBeFalse();
      expect(pronto.publica.dados.length).toBeGreaterThan(1);
    }
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
