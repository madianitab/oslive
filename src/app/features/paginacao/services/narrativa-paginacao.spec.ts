import { narrarPasso } from './narrativa-paginacao';
import { Pagina } from '../models/pagina';

describe('narrarPasso', () => {
  it('descreve um hit', () => {
    const pag = new Pagina('B', '#000', 2);
    const txt = narrarPasso({ paginaReferenciada: pag, tipo: 'hit', quadroDestino: 1 });
    expect(txt).toContain('B2');
    expect(txt.toLowerCase()).toContain('já está');
  });

  it('descreve um fault sem vítima (havia quadro livre)', () => {
    const pag = new Pagina('A', '#000', 0);
    const txt = narrarPasso({ paginaReferenciada: pag, tipo: 'fault', quadroDestino: 3 });
    expect(txt.toLowerCase()).toContain('falta de página');
    expect(txt).toContain('A0');
    expect(txt).toContain('quadro 3');
  });

  it('descreve um fault com substituição (vítima)', () => {
    const pag = new Pagina('C', '#000', 1);
    const vit = new Pagina('A', '#000', 0);
    const txt = narrarPasso({ paginaReferenciada: pag, tipo: 'fault', quadroDestino: 2, vitima: vit, quadroVitima: 2 });
    expect(txt.toLowerCase()).toContain('falta de página');
    expect(txt).toContain('C1');
    expect(txt).toContain('A0');
    expect(txt.toLowerCase()).toContain('remove');
  });
});
