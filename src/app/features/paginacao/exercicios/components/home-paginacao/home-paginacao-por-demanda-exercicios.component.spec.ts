import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HomePaginacaoPorDemandaExerciciosComponent } from './home-paginacao-por-demanda-exercicios.component';

describe('HomePaginacaoPorDemandaExercicios', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [HomePaginacaoPorDemandaExerciciosComponent, NoopAnimationsModule],
  }));

  it('deve criar e começar sem exercício gerado', () => {
    const f = TestBed.createComponent(HomePaginacaoPorDemandaExerciciosComponent);
    f.detectChanges();
    expect(f.componentInstance.ex.gerado()).toBeFalse();
  });

  it('gerar() cria processos e mostra as memórias', () => {
    const f = TestBed.createComponent(HomePaginacaoPorDemandaExerciciosComponent);
    f.componentInstance.ex.gerar();
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.textContent).toContain('Memória física');
    expect(el.textContent).toContain('Tabela de páginas');
  });
});
