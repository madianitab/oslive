import {
  BITS_DESLOCAMENTO,
  BITS_FISICO,
  BITS_SEGMENTO,
  ProcessoSegmentado,
  SEGMENTOS,
  TAMANHO_MEMORIA,
  TipoSegmento,
  binario,
  ocupacao,
  traduzir,
} from '../../segmentacao/models/segmentacao';
import { gerarSegmentacao, gerarTabelaSegmentos4 } from '../../segmentacao/models/exercicio-segmentacao';
import { Montador } from './montador';
import { Campo, Celula, QuestaoGerada, Tabela, TipoQuestao } from './tipos';

const MODELO =
  `Memória física de ${TAMANHO_MEMORIA} bytes (endereço físico de ${BITS_FISICO} bits). ` +
  `Endereço lógico = segmento (${BITS_SEGMENTO} bits: 00 código, 01 dados, 10 pilha) + deslocamento (${BITS_DESLOCAMENTO} bits). ` +
  `Base e limite em binário (${BITS_FISICO} bits); o limite é o tamanho do segmento.`;

function tabelaSegmentos(p: ProcessoSegmentado): Tabela {
  return {
    titulo: `Tabela de segmentos de ${p.nome}`,
    cabecalho: ['Segmento', 'Base', 'Limite'],
    linhas: p.segmentos.map(s => [`${binario(s.numero, BITS_SEGMENTO)} · ${s.nome}`,
      binario(s.base, BITS_FISICO), binario(s.tamanho, BITS_FISICO)]),
  };
}

/** Cola de conversão: 0 a 31 em decimal e em binário (5 bits), em 4 blocos de 8. */
function colaBinario(): Tabela {
  const linhas: Celula[][] = [];
  for (let i = 0; i < 8; i++) {
    linhas.push([0, 8, 16, 24].flatMap(b => [String(b + i), binario(b + i, BITS_FISICO)]));
  }
  return { titulo: 'Consulta: decimal → binário', cabecalho: ['Dec', 'Bin', 'Dec', 'Bin', 'Dec', 'Bin', 'Dec', 'Bin'], linhas };
}

/** Memória física em linhas de 8 bytes: "A:C0" = byte 0 do código de A; "·" = livre. */
function memoriaFisica(processos: ProcessoSegmentado[]): Tabela {
  const mem = ocupacao(processos);
  const linhas: Celula[][] = [];
  for (let i = 0; i < TAMANHO_MEMORIA; i += 8) {
    linhas.push([`${i}–${i + 7}`, ...mem.slice(i, i + 8).map(b => (b.processo ? `${b.processo.nome}:${b.conteudo}` : '·'))]);
  }
  return {
    titulo: 'Memória física (A:C0 = byte 0 do código de A; · = livre)',
    cabecalho: ['Endereços', '+0', '+1', '+2', '+3', '+4', '+5', '+6', '+7'],
    linhas,
  };
}

function traducao(rnd: () => number): QuestaoGerada {
  const ex = gerarSegmentacao('TRADUCAO', rnd);
  const m = new Montador();
  return {
    publica: {
      tipo: 'seg-traducao',
      titulo: 'Segmentação — tradução de endereços',
      enunciado: `${MODELO} Traduza cada endereço lógico em físico (${BITS_FISICO} bits). Se o deslocamento não for menor ` +
        'que o limite (ou o segmento não existir), responda "erro": ocorre uma interrupção.',
      dados: ex.processos.map(tabelaSegmentos),
      apoio: [colaBinario()],
      respostas: [{
        titulo: 'Endereços',
        cabecalho: ['Processo', 'Lógico (seg · desloc.)', 'Físico ou "erro"'],
        linhas: ex.perguntas.map((q, i) => {
          const r = traduzir(q.processo, q.segmento, q.deslocamento);
          return [q.processo.nome, `${binario(q.segmento, BITS_SEGMENTO)} ${binario(q.deslocamento, BITS_DESLOCAMENTO)}`,
            m.campo({ id: `trad${i}`, tipo: 'texto', rotulo: `Endereço físico ${i + 1}`, dica: '5 bits ou erro' },
              r.ok ? binario(r.fisico!, BITS_FISICO) : 'ERRO')];
        }),
      }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

function tabela(rnd: () => number): QuestaoGerada {
  const ex = gerarTabelaSegmentos4(rnd);
  const m = new Montador();
  const nomes = ex.alvos.map(p => p.nome).join(' e ');
  return {
    publica: {
      tipo: 'seg-tabela',
      titulo: 'Segmentação — tabela de segmentos',
      enunciado: `${MODELO} Observe a memória física e complete as tabelas de segmentos dos processos ${nomes}.`,
      dados: [memoriaFisica(ex.processos)],
      apoio: [colaBinario()],
      respostas: ex.alvos.map(alvo => ({
        titulo: `Tabela de segmentos de ${alvo.nome}`,
        cabecalho: ['Segmento', 'Base (5 bits)', 'Limite (5 bits)'],
        linhas: (['C', 'D', 'P'] as TipoSegmento[]).map(t => {
          const s = alvo.segmentos.find(x => x.tipo === t)!;
          return [`${binario(s.numero, BITS_SEGMENTO)} · ${s.nome}`,
            m.campo({ id: `${alvo.nome}-${t}-base`, tipo: 'binario', rotulo: `Base de ${s.nome} de ${alvo.nome}`, dica: '5 bits' },
              binario(s.base, BITS_FISICO)),
            m.campo({ id: `${alvo.nome}-${t}-limite`, tipo: 'binario', rotulo: `Limite de ${s.nome} de ${alvo.nome}`, dica: '5 bits' },
              binario(s.tamanho, BITS_FISICO))];
        }),
      })),
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

function alocacao(rnd: () => number): QuestaoGerada {
  const ex = gerarSegmentacao('ALOCACAO', rnd);
  const m = new Montador();
  const novo = ex.novo!;
  const g = ex.gabaritoAlocacao!;
  return {
    publica: {
      tipo: 'seg-alocacao',
      titulo: 'Segmentação — alocação best-fit',
      enunciado: `${MODELO} O processo ${novo.nome} vai ser criado com código de ${novo.tamanhos.C}, dados de ${novo.tamanhos.D} ` +
        `e pilha de ${novo.tamanhos.P} bytes. Aloque segmento a segmento por best-fit, na ordem código → dados → pilha ` +
        '(menor lacuna que comporta; empate: menor endereço). É tudo ou nada: se um segmento não couber, o processo não é criado. ' +
        'Diga se o processo é criado e a base de cada segmento ("-" se não for criado).',
      dados: [memoriaFisica(ex.processos)],
      apoio: [colaBinario()],
      respostas: [
        {
          cabecalho: ['O processo é criado?'],
          linhas: [[m.campo({
            id: 'cabe', tipo: 'opcao', rotulo: 'O processo é criado?',
            opcoes: [
              { valor: 'sim', rotulo: 'Sim' },
              { valor: 'fragmentacao', rotulo: 'Não: fragmentação externa' },
              { valor: 'insuficiente', rotulo: 'Não: memória insuficiente' },
            ],
          }, g.ok ? 'sim' : g.motivo)]],
        },
        {
          titulo: `Tabela de segmentos de ${novo.nome}`,
          cabecalho: ['Segmento', 'Limite', 'Base (5 bits)'],
          linhas: SEGMENTOS.map(info => {
            const base = g.processo?.segmentos.find(s => s.tipo === info.tipo)?.base;
            return [`${binario(info.numero, BITS_SEGMENTO)} · ${info.nome}`, binario(novo.tamanhos[info.tipo], BITS_FISICO),
              m.campo({ id: `${info.tipo}-base`, tipo: 'binario', rotulo: `Base de ${info.nome}`, dica: '5 bits ou -' },
                base === undefined ? null : binario(base, BITS_FISICO))];
          }),
        },
      ],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

export const QUESTOES_SEGMENTACAO: TipoQuestao[] = [
  { id: 'seg-traducao', assunto: 'Segmentação', nome: 'Tradução de endereços', gerar: traducao },
  { id: 'seg-tabela', assunto: 'Segmentação', nome: 'Tabela de segmentos', gerar: tabela },
  { id: 'seg-alocacao', assunto: 'Segmentação', nome: 'Alocação best-fit', gerar: alocacao },
];
