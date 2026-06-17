import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { ReconciliationApiService } from './core/reconciliation-api.service';

describe('AppComponent', () => {
  const apiMock = {
    listRuns: () => of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 30 }),
    getAllGlobalResults: () => of([]),
    getDashboardSummary: () => of(undefined),
    getDashboardAmounts: () => of(undefined),
    getDashboardDistribution: () => of([]),
    getDashboardTimeline: () => of([]),
    getDashboardDataQuality: () => of(undefined),
    getDashboardTopAnomalies: () => of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 }),
    getDailyCompensation: () => of([])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: ReconciliationApiService, useValue: apiMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should start on the home screen', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.showHome).toBeTrue();
    expect(app.selectedOperator).toBe('MOOV');
  });

  it('should render the home title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Rapprochement BSIC');
  });
});
