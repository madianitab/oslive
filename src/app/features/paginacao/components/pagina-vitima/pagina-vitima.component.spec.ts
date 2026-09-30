import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginaVitimaComponent } from './pagina-vitima.component';

describe('PaginaVitimaComponent', () => {
  let component: PaginaVitimaComponent;
  let fixture: ComponentFixture<PaginaVitimaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PaginaVitimaComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PaginaVitimaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
