import { ALGORITMOS_FIT, AlgoritmoFit } from '../../particoes/models/particoes';
import {
  AREA_FIXAS,
  AlocadoEx,
  PoliticaFixa,
  SO_FIXAS,
  SO_VAR,
  TOTAL_VAR,
  gerarAlocacao,
  gerarCompactacao,
  gerarFixas,
  gerarLacunas,
  iniciosParticoes,
} from '../../particoes/models/exercicios-particoes';
import { Montador } from './montador';
import { Campo, Celula, QuestaoGerada, Tabela, TipoQuestao } from './tipos';

function tabelaProcessos(alocados: AlocadoEx[]): Tabela {
  return {
    titulo: 'Processos na memória',
    cabecalho: ['Processo', 'Base (KB)', 'Tamanho (KB)'],
    linhas: [...alocados].sort((a, b) => a.base - b.base).map(a => [a.nome, String(a.base), String(a.tamanho)]),
  };
}

const AVISO_VAR = `Memória de ${TOTAL_VAR} KB. O SO ocupa de 0 a ${SO_VAR - 1} KB; a área dos processos começa em ${SO_VAR} KB.`;

// ───────────────────────── fixas ─────────────────────────

const NOME_POLITICA: Record<PoliticaFixa, string> = {
  FIRST: 'primeira partição livre que comporta',
  BEST: 'menor partição livre que comporta',
};

function fixas(politica: PoliticaFixa, rnd: () => number): QuestaoGerada {
  const ex = gerarFixas(politica, rnd);
  const m = new Montador();
  const inicios = iniciosParticoes(ex.particoes);
  const opcoesParticao = [
    ...ex.particoes.map((_, i) => ({ valor: String(i + 1), rotulo: `Partição ${i + 1}` })),
    { valor: 'fila', rotulo: 'Fila' },
  ];
  const nomes = ex.eventos.filter(e => e.tipo === 'chegada').map(e => (e as { processo: { nome: string } }).processo.nome);

  const linhas: Celula[][] = ex.eventos.map((e, i) => {
    if (e.tipo === 'chegada') {
      return [
        String(i + 1), `${e.processo.nome} chega (${e.processo.tamanho} KB)`,
        m.campo({ id: `ev${i}-part`, tipo: 'opcao', rotulo: `Partição de ${e.processo.nome}`, opcoes: opcoesParticao },
          e.particao === null ? 'fila' : e.particao),
        m.campo({ id: `ev${i}-frag`, tipo: 'numero', rotulo: `Fragmentação interna de ${e.processo.nome}`, dica: '- se foi para a fila' }, e.frag),
      ];
    }
    return [
      String(i + 1), `${e.processo} termina`,
      m.campo({
        id: `ev${i}-entra`, tipo: 'opcao', rotulo: `Quem sai da fila quando ${e.processo} termina`,
        opcoes: [{ valor: 'ninguem', rotulo: 'Ninguém' }, ...nomes.map(n => ({ valor: n, rotulo: n }))],
      }, e.entra ? e.entra.nome : 'ninguem'),
      m.campo({ id: `ev${i}-fragentra`, tipo: 'numero', rotulo: `Fragmentação interna de quem entra`, dica: '- se ninguém entra' }, e.fragEntra),
    ];
  });

  return {
    publica: {
      tipo: `fixas-${politica}`,
      titulo: `Partições fixas — ${NOME_POLITICA[politica]}`,
      enunciado:
        `O SO ocupa de 0 a ${SO_FIXAS - 1} KB e as partições ocupam os ${AREA_FIXAS} KB seguintes. ` +
        `Cada processo usa a ${NOME_POLITICA[politica]}; se nenhuma livre comportar, vai para a fila. ` +
        `Quando um processo termina, entra o primeiro da fila (ordem de chegada) que couber na partição liberada. ` +
        `Informe a partição de cada chegada, quem sai da fila em cada término e a fragmentação interna. ` +
        `Use "-" quando não se aplica.`,
      dados: [{
        titulo: 'Partições',
        cabecalho: ['Partição', 'Início (KB)', 'Tamanho (KB)'],
        linhas: ex.particoes.map((t, i) => [String(i + 1), String(inicios[i]), String(t)]),
      }],
      respostas: [
        { titulo: 'Eventos', cabecalho: ['#', 'Evento', 'Partição / quem entra', 'Fragmentação interna (KB)'], linhas },
        { cabecalho: ['Ao final', 'Valor'], linhas: [['Fragmentação interna total (KB)',
          m.campo({ id: 'frag-final', tipo: 'numero', rotulo: 'Fragmentação interna total' }, ex.fragFinal)]] },
      ],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

// ───────────────────────── variáveis ─────────────────────────

const RESULTADOS = [
  { valor: 'alocado', rotulo: 'Alocado' },
  { valor: 'fragmentacao', rotulo: 'Fragmentação externa' },
  { valor: 'insuficiente', rotulo: 'Memória insuficiente' },
];

function alocacao(alg: AlgoritmoFit, rnd: () => number): QuestaoGerada {
  const ex = gerarAlocacao(alg, rnd);
  const m = new Montador();
  const info = ALGORITMOS_FIT.find(a => a.valor === alg)!;
  const nomes = ex.eventos.filter(e => e.tipo === 'chegada').map(e => (e as { processo: { nome: string } }).processo.nome);

  const linhas: Celula[][] = ex.eventos.map((e, i) => {
    if (e.tipo === 'chegada') {
      return [
        String(i + 1), `${e.processo.nome} chega (${e.processo.tamanho} KB)`,
        m.campo({ id: `ev${i}-res`, tipo: 'opcao', rotulo: `Resultado de ${e.processo.nome}`, opcoes: RESULTADOS }, e.resultado),
        m.campo({ id: `ev${i}-base`, tipo: 'numero', rotulo: `Endereço de ${e.processo.nome}`, dica: '- se não foi alocado' }, e.base),
      ];
    }
    return [
      String(i + 1), `${e.processo} termina`,
      m.campo({
        id: `ev${i}-entra`, tipo: 'opcao', rotulo: `Quem entra quando ${e.processo} termina`,
        opcoes: [{ valor: 'ninguem', rotulo: 'Ninguém entra' }, ...nomes.map(n => ({ valor: n, rotulo: `${n} entra` }))],
      }, e.entra ? e.entra.nome : 'ninguem'),
      m.campo({ id: `ev${i}-baseentra`, tipo: 'numero', rotulo: 'Endereço de quem entra', dica: '- se ninguém entra' }, e.baseEntra),
    ];
  });

  return {
    publica: {
      tipo: `var-${alg}`,
      titulo: `Partições variáveis — ${info.nome}`,
      enunciado:
        `${AVISO_VAR} Aloque com ${info.nome} (${info.regra}; empate: menor endereço)` +
        (alg === 'CIRCULAR' ? `. A busca começa em ${ex.inicial.ponteiro} KB (após a última alocação)` : '') +
        `. Sem lacuna que comporte, o processo vai para a fila e tenta de novo quando memória é liberada. ` +
        `Informe o resultado e o endereço inicial de cada evento. Use "-" quando não se aplica.`,
      dados: [tabelaProcessos(ex.inicial.alocados)],
      respostas: [{ titulo: 'Sequência de eventos', cabecalho: ['#', 'Evento', 'Resultado / quem entra', 'Endereço inicial (KB)'], linhas }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

/** Linhas da tabela de lacunas: sempre 5 (o gerador faz de 2 a 5 lacunas); as que sobram levam "-". */
const LINHAS_LACUNAS = 5;

function lacunas(rnd: () => number): QuestaoGerada {
  const ex = gerarLacunas(rnd);
  const m = new Montador();
  const linhas: Celula[][] = Array.from({ length: LINHAS_LACUNAS }, (_, i) => {
    const l = ex.lacunas[i];
    return [
      String(i + 1),
      m.campo({ id: `lac${i}-inicio`, tipo: 'numero', rotulo: `Início da lacuna ${i + 1}`, dica: '- se sobrar' }, l ? l.inicio : null),
      m.campo({ id: `lac${i}-tamanho`, tipo: 'numero', rotulo: `Tamanho da lacuna ${i + 1}`, dica: '- se sobrar' }, l ? l.tamanho : null),
    ];
  });
  return {
    publica: {
      tipo: 'var-lacunas',
      titulo: 'Partições variáveis — tabela de lacunas',
      enunciado: `${AVISO_VAR} Preencha a tabela de lacunas (início e tamanho), em ordem de endereço. ` +
        `Lacunas vizinhas formam uma só. Preencha as linhas que sobrarem com "-".`,
      dados: [tabelaProcessos(ex.alocados)],
      respostas: [{ titulo: 'Tabela de lacunas', cabecalho: ['#', 'Início (KB)', 'Tamanho (KB)'], linhas }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

function compactacao(rnd: () => number): QuestaoGerada {
  const ex = gerarCompactacao(rnd);
  const m = new Montador();
  const ordem = [...ex.alocados].sort((a, b) => a.base - b.base);
  return {
    publica: {
      tipo: 'var-compactacao',
      titulo: 'Partições variáveis — compactação',
      enunciado: `${AVISO_VAR} Faça a compactação: os processos vão para o início da área dos processos, ` +
        `na ordem de endereço. Informe a nova base de cada processo e a lacuna que sobra.`,
      dados: [],
      respostas: [
        {
          titulo: 'Novas bases',
          cabecalho: ['Processo', 'Base atual (KB)', 'Tamanho (KB)', 'Nova base (KB)'],
          linhas: ordem.map(a => [a.nome, String(a.base), String(a.tamanho),
            m.campo({ id: `base-${a.nome}`, tipo: 'numero', rotulo: `Nova base de ${a.nome}` }, ex.novasBases[a.nome])]),
        },
        {
          titulo: 'Lacuna depois da compactação',
          cabecalho: ['Início (KB)', 'Tamanho (KB)'],
          linhas: [[
            m.campo({ id: 'lacuna-inicio', tipo: 'numero', rotulo: 'Início da lacuna final' }, ex.lacunaFinal.inicio),
            m.campo({ id: 'lacuna-tamanho', tipo: 'numero', rotulo: 'Tamanho da lacuna final' }, ex.lacunaFinal.tamanho),
          ]],
        },
      ],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

export const QUESTOES_PARTICOES: TipoQuestao[] = [
  ...(['FIRST', 'BEST'] as PoliticaFixa[]).map(p => ({
    id: `fixas-${p}`, assunto: 'Partições fixas', nome: `Alocação: ${NOME_POLITICA[p]}`,
    gerar: (rnd: () => number) => fixas(p, rnd),
  })),
  ...ALGORITMOS_FIT.map(a => ({
    id: `var-${a.valor}`, assunto: 'Partições variáveis', nome: `Alocação: ${a.nome}`,
    gerar: (rnd: () => number) => alocacao(a.valor, rnd),
  })),
  { id: 'var-lacunas', assunto: 'Partições variáveis', nome: 'Tabela de lacunas', gerar: lacunas },
  { id: 'var-compactacao', assunto: 'Partições variáveis', nome: 'Compactação', gerar: compactacao },
];
