import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HomeEscalonamentoComponent } from './home-escalonamento.component';

describe('HomeEscalonamentoComponent', () => {
  let component: HomeEscalonamentoComponent;
  let fixture: ComponentFixture<HomeEscalonamentoComponent>;

  beforeEach(async () => {
    // Google Charts não está disponível em ambiente de teste — mock global
    (window as any)['google'] = {
      charts: { load: jasmine.createSpy(), setOnLoadCallback: jasmine.createSpy() },
      visualization: { DataTable: jasmine.createSpy() },
    };

    await TestBed.configureTestingModule({
      imports: [HomeEscalonamentoComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeEscalonamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
