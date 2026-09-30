import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HomeProjectComponent } from './home-project.component';

describe('HomeProjectComponent', () => {
  let component: HomeProjectComponent;
  let fixture: ComponentFixture<HomeProjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeProjectComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
