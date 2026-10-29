import { contrastText, corGerada, gera_cor } from './utils';

describe('gera_cor', () => {
  it('nunca retorna cor vazia, mesmo com muitos processos (relato: partições variáveis)', () => {
    const usados: { cor: string }[] = [];
    for (let i = 0; i < 60; i++) {
      const cor = gera_cor(usados);
      expect(cor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(usados.some(p => p.cor.toUpperCase() === cor.toUpperCase())).toBeFalse();
      usados.push({ cor });
    }
  });

  it('cores geradas são escuras o bastante para o texto branco', () => {
    for (let n = 0; n < 100; n++) expect(contrastText(corGerada(n))).toBe('#ffffff');
  });
});
