import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeExercicioDeSegmentacaoComponent } from './home-exercicio-de-segmentacao.component';

describe('HomeExercicioDeSegmentacaoComponent', () => {
  let component: HomeExercicioDeSegmentacaoComponent;
  let fixture: ComponentFixture<HomeExercicioDeSegmentacaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [HomeExercicioDeSegmentacaoComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(HomeExercicioDeSegmentacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});