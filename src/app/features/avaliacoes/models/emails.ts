/** Mesmo formato aceito pelo banco (supabase/schema.sql, tabela turma_alunos). */
const FORMATO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface ListaEmails {
  /** E-mails válidos, em minúsculas, sem repetição, na ordem em que apareceram. */
  validos: string[];
  /** Trechos que não parecem e-mail (para avisar a professora). */
  invalidos: string[];
}

/**
 * Separa a lista colada pela professora: aceita vírgula, ponto e vírgula,
 * quebra de linha, tabulação ou espaço. Também aceita "Nome <email>".
 */
export function separarEmails(texto: string): ListaEmails {
  const validos: string[] = [];
  const invalidos: string[] = [];
  const vistos = new Set<string>();

  for (const bruto of texto.split(/[,;\s]+/)) {
    const item = bruto.replace(/^[<"'(]+|[>"')]+$/g, '').trim().toLowerCase();
    if (!item) continue;
    // palavra sem @ (ex.: o nome em "Nome <email>" copiado do Gmail): ignora
    if (!item.includes('@')) continue;
    if (!FORMATO.test(item) || item.length > 254) {
      invalidos.push(bruto.trim());
      continue;
    }
    if (!vistos.has(item)) {
      vistos.add(item);
      validos.push(item);
    }
  }
  return { validos, invalidos };
}
