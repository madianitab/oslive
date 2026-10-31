import {
  AlgoritmoExercicio,
  gerarGabaritoEscalonamento,
  gerarProcessosEscalonamento,
  usaPrioridade,
} from '../../escalonamento/models/exercicio-escalonamento';
import { QuestaoGerada, TipoQuestao } from './tipos';
import { Campo, Celula } from './tipos';

const NOMES: Record<AlgoritmoExercicio, string> = {
  FIFO: 'FIFO',
  SJF: 'SJF (não preemptivo)',
  PRIO: 'Prioridade não preemptiva',
  PRIO_P: 'Prioridade preemptiva',
  RR: 'Round Robin',
};

/** Regras de desempate do material (seção 4 do guia). */
const REGRAS: Record<AlgoritmoExercicio, string> = {
  FIFO: 'Chegadas no mesmo instante: ordem da tabela.',
  SJF: 'Empate no tempo de execução: ordem de chegada.',
  PRIO: 'Menor número = maior prioridade. Empate: ordem de chegada.',
  PRIO_P: 'Menor número = maior prioridade. Empate: ordem de chegada.',
  RR: 'Quando um processo chega no mesmo instante em que outro volta por fim de quantum, o que chega entra antes na fila.',
};

function gerar(alg: AlgoritmoExercicio, rnd: () => number): QuestaoGerada {
  const { processos, quantum } = gerarProcessosEscalonamento(rnd);
  const g = gerarGabaritoEscalonamento(processos, alg, quantum);
  const prio = usaPrioridade(alg);

  const campos: Campo[] = [];
  const gabarito: Record<string, string> = {};
  const campo = (id: string, rotulo: string, valor: number): Celula => {
    campos.push({ id, tipo: 'numero', rotulo });
    gabarito[id] = String(valor);
    return { campo: id };
  };

  const linhas = g.tabela.map(l => [
    l.nome,
    campo(`esp-${l.nome}`, `Espera de ${l.nome}`, l.espera),
    campo(`tat-${l.nome}`, `Turnaround de ${l.nome}`, l.turnaround),
  ]);
  linhas.push(['Média', campo('media-esp', 'Média de espera', g.mediaEspera), campo('media-tat', 'Média de turnaround', g.mediaTurnaround)]);

  return {
    publica: {
      tipo: `esc-${alg}`,
      titulo: `Escalonamento — ${NOMES[alg]}`,
      enunciado:
        `Escalone os processos com ${NOMES[alg]}${alg === 'RR' ? `, quantum = ${quantum}` : ''} ` +
        `e calcule o tempo de espera e o turnaround de cada processo, e as médias (até 2 casas decimais). ` +
        `Turnaround = término − chegada; espera = turnaround − execução. ${REGRAS[alg]}`,
      dados: [{
        titulo: 'Processos',
        cabecalho: ['Processo', 'Chegada', 'Execução', ...(prio ? ['Prioridade'] : [])],
        linhas: processos.map(p => [p.nome, String(p.chegada), String(p.execucao), ...(prio ? [String(p.prioridade)] : [])]),
      }],
      respostas: [{ titulo: 'Resultado', cabecalho: ['Processo', 'Tempo de espera', 'Turnaround'], linhas }],
      campos,
    },
    gabarito,
  };
}

export const QUESTOES_ESCALONAMENTO: TipoQuestao[] = (['FIFO', 'SJF', 'PRIO', 'PRIO_P', 'RR'] as AlgoritmoExercicio[])
  .map(alg => ({
    id: `esc-${alg}`,
    assunto: 'Escalonamento',
    nome: `${NOMES[alg]}: espera e turnaround`,
    gerar: (rnd: () => number) => gerar(alg, rnd),
  }));
