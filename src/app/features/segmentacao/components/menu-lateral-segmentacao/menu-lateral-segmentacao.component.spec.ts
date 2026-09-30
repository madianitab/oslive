import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuLateralSegmentacaoComponent } from './menu-lateral-segmentacao.component';

describe('MenuLateralSegmentacaoComponent', () => {
  let component: MenuLateralSegmentacaoComponent;
  let fixture: ComponentFixture<MenuLateralSegmentacaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [MenuLateralSegmentacaoComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(MenuLateralSegmentacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
