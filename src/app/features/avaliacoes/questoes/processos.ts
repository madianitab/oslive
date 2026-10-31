import { Aleatorio, embaralhar, escolher, inteiro } from '../../../core/aleatorio';
import { PID_INICIAL, Resultado, simular as simularArvore } from '../../processos/models/arvore-processos';
import {
  Cenario,
  Estado,
  Evento,
  NOMES_ESTADO,
  ROTULOS_TRANSICAO,
  Transicao,
  gerarProcessos,
  simular as simularEstados,
} from '../../processos/models/estados';
import { Montador } from './montador';
import { Celula, QuestaoGerada, TipoQuestao } from './tipos';

// ───────────────────────── árvore de processos (fork) ─────────────────────────

const REGRAS_FORK =
  `O primeiro processo tem PID ${PID_INICIAL} e os demais recebem PIDs em ordem de criação. ` +
  'Uma CPU; depois do fork() o pai continua executando, e cada processo executa até bloquear (wait, sleep) ou terminar. ' +
  'As instruções são instantâneas; o tempo só avança com sleep().';

const MAX_PROCESSOS = 8;

/** Programas sorteados para as questões de contagem, PPID e saída. */
function programaArvore(rnd: Aleatorio): string {
  const modelo = inteiro(rnd, 0, 3);
  if (modelo === 0) {
    const k = inteiro(rnd, 2, 3);
    return [
      'int main() {',
      ...Array.from({ length: k }, () => '    fork();'),
      '    printf("PID %d\\n", getpid());',
      '}',
    ].join('\n');
  }
  if (modelo === 1) {
    const n = inteiro(rnd, 2, 3);
    return [
      'int main() {',
      `    for (int i = 0; i < ${n}; i++) {`,
      '        fork();',
      '    }',
      '    printf("PID %d\\n", getpid());',
      '}',
    ].join('\n');
  }
  if (modelo === 2) {
    // como o exemplo "dois filhos": só o pai cria o segundo filho
    const final = rnd() < 0.5;
    return [
      'int main() {',
      '    pid_t p = fork();',
      '    if (p != 0) {',
      '        fork();',
      '    }',
      ...(final ? ['    fork();'] : []),
      '    printf("PID %d\\n", getpid());',
      '}',
    ].join('\n');
  }
  // variável copiada no fork: cada processo tem a sua
  const x = inteiro(rnd, 2, 9);
  const a = inteiro(rnd, 1, 5);
  const b = inteiro(rnd, 1, 5);
  const espera = rnd() < 0.5;
  const neto = rnd() < 0.6;
  return [
    'int main() {',
    `    int x = ${x};`,
    '    pid_t p = fork();',
    '    if (p == 0) {',
    `        x = x + ${a};`,
    ...(neto ? ['        fork();'] : []),
    '        printf("x = %d\\n", x);',
    '    } else {',
    ...(espera ? ['        wait(NULL);'] : []),
    `        x = x * ${b};`,
    '        printf("x = %d\\n", x);',
    '    }',
    '}',
  ].join('\n');
}

/** Programa com filhos que dormem tempos diferentes: zumbi, órfão ou coletado com wait. */
function programaZumbi(rnd: Aleatorio): string {
  const [s1, s2, s3] = embaralhar(rnd, [1, 2, 3, 4, 5, 6]).slice(0, 3);
  const espera = rnd() < 0.5;
  return [
    'int main() {',
    '    pid_t a = fork();',
    '    if (a == 0) {',
    `        sleep(${s1});`,
    '        printf("filho 1 termina\\n");',
    '        exit(0);',
    '    }',
    '    pid_t b = fork();',
    '    if (b == 0) {',
    `        sleep(${s2});`,
    '        printf("filho 2 termina\\n");',
    '        exit(0);',
    '    }',
    `    sleep(${s3});`,
    ...(espera ? ['    wait(NULL);'] : []),
    '    printf("pai termina\\n");',
    '}',
  ].join('\n');
}

function executar(codigo: string): Resultado {
  const r = simularArvore(codigo, { ordem: 'pai' });
  if (r.erro) throw new Error(`Programa de fork inválido: ${r.erro.texto}`);
  if (r.processos.length > MAX_PROCESSOS) throw new Error('Programa com processos demais.');
  return r;
}

type Situacao = 'normal' | 'zumbi' | 'orfao';

/**
 * Para cada processo (exceto o primeiro): 'orfao' se o pai terminou antes dele;
 * 'zumbi' se terminou e ficou zumbi até o pai terminar (o pai não chamou wait para ele);
 * 'normal' se o pai o coletou com wait.
 */
function situacoes(r: Resultado): Record<number, Situacao> {
  const s: Record<number, Situacao> = {};
  for (const p of r.processos) if (p.pid !== PID_INICIAL) s[p.pid] = 'normal';
  for (let i = 0; i < r.fotos.length; i++) {
    for (const [pidTexto, e] of Object.entries(r.fotos[i].procs)) {
      const pid = Number(pidTexto);
      if (!(pid in s) || !e.orfao || s[pid] !== 'normal') continue;
      s[pid] = r.fotos[i - 1]?.procs[pid]?.estado === 'zumbi' ? 'zumbi' : 'orfao';
    }
  }
  return s;
}

function arvoreQuantos(rnd: Aleatorio): QuestaoGerada {
  const codigo = programaArvore(rnd);
  const r = executar(codigo);
  const m = new Montador();
  return {
    publica: {
      tipo: 'arv-quantos', titulo: 'Árvore de processos — quantos processos',
      enunciado: 'Considere o programa abaixo. Quantos processos existem ao todo (contando o primeiro, sem contar o shell) e quantas linhas são impressas?',
      codigo, dados: [],
      respostas: [{
        cabecalho: ['Pergunta', 'Resposta'],
        linhas: [
          ['Processos ao todo', m.campo({ id: 'processos', tipo: 'numero', rotulo: 'Processos ao todo' }, r.processos.length)],
          ['Linhas impressas', m.campo({ id: 'linhas', tipo: 'numero', rotulo: 'Linhas impressas' }, r.saida.length)],
        ],
      }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

function arvorePais(rnd: Aleatorio): QuestaoGerada {
  const codigo = programaArvore(rnd);
  const r = executar(codigo);
  const m = new Montador();
  const filhos = r.processos.filter(p => p.pid !== PID_INICIAL);
  return {
    publica: {
      tipo: 'arv-pais', titulo: 'Árvore de processos — pai de cada processo',
      enunciado: `${REGRAS_FORK} Monte a árvore: informe o PID do pai (quem chamou o fork que o criou) de cada processo.`,
      codigo, dados: [],
      respostas: [{
        titulo: 'Processos',
        cabecalho: ['PID', 'PID do pai'],
        linhas: filhos.map(p => [String(p.pid),
          m.campo({ id: `ppid-${p.pid}`, tipo: 'numero', rotulo: `Pai do PID ${p.pid}` }, p.ppidOrig)]),
      }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

function arvoreSaida(rnd: Aleatorio): QuestaoGerada {
  const codigo = programaArvore(rnd);
  const r = executar(codigo);
  const m = new Montador();
  return {
    publica: {
      tipo: 'arv-saida', titulo: 'Árvore de processos — saída do programa',
      enunciado: `${REGRAS_FORK} Escreva as linhas impressas, na ordem em que aparecem na tela.`,
      codigo, dados: [],
      respostas: [{
        titulo: 'Saída',
        cabecalho: ['Linha', 'Texto impresso'],
        linhas: r.saida.map((s, i) => [String(i + 1),
          m.campo({ id: `linha${i}`, tipo: 'texto', rotulo: `Linha ${i + 1}`, dica: 'ex.: PID 100' }, s.texto.trim())]),
      }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

const OPCOES_SITUACAO = [
  { valor: 'normal', rotulo: 'Coletado pelo pai (wait)' },
  { valor: 'zumbi', rotulo: 'Zumbi até o pai terminar' },
  { valor: 'orfao', rotulo: 'Órfão (adotado pelo init)' },
];

function arvoreZumbi(rnd: Aleatorio): QuestaoGerada {
  // sorteia até haver pelo menos um zumbi ou órfão
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    const codigo = programaZumbi(rnd);
    const r = executar(codigo);
    const sit = situacoes(r);
    if (!Object.values(sit).some(s => s !== 'normal')) continue;
    const m = new Montador();
    return {
      publica: {
        tipo: 'arv-zumbi', titulo: 'Árvore de processos — zumbi e órfão',
        enunciado: `${REGRAS_FORK} Um processo que termina fica zumbi até o pai chamar wait; ` +
          'se o pai termina antes do filho, o filho fica órfão e é adotado pelo init (PID 1), que coleta os zumbis. ' +
          'Classifique cada filho.',
        codigo, dados: [],
        respostas: [{
          titulo: 'Filhos',
          cabecalho: ['PID', 'O que acontece'],
          linhas: Object.keys(sit).map(Number).sort((x, y) => x - y).map(pid => [String(pid),
            m.campo({ id: `sit-${pid}`, tipo: 'opcao', rotulo: `Situação do PID ${pid}`, opcoes: OPCOES_SITUACAO }, sit[pid])]),
        }],
        campos: m.campos,
      },
      gabarito: m.gabarito,
    };
  }
  throw new Error('Não foi possível gerar a questão de zumbi e órfão.');
}

// ───────────────────────── estados do processo ─────────────────────────

const QUANTUM_ESTADOS = 2;
const EVENTOS_POR_QUESTAO = 8;

/** Descrição do evento sem dizer o estado nem o nome da transição. */
function descrever(c: Cenario, e: Evento): string {
  const p = c.processos.find(x => x.nome === e.processo)!;
  const op = p.passos.find(x => x.tipo === 'ES')?.dispositivo?.operacao ?? 'uma E/S';
  switch (e.transicao) {
    case 'SELECAO': return `O escalonador entrega a CPU a ${e.processo}.`;
    case 'PREEMPCAO': return `O quantum de ${e.processo} acaba e há outro processo esperando a CPU.`;
    case 'SOLICITA_ES': return `${e.processo} pede ${op}.`;
    case 'ES_CONCLUIDA': return `A ${op} de ${e.processo} termina.`;
    case 'TERMINO': return `${e.processo} chega ao fim do programa e chama exit().`;
    case 'RETORNO_IMEDIATO':
      return e.detalhe.includes('timer')
        ? `O quantum de ${e.processo} acaba, mas não há outro processo apto.`
        : `${e.processo} faz uma chamada de sistema simples (ex.: consultar a hora).`;
    case 'ENCERRAMENTO_BLOQUEADO':
      return e.detalhe.includes('kill')
        ? `Outro processo pede o término (kill) de ${e.processo} enquanto ele espera ${op}.`
        : `Ocorre uma exceção (timeout) na E/S de ${e.processo}.`;
    case 'CRIACAO': return `${e.processo} é criado.`;
    case 'ADMISSAO': return `${e.processo} é admitido.`;
  }
}

/** Até 8 eventos em ordem, com o máximo de transições diferentes (criação e admissão ficam de fora). */
function escolherEventos(rnd: Aleatorio): { cenario: Cenario; eventos: Evento[] } {
  for (let tentativa = 0; tentativa < 500; tentativa++) {
    const cenario = simularEstados(gerarProcessos({ quantidade: 3, quantum: QUANTUM_ESTADOS, especiais: true }, rnd), QUANTUM_ESTADOS);
    const candidatos = cenario.eventos.filter(e => e.transicao !== 'CRIACAO' && e.transicao !== 'ADMISSAO');
    const tipos = new Set(candidatos.map(e => e.transicao));
    if (tipos.size < 6) continue;
    // um de cada tipo, depois completa ao acaso; mantém a ordem do tempo
    const escolhidos = new Set<Evento>();
    for (const t of embaralhar(rnd, [...tipos])) escolhidos.add(escolher(rnd, candidatos.filter(e => e.transicao === t)));
    for (const e of embaralhar(rnd, candidatos)) {
      if (escolhidos.size >= EVENTOS_POR_QUESTAO) break;
      escolhidos.add(e);
    }
    const eventos = candidatos.filter(e => escolhidos.has(e)).slice(0, EVENTOS_POR_QUESTAO);
    return { cenario, eventos };
  }
  throw new Error('Não foi possível gerar a questão de estados.');
}

const OPCOES_ESTADO = (Object.keys(NOMES_ESTADO) as Estado[]).map(e => ({ valor: e, rotulo: NOMES_ESTADO[e] }));
const OPCOES_TRANSICAO = (Object.keys(ROTULOS_TRANSICAO) as Transicao[])
  .filter(t => t !== 'CRIACAO')
  .map(t => ({ valor: t, rotulo: ROTULOS_TRANSICAO[t] }));

const MODELO_ESTADOS = 'Estados do processo: Criação, Apto, Executando, Bloqueado e Destruição (Figura 4.2 do livro). ' +
  `Uma CPU, escalonamento circular com quantum de ${QUANTUM_ESTADOS} u.`;

function estadosApos(rnd: Aleatorio): QuestaoGerada {
  const { cenario, eventos } = escolherEventos(rnd);
  const m = new Montador();
  return {
    publica: {
      tipo: 'est-estado', titulo: 'Estados do processo — estado após cada evento',
      enunciado: `${MODELO_ESTADOS} Para cada evento, informe em que estado o processo fica logo depois dele.`,
      dados: [],
      respostas: [{
        titulo: 'Eventos (em ordem de tempo)',
        cabecalho: ['t', 'Evento', 'Estado do processo depois'],
        linhas: eventos.map((e, i) => [String(e.t), descrever(cenario, e),
          m.campo({ id: `est${i}`, tipo: 'opcao', rotulo: `Estado após o evento ${i + 1}`, opcoes: OPCOES_ESTADO }, e.para)]),
      }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

function estadosTransicao(rnd: Aleatorio): QuestaoGerada {
  const { cenario, eventos } = escolherEventos(rnd);
  const m = new Montador();
  return {
    publica: {
      tipo: 'est-transicao', titulo: 'Estados do processo — nome da transição',
      enunciado: `${MODELO_ESTADOS} Para cada evento, indique a transição que ocorre (como no diagrama do livro).`,
      dados: [],
      respostas: [{
        titulo: 'Eventos (em ordem de tempo)',
        cabecalho: ['t', 'Evento', 'Transição'],
        linhas: eventos.map((e, i) => [String(e.t), descrever(cenario, e),
          m.campo({ id: `tr${i}`, tipo: 'opcao', rotulo: `Transição do evento ${i + 1}`, opcoes: OPCOES_TRANSICAO }, e.transicao)]),
      }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

/** Transições do diagrama (de → para) e as que não existem. */
const VALIDAS: [Estado, Estado, Transicao][] = [
  ['CRIACAO', 'APTO', 'ADMISSAO'],
  ['APTO', 'EXECUTANDO', 'SELECAO'],
  ['EXECUTANDO', 'APTO', 'PREEMPCAO'],
  ['EXECUTANDO', 'BLOQUEADO', 'SOLICITA_ES'],
  ['BLOQUEADO', 'APTO', 'ES_CONCLUIDA'],
  ['EXECUTANDO', 'DESTRUICAO', 'TERMINO'],
  ['EXECUTANDO', 'EXECUTANDO', 'RETORNO_IMEDIATO'],
  ['BLOQUEADO', 'DESTRUICAO', 'ENCERRAMENTO_BLOQUEADO'],
];
const INVALIDAS: [Estado, Estado][] = [
  ['APTO', 'BLOQUEADO'],
  ['BLOQUEADO', 'EXECUTANDO'],
  ['CRIACAO', 'EXECUTANDO'],
  ['APTO', 'DESTRUICAO'],
  ['DESTRUICAO', 'APTO'],
  ['CRIACAO', 'BLOQUEADO'],
  ['APTO', 'CRIACAO'],
  ['BLOQUEADO', 'BLOQUEADO'],
];

function estadosValida(rnd: Aleatorio): QuestaoGerada {
  const pares = embaralhar(rnd, [
    ...embaralhar(rnd, VALIDAS).slice(0, 4).map(([de, para, t]) => ({ de, para, t: t as Transicao | null })),
    ...embaralhar(rnd, INVALIDAS).slice(0, 4).map(([de, para]) => ({ de, para, t: null as Transicao | null })),
  ]);
  const m = new Montador();
  const linhas: Celula[][] = pares.map((p, i) => [
    `${NOMES_ESTADO[p.de]} → ${NOMES_ESTADO[p.para]}`,
    m.campo({ id: `ok${i}`, tipo: 'opcao', rotulo: `Transição ${i + 1} é possível?`,
      opcoes: [{ valor: 'sim', rotulo: 'Sim' }, { valor: 'nao', rotulo: 'Não' }] }, p.t ? 'sim' : 'nao'),
    m.campo({ id: `qual${i}`, tipo: 'opcao', rotulo: `Qual é a transição ${i + 1}`,
      opcoes: [...OPCOES_TRANSICAO, { valor: 'nenhuma', rotulo: 'Nenhuma: não existe' }] }, p.t ?? 'nenhuma'),
  ]);
  return {
    publica: {
      tipo: 'est-valida', titulo: 'Estados do processo — transição possível?',
      enunciado: 'Pelo diagrama de estados do livro (incluindo as linhas pontilhadas), diga se cada mudança de estado é possível. ' +
        'Se for, indique qual transição é; se não for, escolha "Nenhuma: não existe".',
      dados: [],
      respostas: [{ titulo: 'Mudanças de estado', cabecalho: ['De → para', 'Possível?', 'Qual transição'], linhas }],
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

export const QUESTOES_PROCESSOS: TipoQuestao[] = [
  { id: 'est-estado', assunto: 'Estados do processo', nome: 'Estado após cada evento', gerar: estadosApos },
  { id: 'est-transicao', assunto: 'Estados do processo', nome: 'Nome da transição', gerar: estadosTransicao },
  { id: 'est-valida', assunto: 'Estados do processo', nome: 'Transição possível?', gerar: estadosValida },
  { id: 'arv-quantos', assunto: 'Árvore de processos (fork)', nome: 'Quantos processos e linhas', gerar: arvoreQuantos },
  { id: 'arv-pais', assunto: 'Árvore de processos (fork)', nome: 'Pai de cada processo (PPID)', gerar: arvorePais },
  { id: 'arv-saida', assunto: 'Árvore de processos (fork)', nome: 'Saída do programa', gerar: arvoreSaida },
  { id: 'arv-zumbi', assunto: 'Árvore de processos (fork)', nome: 'Zumbi e órfão', gerar: arvoreZumbi },
];
