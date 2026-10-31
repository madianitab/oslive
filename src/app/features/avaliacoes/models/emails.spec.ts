import { separarEmails } from './emails';

describe('separarEmails', () => {
  it('aceita vírgula, ponto e vírgula e quebra de linha', () => {
    const r = separarEmails('a@x.com, b@x.com;c@x.com\nd@x.com\r\n\te@x.com');
    expect(r.validos).toEqual(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com']);
    expect(r.invalidos).toEqual([]);
  });

  it('passa para minúsculas e remove repetidos', () => {
    expect(separarEmails('Ana@X.com\nana@x.com, ANA@x.COM').validos).toEqual(['ana@x.com']);
  });

  it('aceita o formato "Nome <email>" copiado do Gmail', () => {
    const r = separarEmails('Maria Silva <maria@x.com>, "João" <joao@y.com.br>');
    expect(r.validos).toEqual(['maria@x.com', 'joao@y.com.br']);
    expect(r.invalidos).toEqual([]);
  });

  it('separa os trechos que não são e-mail válido', () => {
    const r = separarEmails('ok@x.com, sem-ponto@x, @x.com, a@@b.com');
    expect(r.validos).toEqual(['ok@x.com']);
    expect(r.invalidos).toEqual(['sem-ponto@x', '@x.com', 'a@@b.com']);
  });

  it('lista vazia', () => {
    expect(separarEmails('  \n , ')).toEqual({ validos: [], invalidos: [] });
  });
});
