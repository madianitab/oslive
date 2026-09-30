import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AreaSimulacaoComponent } from './area-simulacao.component';

describe('AreaSimulacaoComponent', () => {
  let component: AreaSimulacaoComponent;
  let fixture: ComponentFixture<AreaSimulacaoComponent>;

  beforeEach(async () => {
    (window as any)['google'] = {
      charts: { load: jasmine.createSpy(), setOnLoadCallback: jasmine.createSpy() },
      visualization: { DataTable: jasmine.createSpy() },
    };

    await TestBed.configureTestingModule({
      imports: [AreaSimulacaoComponent, NoopAnimationsModule, MatSnackBarModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaSimulacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
