import { criarAleatorio, embaralhar, Aleatorio } from '../../../core/aleatorio';
import { QUESTOES_PROCESSOS } from './processos';
import { GRADE_ESCALONAMENTO, QUESTOES_ESCALONAMENTO } from './escalonamento';
import { QUESTOES_PARTICOES } from './particoes';
import { QUESTOES_PAGINACAO } from './paginacao';
import { QUESTOES_SEGMENTACAO } from './segmentacao';
import { GradeAssunto, ItemModelo, QuestaoGerada, TipoQuestao } from './tipos';

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

/** Assuntos escolhidos em duas listas que se combinam (ex.: algoritmos × o que pedir). */
export const GRADES: GradeAssunto[] = [GRADE_ESCALONAMENTO];

export interface GrupoAssunto {
  assunto: string;
  /** Tipos que aparecem na criação (sem os antigos, ocultos). */
  tipos: TipoQuestao[];
  grade?: GradeAssunto;
}

/** Assuntos na ordem do catálogo, com seus tipos visíveis (para a tela de criação). */
export function assuntos(): GrupoAssunto[] {
  const mapa = new Map<string, TipoQuestao[]>();
  for (const t of CATALOGO) if (!t.oculto) mapa.set(t.assunto, [...(mapa.get(t.assunto) ?? []), t]);
  return [...mapa].map(([assunto, tipos]) => ({ assunto, tipos, grade: GRADES.find(g => g.assunto === assunto) }));
}

/** O que a professora marcou: tipos de questão e quantas questões quer de cada assunto. */
export interface PedidoProva {
  tipos: string[];
  quantidades: Record<string, number>;
}

/** Tipos marcados (visíveis) de um assunto: o máximo de questões que o assunto pode ter. */
export function tiposMarcados(assunto: string, tipos: string[]): TipoQuestao[] {
  const marcados = new Set(tipos);
  return CATALOGO.filter(t => t.assunto === assunto && !t.oculto && marcados.has(t.id));
}

/**
 * Monta o modelo da prova, igual para todos os alunos:
 * - de cada assunto, sorteia a quantidade pedida entre os tipos marcados, sem repetir tipo;
 * - quando os tipos têm `chaves` (ex.: algoritmo e forma), prefere os que repetem menos o que já saiu;
 * - todo assunto com quantidade maior que 0 aparece; as questões ficam na ordem do catálogo.
 */
export function montarModelo(pedido: PedidoProva, rnd: Aleatorio = Math.random): ItemModelo[] {
  const escolhidos: TipoQuestao[] = [];
  for (const { assunto } of assuntos()) {
    const n = Math.floor(pedido.quantidades[assunto] ?? 0);
    if (n <= 0) continue;
    const marcados = tiposMarcados(assunto, pedido.tipos);
    if (n > marcados.length) {
      throw new Error(`${assunto}: ${n} questões pedidas, mas só ${marcados.length} tipo(s) marcado(s).`);
    }
    escolhidos.push(...sortearSemRepetir(marcados, n, rnd));
  }
  if (!escolhidos.length) throw new Error('Escolha pelo menos um conteúdo e a quantidade de questões.');
  if (escolhidos.length > MAX_QUESTOES) throw new Error(`A prova pode ter no máximo ${MAX_QUESTOES} questões.`);
  const ordem = (t: TipoQuestao) => CATALOGO.indexOf(t);
  return escolhidos.sort((a, b) => ordem(a) - ordem(b)).map(t => ({ tipo: t.id }));
}

/** Sorteia n tipos diferentes, preferindo os que repetem menos as chaves já escolhidas. */
function sortearSemRepetir(tipos: TipoQuestao[], n: number, rnd: Aleatorio): TipoQuestao[] {
  const restantes = embaralhar(rnd, tipos);
  const usadas = new Map<string, number>();
  const peso = (t: TipoQuestao) => (t.chaves ?? []).reduce((s, k) => s + (usadas.get(k) ?? 0), 0);
  const saida: TipoQuestao[] = [];
  while (saida.length < n) {
    let melhor = 0;
    restantes.forEach((t, i) => { if (peso(t) < peso(restantes[melhor])) melhor = i; });
    const [t] = restantes.splice(melhor, 1);
    t.chaves?.forEach(k => usadas.set(k, (usadas.get(k) ?? 0) + 1));
    saida.push(t);
  }
  return saida;
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
