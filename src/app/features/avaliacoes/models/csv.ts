/**
 * Planilha CSV para o Excel em português: separador ";", vírgula decimal e BOM UTF-8
 * (para os acentos aparecerem certos).
 */
export type ValorCsv = string | number | null | undefined;

export function numeroCsv(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(Number(n)) ? '' : String(Number(n)).replace('.', ',');
}

/**
 * Escapa uma célula. Texto que começa com = + - @ (ou tab/enter) ganha um apóstrofo na frente,
 * para o Excel não executar como fórmula (injeção de CSV): nomes e e-mails vêm dos alunos.
 */
export function celulaCsv(v: ValorCsv): string {
  let t = v === null || v === undefined ? '' : typeof v === 'number' ? numeroCsv(v) : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function gerarCsv(cabecalho: string[], linhas: ValorCsv[][]): string {
  return '﻿' + [cabecalho, ...linhas].map(l => l.map(celulaCsv).join(';')).join('\r\n') + '\r\n';
}

/** Nome de arquivo seguro: sem acento, espaço vira "-". */
export function nomeArquivo(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'resultados';
}
