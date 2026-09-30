import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LateralEscalonamentoComponent } from './lateral-escalonamento.component';

describe('LateralEscalonamentoComponent', () => {
  let component: LateralEscalonamentoComponent;
  let fixture: ComponentFixture<LateralEscalonamentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [FormsModule, MatSnackBarModule, NoopAnimationsModule, LateralEscalonamentoComponent],
}).compileComponents();

    fixture = TestBed.createComponent(LateralEscalonamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
