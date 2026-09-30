import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaExercicioSegmentacaoComponent } from './area-exercicio-segmentacao.component';

describe('AreaExercicioSegmentacaoComponent', () => {
  let component: AreaExercicioSegmentacaoComponent;
  let fixture: ComponentFixture<AreaExercicioSegmentacaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [AreaExercicioSegmentacaoComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(AreaExercicioSegmentacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
