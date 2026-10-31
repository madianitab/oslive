import { Campo, QuestaoGerada, RespostasProva } from './tipos';

/** Texto usado no gabarito quando o campo não se aplica (ex.: processo foi para a fila). */
export const NAO_SE_APLICA = '-';

/**
 * Normaliza a resposta conforme o tipo do campo:
 * - número: aceita vírgula ou ponto decimal ("2,5" = "2.50");
 * - binário: ignora espaços, "|", "_", "." e "-" entre os bits;
 * - texto: sem acento, sem espaços nas pontas, maiúsculas;
 * - em todos, "-" (ou "—") vale "não se aplica".
 */
export function normalizar(tipo: Campo['tipo'], valor: string | null | undefined): string {
  const v = (valor ?? '').trim();
  if (v === '-' || v === '—' || v === '–') return NAO_SE_APLICA;
  switch (tipo) {
    case 'numero': {
      if (v === '') return '';
      const n = Number(v.replace(',', '.'));
      return Number.isFinite(n) ? String(n) : v.toUpperCase();
    }
    case 'binario':
      return v.replace(/[\s|_.]/g, '');
    case 'texto': {
      const t = v.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[\s|_.]/g, '');
      // como no exercício de segmentação: "interrupção" vale "erro"
      return ['INTERRUPCAO', 'INT', 'X'].includes(t) ? 'ERRO' : t;
    }
    case 'opcao':
      return v;
  }
}

export interface CorrecaoQuestao {
  acertos: number;
  total: number;
  /** Campo → acertou? */
  campos: Record<string, boolean>;
}

export function corrigirQuestao(q: QuestaoGerada, respostas: Record<string, string> | undefined): CorrecaoQuestao {
  const campos: Record<string, boolean> = {};
  let acertos = 0;
  for (const c of q.publica.campos) {
    const certo = respostas?.[c.id] !== undefined
      && normalizar(c.tipo, respostas[c.id]) !== ''
      && normalizar(c.tipo, respostas[c.id]) === normalizar(c.tipo, q.gabarito[c.id]);
    campos[c.id] = certo;
    if (certo) acertos++;
  }
  return { acertos, total: q.publica.campos.length, campos };
}

export interface CorrecaoProva {
  nota: number;
  questoes: (CorrecaoQuestao & { valor: number; nota: number })[];
}

/** Arredonda para 2 casas sem erro de ponto flutuante visível. */
export function arredondar(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Correção proporcional: cada questão vale valorTotal / quantidade e
 * a nota da questão é valor × acertos / campos.
 */
export function corrigirProva(questoes: QuestaoGerada[], respostas: RespostasProva, valorTotal: number): CorrecaoProva {
  const valor = questoes.length ? valorTotal / questoes.length : 0;
  let soma = 0;
  const lista = questoes.map((q, i) => {
    const c = corrigirQuestao(q, respostas[String(i)]);
    const nota = c.total ? valor * c.acertos / c.total : 0;
    soma += nota;
    return { ...c, valor: arredondar(valor), nota: arredondar(nota) };
  });
  // soma antes de arredondar: 3 questões de 3,333… completas dão 10, não 9,99
  return { nota: arredondar(soma), questoes: lista };
}
