import { celulaCsv, gerarCsv, nomeArquivo, numeroCsv } from './csv';

describe('CSV dos resultados', () => {
  it('vírgula decimal e vazio para nulo', () => {
    expect(numeroCsv(7.5)).toBe('7,5');
    expect(numeroCsv(null)).toBe('');
    expect(celulaCsv(8.25)).toBe('8,25');
  });

  it('aspas para ; e quebras de linha', () => {
    expect(celulaCsv('Silva; Ana')).toBe('"Silva; Ana"');
    expect(celulaCsv('diz "oi"')).toBe('"diz ""oi"""');
    expect(celulaCsv('a\nb')).toBe('"a\nb"');
  });

  it('protege contra fórmulas (injeção de CSV)', () => {
    expect(celulaCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(celulaCsv('+5')).toBe(`'+5`);
    expect(celulaCsv('@soma')).toBe(`'@soma`);
    expect(celulaCsv(-3)).toBe('-3');   // número de verdade não muda
  });

  it('arquivo com BOM, ; e CRLF', () => {
    const t = gerarCsv(['Nome', 'Nota'], [['Ana', 9.5]]);
    expect(t.startsWith('﻿')).toBeTrue();
    expect(t).toContain('Nome;Nota\r\nAna;9,5\r\n');
  });

  it('nome de arquivo', () => {
    expect(nomeArquivo('Prova 1 — SO 2026/2')).toBe('prova-1-so-2026-2');
  });
});
