/**
 * Formato das questões das avaliações (sem Angular).
 *
 * Uma questão é gerada a partir de uma semente e tem duas partes:
 * - `publica`: o que o aluno vê (enunciado, tabelas e campos de resposta), sem o gabarito;
 * - `gabarito`: a resposta certa de cada campo, que só existe no servidor
 *   (e na prévia da professora).
 *
 * As tabelas são genéricas: cada célula é um texto ou um campo de resposta.
 * Assim uma única tela mostra qualquer tipo de questão.
 */

export type TipoCampo = 'numero' | 'binario' | 'texto' | 'opcao';

export interface Campo {
  id: string;
  tipo: TipoCampo;
  /** Rótulo curto (usado quando o campo aparece fora de tabela e no relatório). */
  rotulo: string;
  /** Opções do campo `opcao` (valor gravado e texto mostrado). */
  opcoes?: { valor: string; rotulo: string }[];
  /** Dica no campo vazio (ex.: "binário, 5 bits" ou "- se foi para a fila"). */
  dica?: string;
  /** Campo de 1 ou 2 caracteres (ex.: célula do diagrama de uso da CPU). */
  mini?: boolean;
}

/** Célula de tabela: texto, ou referência a um campo de resposta. */
export type Celula = string | { campo: string };

export interface Tabela {
  titulo?: string;
  cabecalho: string[];
  linhas: Celula[][];
}

export interface QuestaoPublica {
  /** Id do tipo no catálogo (ex.: 'esc-RR'). */
  tipo: string;
  titulo: string;
  enunciado: string;
  /** Código-fonte mostrado antes das tabelas (ex.: programa em C com fork). */
  codigo?: string;
  /** Tabelas só de dados (antes das respostas). */
  dados: Tabela[];
  /** Tabelas com campos de resposta. */
  respostas: Tabela[];
  /** Tabelas de consulta, mostradas depois das respostas (ex.: decimal → binário). */
  apoio?: Tabela[];
  /** Todos os campos de resposta da questão, na ordem de correção. */
  campos: Campo[];
}

export interface QuestaoGerada {
  publica: QuestaoPublica;
  /** Resposta certa de cada campo (pela id). */
  gabarito: Record<string, string>;
}

/** Item do modelo da prova: igual para todos os alunos; muda só a semente. */
export interface ItemModelo {
  tipo: string;
}

/** Tipo de questão oferecido na criação da prova. */
export interface TipoQuestao {
  id: string;
  /** Assunto, para agrupar na escolha (ex.: 'Escalonamento'). */
  assunto: string;
  nome: string;
  gerar(rnd: () => number): QuestaoGerada;
  /**
   * Características usadas no sorteio para variar a prova (ex.: ['alg:RR', 'forma:diag']):
   * entre os tipos marcados, o sorteio prefere os que repetem menos características já escolhidas.
   */
  chaves?: string[];
  /** Tipo antigo: continua valendo nas provas já salvas, mas não aparece na criação. */
  oculto?: boolean;
}

/**
 * Assunto escolhido em duas listas que se combinam (ex.: escalonamento:
 * algoritmos × o que pedir). Cada combinação é um tipo do catálogo.
 */
export interface GradeAssunto {
  assunto: string;
  linhasTitulo: string;
  colunasTitulo: string;
  linhas: { id: string; nome: string }[];
  colunas: { id: string; nome: string }[];
  /** Id do tipo da combinação. */
  tipo(linha: string, coluna: string): string;
}

/** Respostas do aluno: questão (índice) → campo → valor digitado. */
export type RespostasProva = Record<string, Record<string, string>>;
