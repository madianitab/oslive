import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomePaginacaoPorDemandaExerciciosComponent } from './home-paginacao-por-demanda-exercicios.component';

describe('HomePaginacaoPorDemandaExerciciosComponent', () => {
  let component: HomePaginacaoPorDemandaExerciciosComponent;
  let fixture: ComponentFixture<HomePaginacaoPorDemandaExerciciosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [HomePaginacaoPorDemandaExerciciosComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(HomePaginacaoPorDemandaExerciciosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
