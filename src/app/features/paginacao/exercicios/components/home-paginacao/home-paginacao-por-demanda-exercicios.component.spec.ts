import { TestBed } from '@angular/core/testing';
import { HomePaginacaoPorDemandaExerciciosComponent } from './home-paginacao-por-demanda-exercicios.component';
import { TrilhaPaginacaoService } from '../../services/trilha-paginacao.service';
import { Pagina } from '../../models/pagina';

describe('HomePaginacao (Assistir)', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [HomePaginacaoPorDemandaExerciciosComponent],
  }));

  it('avancar(1) incrementa o índice, avancar(-1) decrementa, com limites', () => {
    const f = TestBed.createComponent(HomePaginacaoPorDemandaExerciciosComponent);
    const c = f.componentInstance;
    // injeta uma trilha determinística
    const svc = TestBed.inject(TrilhaPaginacaoService);
    c.trilha = svc.construir([new Pagina('A','#111',0), new Pagina('A','#111',1)]);
    c.indice = 0;
    c.avancar(1); expect(c.indice).toBe(1);
    c.avancar(1); expect(c.indice).toBe(1);   // clamp no fim
    c.avancar(-1); expect(c.indice).toBe(0);
    c.avancar(-1); expect(c.indice).toBe(0);  // clamp no início
  });

  it('irPara respeita limites', () => {
    const f = TestBed.createComponent(HomePaginacaoPorDemandaExerciciosComponent);
    const c = f.componentInstance;
    const svc = TestBed.inject(TrilhaPaginacaoService);
    c.trilha = svc.construir([new Pagina('A','#111',0), new Pagina('A','#111',1), new Pagina('A','#111',2)]);
    c.irPara(5); expect(c.indice).toBe(2);
    c.irPara(-3); expect(c.indice).toBe(0);
  });
});
