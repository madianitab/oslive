import { TestBed } from '@angular/core/testing';
import { PalcoPaginacaoComponent } from './palco-paginacao.component';
import { MemoriaFisica } from '../../../models/memoria-fisica';
import { Pagina } from '../../../models/pagina';
import { PassoPaginacao } from '../../../models/passo-paginacao';

function mem(nomes: string[]): MemoriaFisica[] {
  return nomes.map((n, i) => new MemoriaFisica(i, n, '#111', 0));
}

describe('PalcoPaginacaoComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PalcoPaginacaoComponent] }));

  it('renderiza 8 quadros da memória física', () => {
    const f = TestBed.createComponent(PalcoPaginacaoComponent);
    const passo: PassoPaginacao = {
      indice: 0, paginaReferenciada: new Pagina('A', '#111', 0), tipo: 'fault',
      quadroDestino: 0, memoriaFisica: mem(['A0',' ',' ',' ',' ',' ',' ',' ']), narrativa: 'x',
    };
    f.componentInstance.passo = passo; f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.quadro').length).toBe(8);
  });

  it('mostra o balão em fault e esconde em hit', () => {
    const f = TestBed.createComponent(PalcoPaginacaoComponent);
    const base = { indice: 0, paginaReferenciada: new Pagina('A', '#111', 0), quadroDestino: 0,
      memoriaFisica: mem(['A0',' ',' ',' ',' ',' ',' ',' ']), narrativa: 'falta' };
    f.componentInstance.passo = { ...base, tipo: 'fault' } as PassoPaginacao; f.detectChanges();
    expect(f.nativeElement.querySelector('os-sim-callout .os-callout')).toBeTruthy();
    f.componentInstance.passo = { ...base, tipo: 'hit' } as PassoPaginacao; f.detectChanges();
    expect(f.nativeElement.querySelector('os-sim-callout .os-callout')).toBeFalsy();
  });
});
