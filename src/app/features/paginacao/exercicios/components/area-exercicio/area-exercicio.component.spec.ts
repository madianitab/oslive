import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaExercicioComponent } from './area-exercicio.component';

describe('AreaExercicioComponent', () => {
  let component: AreaExercicioComponent;
  let fixture: ComponentFixture<AreaExercicioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [AreaExercicioComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(AreaExercicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
