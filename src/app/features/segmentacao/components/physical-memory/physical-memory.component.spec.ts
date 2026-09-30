import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalMemoryComponent } from './physical-memory.component';

describe('PhysicalMemoryComponent', () => {
  let component: PhysicalMemoryComponent;
  let fixture: ComponentFixture<PhysicalMemoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PhysicalMemoryComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalMemoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
