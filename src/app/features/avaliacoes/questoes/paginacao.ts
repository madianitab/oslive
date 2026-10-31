import { QUANTIDADE_QUADROS, TAMANHO_PAGINA, binario } from '../../paginacao/models/paginacao-simples';
import {
  BITS_QUADRO,
  ProcessoExSimples,
  enderecoFisico,
  enderecoLogico,
  fragmentacaoInterna,
  gerarPaginacaoSimples,
  paginasNecessarias,
} from '../../paginacao/models/exercicio-paginacao-simples';
import {
  AlgoritmoVitima,
  PaginaExercicio,
  calcularVitimaPaginacao,
  gerarPaginacaoDemanda,
  nomePagina,
} from '../../paginacao/models/exercicio-paginacao-demanda';
import { bitsT1aT4 } from '../../paginacao/models/historico-bits';
import {
  AlgoritmoSC,
  CasoSC,
  PaginaFila,
  Situacao,
  gerarFilaInicial,
  gerarSituacao,
} from '../../paginacao/models/segunda-chance-sequencia';
import { TAM } from '../../../core/constantes';
import { Montador } from './montador';
import { Campo, Celula, QuestaoGerada, Tabela, TipoQuestao } from './tipos';

// ───────────────────────── paginação simples ─────────────────────────

const MODELO_SIMPLES =
  `Páginas e quadros de ${TAMANHO_PAGINA} bytes; memória física de ${QUANTIDADE_QUADROS} quadros. ` +
  'Endereço lógico = página (2 bits) + deslocamento (2 bits); físico = quadro (3 bits) + deslocamento (2 bits).';

function tabelaPaginas(p: ProcessoExSimples): Tabela {
  return {
    titulo: `Tabela de páginas de ${p.nome} (${p.bytes} bytes)`,
    cabecalho: ['Página', 'Quadro'],
    linhas: p.quadros.map((q, i) => [binario(i, 2), binario(q, BITS_QUADRO)]),
  };
}

/** Memória física quadro a quadro, com os bytes de cada processo (ex.: "A4 A5 A6 sobra"). */
function memoriaSimples(processos: ProcessoExSimples[]): Tabela {
  const linhas: Celula[][] = [];
  for (let q = 0; q < QUANTIDADE_QUADROS; q++) {
    const dono = processos.find(p => p.quadros.includes(q));
    let conteudo = 'livre';
    if (dono) {
      const pag = dono.quadros.indexOf(q);
      conteudo = Array.from({ length: TAMANHO_PAGINA }, (_, d) => {
        const i = pag * TAMANHO_PAGINA + d;
        return i < dono.bytes ? `${dono.nome}${i}` : 'sobra';
      }).join(' ');
    }
    linhas.push([binario(q, BITS_QUADRO), conteudo]);
  }
  return { titulo: 'Memória física', cabecalho: ['Quadro', 'Bytes'], linhas };
}

function simplesTraducao(rnd: () => number): QuestaoGerada {
  const ex = gerarPaginacaoSimples('TRADUCAO', rnd);
  const m = new Montador();
  return {
    publica: {
      tipo: 'pag-traducao',
      titulo: 'Paginação simples — tradução de endereços',
      enunciado: `${MODELO_SIMPLES} Use as tabelas de páginas para traduzir cada endereço lógico em físico (5 bits).`,
      dados: ex.processos.map(tabelaPaginas),
      respostas: [{
        titulo: 'Endereços',
        cabecalho: ['Processo', 'Endereço lógico', 'Endereço físico'],
        linhas: ex.perguntas.map((q, i) => [q.processo.nome, enderecoLogico(q.pagina, q.deslocamento),
          m.campo({ id: `trad${i}`, tipo: 'binario', rotulo: `Endereço físico ${i + 1}`, dica: '5 bits' },
            enderecoFisico(q.processo.quadros[q.pagina], q.deslocamento))]),
      }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

function simplesTabela(rnd: () => number): QuestaoGerada {
  const ex = gerarPaginacaoSimples('TABELA', rnd);
  const m = new Montador();
  const alvo = ex.processos[0];
  return {
    publica: {
      tipo: 'pag-tabela',
      titulo: 'Paginação simples — tabela de páginas',
      enunciado: `${MODELO_SIMPLES} Observe a memória física e complete a tabela de páginas do processo ${alvo.nome} ` +
        `(${alvo.bytes} bytes). O número do byte é a posição dele no processo, contando a partir de 0.`,
      dados: [memoriaSimples(ex.processos)],
      respostas: [{
        titulo: `Tabela de páginas de ${alvo.nome}`,
        cabecalho: ['Página', 'Quadro (3 bits)'],
        linhas: alvo.quadros.map((q, i) => [binario(i, 2),
          m.campo({ id: `pag${i}`, tipo: 'binario', rotulo: `Quadro da página ${i}`, dica: '3 bits' }, binario(q, BITS_QUADRO))]),
      }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

function simplesCalculos(rnd: () => number): QuestaoGerada {
  const ex = gerarPaginacaoSimples('CALCULOS', rnd);
  const m = new Montador();
  const quadros = ex.processos.reduce((t, p) => t + p.quadros.length, 0);
  return {
    publica: {
      tipo: 'pag-calculos',
      titulo: 'Paginação simples — páginas e fragmentação',
      enunciado: `${MODELO_SIMPLES} Calcule quantas páginas cada processo ocupa, a fragmentação interna de cada um, ` +
        'quantos quadros ficam ocupados e quantos bytes ficam livres na memória física.',
      dados: [],
      respostas: [
        {
          titulo: 'Processos',
          cabecalho: ['Processo', 'Tamanho (bytes)', 'Páginas', 'Fragmentação interna (bytes)'],
          linhas: ex.processos.map(p => [p.nome, String(p.bytes),
            m.campo({ id: `${p.nome}-paginas`, tipo: 'numero', rotulo: `Páginas de ${p.nome}` }, paginasNecessarias(p.bytes)),
            m.campo({ id: `${p.nome}-sobra`, tipo: 'numero', rotulo: `Fragmentação interna de ${p.nome}` }, fragmentacaoInterna(p.bytes))]),
        },
        {
          titulo: 'Memória física',
          cabecalho: ['Quadros ocupados', 'Bytes livres'],
          linhas: [[
            m.campo({ id: 'quadros', tipo: 'numero', rotulo: 'Quadros ocupados' }, quadros),
            m.campo({ id: 'livre', tipo: 'numero', rotulo: 'Bytes livres' }, (QUANTIDADE_QUADROS - quadros) * TAMANHO_PAGINA),
          ]],
        },
      ],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

// ───────────────────────── paginação por demanda ─────────────────────────

function memoriaDemanda(quadros: (PaginaExercicio | null)[], colunas: 'nenhuma' | AlgoritmoVitima): Tabela {
  const extra = colunas === 'FIFO' ? ['Carga']
    : colunas === 'SEGUNDA_CHANCE' ? ['Carga', 'Bit R']
      : colunas === 'HISTORICO' ? ['Carga', 'T1', 'T2', 'T3', 'T4'] : [];
  return {
    titulo: 'Memória física',
    cabecalho: ['Quadro', 'Página', ...extra],
    linhas: quadros.map((p, q) => {
      if (!p) return [String(q), 'livre', ...extra.map(() => '')];
      const cols = colunas === 'FIFO' ? [String(p.timestamp)]
        : colunas === 'SEGUNDA_CHANCE' ? [String(p.timestamp), String(p.bitRef)]
          : colunas === 'HISTORICO' ? [String(p.timestamp), ...bitsT1aT4(p.historico).map(String)] : [];
      return [String(q), nomePagina(p), ...cols];
    }),
  };
}

function demandaTabela(rnd: () => number): QuestaoGerada {
  const ex = gerarPaginacaoDemanda('LOGICA', 4, rnd);
  const m = new Montador();
  const opcoesQuadro = [{ valor: '-', rotulo: '-' }, ...Array.from({ length: TAM }, (_, q) => ({ valor: String(q), rotulo: String(q) }))];
  const opcoesBit = [{ valor: 'V', rotulo: 'V' }, { valor: 'I', rotulo: 'I' }];
  return {
    publica: {
      tipo: 'dem-tabela',
      titulo: 'Paginação por demanda — tabela de páginas',
      enunciado: `Memória física de ${TAM} quadros. Observe a memória física e complete a tabela de páginas de cada processo: ` +
        'o quadro (ou "-" se a página está só no disco) e o bit V/I.',
      dados: [memoriaDemanda(ex.quadros, 'nenhuma')],
      respostas: ex.processos.map(p => ({
        titulo: `Processo ${p.nome}`,
        cabecalho: ['Página', 'Quadro', 'Bit V/I'],
        linhas: p.paginas.map(pg => [String(pg.indice),
          m.campo({ id: `${nomePagina(pg)}-q`, tipo: 'opcao', rotulo: `Quadro de ${nomePagina(pg)}`, opcoes: opcoesQuadro },
            pg.quadro === null ? '-' : pg.quadro),
          m.campo({ id: `${nomePagina(pg)}-b`, tipo: 'opcao', rotulo: `Bit de ${nomePagina(pg)}`, opcoes: opcoesBit },
            pg.quadro === null ? 'I' : 'V')]),
      })),
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

const NOME_VITIMA: Record<AlgoritmoVitima, string> = {
  FIFO: 'FIFO',
  HISTORICO: 'Histórico de bits de referência',
  SEGUNDA_CHANCE: 'Segunda Chance',
};

const REGRA_VITIMA: Record<AlgoritmoVitima, string> = {
  FIFO: 'Sai a página carregada há mais tempo (menor carga).',
  HISTORICO: 'Compare a partir de T4 (o mais recente), depois T3, T2 e T1; persistindo o empate, sai a de menor carga.',
  SEGUNDA_CHANCE: 'Percorra em ordem de carga: bit R = 1 ganha segunda chance (vira 0 e vai para o fim); a primeira com bit 0 sai.',
};

function demandaVitima(alg: AlgoritmoVitima, rnd: () => number): QuestaoGerada {
  const ex = gerarPaginacaoDemanda('VITIMA', 4, rnd);
  const m = new Montador();
  const vitima = calcularVitimaPaginacao(ex.quadros, alg)!;
  const carregadas = ex.quadros.filter((q): q is PaginaExercicio => q !== null);
  return {
    publica: {
      tipo: `dem-${alg}`,
      titulo: `Paginação por demanda — página vítima (${NOME_VITIMA[alg]})`,
      enunciado: `A memória física está cheia e ocorreu falta de página para ${nomePagina(ex.paginaSolicitada!)}. ` +
        `Pelo algoritmo ${NOME_VITIMA[alg]}, qual página sai? ${REGRA_VITIMA[alg]}`,
      dados: [memoriaDemanda(ex.quadros, alg)],
      respostas: [{
        cabecalho: ['Página vítima'],
        linhas: [[m.campo({
          id: 'vitima', tipo: 'opcao', rotulo: 'Página vítima',
          opcoes: carregadas.map(p => ({ valor: nomePagina(p), rotulo: nomePagina(p) })),
        }, nomePagina(vitima))]],
      }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

// ───────────────────────── Segunda Chance em sequência ─────────────────────────

const SITUACOES_SC = 3;

const REGRA_SC: Record<AlgoritmoSC, string> = {
  SC: 'Segunda Chance: percorra a fila a partir do início; com R = 1 a página ganha segunda chance ' +
    '(R vira 0, recebe o momento atual e vai para o fim); a primeira com R = 0 sai.',
  SCM: 'Segunda Chance Melhorada, classes (R,M) na ordem (0,0) → (0,1) → (1,0) → (1,1): ' +
    '1ª volta procura (0,0) sem alterar nada; 2ª volta procura (0,1), e quem tem R = 1 e é ultrapassada fica com R = 0, ' +
    'recebe o momento atual e vai para o fim (M é mantido); repita se preciso.',
};

function tabelaFila(fila: PaginaFila[], alg: AlgoritmoSC, titulo: string): Tabela {
  return {
    titulo,
    cabecalho: ['Posição', 'Página', 'Carga', 'R', ...(alg === 'SCM' ? ['M'] : [])],
    linhas: fila.map((p, i) => [String(i + 1), p.nome, String(p.carga), String(p.r), ...(alg === 'SCM' ? [String(p.m)] : [])]),
  };
}

function segundaChanceSequencia(alg: AlgoritmoSC, rnd: () => number): QuestaoGerada {
  let fila = gerarFilaInicial(alg, rnd);
  const vistos: CasoSC[] = [];
  const vitimas: string[] = [];
  const situacoes: Situacao[] = [];
  for (let i = 0; i < SITUACOES_SC; i++) {
    const s = gerarSituacao(fila, alg, vistos, vitimas, vistos[vistos.length - 1] ?? null, rnd);
    situacoes.push(s);
    vistos.push(s.resultado.caso);
    vitimas.push(s.resultado.vitima.nome);
    fila = s.resultado.filaFinal;
  }
  const m = new Montador();
  const dados = situacoes.map((s, i) => {
    const acessos = s.acessos.length
      ? s.acessos.map(a => `t=${a.momento}: ${a.escrita ? 'escrita em' : 'leitura de'} ${a.pagina}`).join('; ')
      : 'nenhum acesso';
    return tabelaFila(s.filaInicial, alg,
      `Situação ${i + 1}. Acessos: ${acessos}. Em t=${s.momentoFalta}, falta de página para ${s.nova}.`);
  });
  return {
    publica: {
      tipo: `sc-${alg}`,
      titulo: `Paginação por demanda — ${alg === 'SC' ? 'Segunda Chance' : 'Segunda Chance Melhorada'} em sequência`,
      enunciado: `${REGRA_SC[alg]} Em cada situação, aplique os acessos (leitura liga R${alg === 'SCM' ? '; escrita liga R e M' : ''}) ` +
        'à fila mostrada e responda qual página sai e quantas páginas ganham segunda chance (vão para o fim com R = 0).',
      dados,
      respostas: [{
        titulo: 'Respostas',
        cabecalho: ['Situação', 'Página vítima', 'Segundas chances'],
        linhas: situacoes.map((s, i) => [String(i + 1),
          m.campo({
            id: `vit${i}`, tipo: 'opcao', rotulo: `Vítima da situação ${i + 1}`,
            opcoes: s.filaInicial.map(p => ({ valor: p.nome, rotulo: p.nome })),
          }, s.resultado.vitima.nome),
          m.campo({ id: `sc${i}`, tipo: 'numero', rotulo: `Segundas chances na situação ${i + 1}` },
            s.resultado.passos.filter(x => x.acao === 'segunda-chance').length)]),
      }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

export const QUESTOES_PAGINACAO: TipoQuestao[] = [
  { id: 'pag-traducao', assunto: 'Paginação simples', nome: 'Tradução de endereços', gerar: simplesTraducao },
  { id: 'pag-tabela', assunto: 'Paginação simples', nome: 'Tabela de páginas', gerar: simplesTabela },
  { id: 'pag-calculos', assunto: 'Paginação simples', nome: 'Páginas e fragmentação interna', gerar: simplesCalculos },
  { id: 'dem-tabela', assunto: 'Paginação por demanda', nome: 'Tabela de páginas (quadro e bit V/I)', gerar: demandaTabela },
  ...(['FIFO', 'HISTORICO', 'SEGUNDA_CHANCE'] as AlgoritmoVitima[]).map(a => ({
    id: `dem-${a}`, assunto: 'Paginação por demanda', nome: `Página vítima: ${NOME_VITIMA[a]}`,
    gerar: (rnd: () => number) => demandaVitima(a, rnd),
  })),
  { id: 'sc-SC', assunto: 'Paginação por demanda', nome: 'Segunda Chance em sequência', gerar: rnd => segundaChanceSequencia('SC', rnd) },
  { id: 'sc-SCM', assunto: 'Paginação por demanda', nome: 'Segunda Chance Melhorada em sequência', gerar: rnd => segundaChanceSequencia('SCM', rnd) },
];
