import { criarAleatorio, embaralhar, Aleatorio } from '../../../core/aleatorio';
import { QUESTOES_PROCESSOS } from './processos';
import { QUESTOES_ESCALONAMENTO } from './escalonamento';
import { QUESTOES_PARTICOES } from './particoes';
import { QUESTOES_PAGINACAO } from './paginacao';
import { QUESTOES_SEGMENTACAO } from './segmentacao';
import { ItemModelo, QuestaoGerada, TipoQuestao } from './tipos';

/**
 * Todos os tipos de questão oferecidos na criação da prova.
 * Para incluir um novo: crie o gerador (com rnd, sem Angular) e acrescente aqui.
 */
export const CATALOGO: TipoQuestao[] = [
  ...QUESTOES_PROCESSOS,
  ...QUESTOES_ESCALONAMENTO,
  ...QUESTOES_PARTICOES,
  ...QUESTOES_PAGINACAO,
  ...QUESTOES_SEGMENTACAO,
];

export const MAX_QUESTOES = 20;

export function tipoQuestao(id: string): TipoQuestao | undefined {
  return CATALOGO.find(t => t.id === id);
}

/** Assuntos na ordem do catálogo, com seus tipos (para a tela de criação). */
export function assuntos(): { assunto: string; tipos: TipoQuestao[] }[] {
  const mapa = new Map<string, TipoQuestao[]>();
  for (const t of CATALOGO) mapa.set(t.assunto, [...(mapa.get(t.assunto) ?? []), t]);
  return [...mapa].map(([assunto, tipos]) => ({ assunto, tipos }));
}

/**
 * Monta o modelo da prova: `quantidade` questões distribuídas entre os tipos escolhidos
 * (o mais equilibrado possível; se sobrar, os tipos extras são sorteados).
 */
export function montarModelo(tipos: string[], quantidade: number, rnd: Aleatorio = Math.random): ItemModelo[] {
  const validos = tipos.filter(t => tipoQuestao(t));
  if (!validos.length) throw new Error('Escolha pelo menos um conteúdo.');
  const n = Math.max(1, Math.min(MAX_QUESTOES, Math.floor(quantidade)));
  const itens: string[] = [];
  while (itens.length + validos.length <= n) itens.push(...validos);
  itens.push(...embaralhar(rnd, validos).slice(0, n - itens.length));
  // agrupa pela ordem do catálogo (questões do mesmo assunto ficam juntas)
  const ordem = (id: string) => CATALOGO.findIndex(t => t.id === id);
  return itens.sort((a, b) => ordem(a) - ordem(b)).map(tipo => ({ tipo }));
}

/** Confere o modelo recebido (o servidor não confia no que vem do navegador). */
export function validarModelo(modelo: unknown): ItemModelo[] {
  if (!Array.isArray(modelo) || modelo.length < 1 || modelo.length > MAX_QUESTOES) {
    throw new Error(`A prova deve ter de 1 a ${MAX_QUESTOES} questões.`);
  }
  return modelo.map(item => {
    const tipo = (item as ItemModelo)?.tipo;
    if (typeof tipo !== 'string' || !tipoQuestao(tipo)) throw new Error(`Tipo de questão desconhecido: ${String(tipo)}`);
    return { tipo };
  });
}

/**
 * Gera as questões da prova. Cada questão usa a semente "<semente>:<número>",
 * então trocar uma questão do modelo não muda as outras.
 */
export function gerarProva(modelo: ItemModelo[], semente: string): QuestaoGerada[] {
  return modelo.map((item, i) => tipoQuestao(item.tipo)!.gerar(criarAleatorio(`${semente}:${i}`)));
}
