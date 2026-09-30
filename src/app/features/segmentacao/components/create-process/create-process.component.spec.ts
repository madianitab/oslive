import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateProcessComponent } from './create-process.component';
import { SegmentacaoService } from '../../services/segmentacao.service';

describe('CreateProcessComponent', () => {
  let component: CreateProcessComponent;
  let fixture: ComponentFixture<CreateProcessComponent>;
  let service: SegmentacaoService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateProcessComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateProcessComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(SegmentacaoService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com estado de memória limpo', () => {
    expect(component.state().tabelaLacunas).toEqual([[0, 31, 32]]);
    expect(component.processes().length).toBe(0);
  });

  it('deve iniciar com formulário vazio', () => {
    expect(component.processName()).toBe('');
    expect(component.checkboxChecked()).toBeFalse();
  });

  describe('submitProcess', () => {
    it('deve alocar processo com dados válidos', async () => {
      component.processName.set('A');
      component.codeNumber.set(2);
      component.dataNumber.set(2);
      component.stackNumber.set(2);

      await component.submitProcess();

      expect(component.processes().length).toBe(1);
      expect(component.processes()[0].name).toBe('A');
    });

    it('deve limpar o formulário após alocar com sucesso', async () => {
      component.processName.set('B');
      component.codeNumber.set(1);
      component.dataNumber.set(1);
      component.stackNumber.set(1);

      await component.submitProcess();

      expect(component.processName()).toBe('');
    });

    it('deve mostrar popup quando processo já existe', async () => {
      component.processName.set('A');
      component.codeNumber.set(1);
      component.dataNumber.set(1);
      component.stackNumber.set(1);
      await component.submitProcess();

      component.processName.set('A');
      component.codeNumber.set(1);
      component.dataNumber.set(1);
      component.stackNumber.set(1);
      await component.submitProcess();

      expect(component.processes().length).toBe(1);
      expect(component.popTitle()).toContain('Já existe');
    });

    it('deve mostrar popup quando input é inválido', async () => {
      component.processName.set('');
      component.codeNumber.set(NaN);
      component.dataNumber.set(NaN);
      component.stackNumber.set(NaN);

      await component.submitProcess();

      expect(component.processes().length).toBe(0);
      expect(component.popTitle()).toContain('Preencha');
    });
  });

  describe('removeProcess', () => {
    it('deve remover processo e liberar memória', async () => {
      component.processName.set('A');
      component.codeNumber.set(1);
      component.dataNumber.set(1);
      component.stackNumber.set(1);
      await component.submitProcess();

      const lacunaAntes = component.state().tabelaLacunas.reduce((s, l) => s + l[2], 0);
      component.removeProcess(0);

      expect(component.processes().length).toBe(0);
      const lacunaDepois = component.state().tabelaLacunas.reduce((s, l) => s + l[2], 0);
      expect(lacunaDepois).toBeGreaterThan(lacunaAntes);
    });
  });

  describe('randonNumbers', () => {
    it('deve preencher campos quando checkbox está marcado', () => {
      component.checkboxChecked.set(true);
      component.randonNumbers();

      expect(component.processName()).not.toBe('');
      expect(component.codeNumber()).toBeGreaterThan(0);
    });

    it('deve limpar campos quando checkbox está desmarcado', () => {
      component.processName.set('X');
      component.codeNumber.set(3);
      component.checkboxChecked.set(false);
      component.randonNumbers();

      expect(component.processName()).toBe('');
    });
  });
});
