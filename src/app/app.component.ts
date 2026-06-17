import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ReconciliationApiService } from './core/reconciliation-api.service';
import {
  BankTransaction,
  DashboardAmounts,
  DashboardResultTypeView,
  DashboardSummary,
  DashboardTimelinePoint,
  DataQuality,
  DataRetentionMode,
  ReportingPeriodType,
  ReportingTransactionDetail,
  ReportingSummary,
  MoovTransaction,
  OrangeTransaction,
  ResultDistribution,
  CompensationDaily, CompensationPeriodResponse, CompensationDiscrepancy,
  AccountingCheckRow,
  AccountingKpi,
  AmplitudeCleanupResult,
  ReconciliationResult,
  ReconciliationResultType,
  ReconciliationRun,
  ReconciliationSummary,
  RetentionExecution
} from './core/models';

type OperatorType = 'MOOV' | 'ORANGE';
type ImportSourceType = 'BANQUE' | 'MOOV' | 'ORANGE' | 'AMPLITUDE';
type KpiTone = 'kpi-soft-green' | 'kpi-soft-yellow' | 'kpi-soft-orange' | 'kpi-soft-red';

interface KpiTile {
  label: string;
  value: string | number;
  tone: KpiTone;
  hint?: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  showHome = true;
  @ViewChild('bankFileInput') bankFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('moovFileInput') moovFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('orangeFileInput') orangeFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('amplitudeFileInput') amplitudeFileInput?: ElementRef<HTMLInputElement>;

  selectedOperator: OperatorType = 'MOOV';
  activePage: 'DASHBOARD' | 'RECONCILIATION' | 'COMPENSATION' | 'ACCOUNTING' = 'DASHBOARD';
  businessDate = new Date().toISOString().slice(0, 10);
  dateFrom = '';
  dateTo = '';
  singleDay = '';
  periodMode: 'RANGE' | 'SINGLE_DAY' = 'RANGE';
  selectedPreset: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_3_MONTHS' | null = null;
  runLabel = `RUN-${new Date().toISOString().slice(0, 10)}`;
  selectedFilter: ReconciliationResultType | 'ALL' = 'ALL';
  operationFilter: 'ALL' | 'BANK_TO_WALLET' | 'WALLET_TO_BANK' = 'ALL';
  operationDateMode: 'SINGLE' | 'RANGE' = 'SINGLE';
  operationDateFilter = '';
  operationDateFrom = '';
  operationDateTo = '';
  transactionKeyFilter = '';
  phoneFilter = '';
  accountNumberFilter = '';
  retentionMode: DataRetentionMode = 'ARCHIVE_AND_PURGE';
  retentionKeepDays = 180;
  retentionCutoffDate = '';
  retentionUseCutoffDate = false;
  retentionResult?: RetentionExecution;
  cleanupSourceType: ImportSourceType = 'ORANGE';
  cleanupBusinessDate = new Date().toISOString().slice(0, 10);
  cleanupPreview?: { sourceType: string; businessDate: string; candidateImports: number; candidateTransactions: number; impactedResults: number; impactedRuns: number };

  bankFiles: Partial<Record<OperatorType, File>> = {};
  moovFile?: File;
  orangeFile?: File;
  amplitudeFile?: File;
  accountingDateFrom = new Date().toISOString().slice(0, 10);
  accountingDateTo = new Date().toISOString().slice(0, 10);
  accountingOperator: OperatorType = 'MOOV';
  accountingMode: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'RANGE' = 'DAILY';
  accountingDate = new Date().toISOString().slice(0, 10);
  accountingWeekReferenceDate = new Date().toISOString().slice(0, 10);
  accountingMonth = new Date().getMonth() + 1;
  accountingRows: AccountingCheckRow[] = [];
  accountingStatusFilter: 'ALL' | 'COMPTABILISE' | 'NON_COMPTABILISE' | 'A_RISQUE' = 'ALL';
  accountingSearchPhone = '';
  accountingSearchAccount = '';
  accountingSearchReference = '';
  accountingSearchTransactionId = '';
  accountingKpi?: AccountingKpi;
  amplitudeCleanupMode: 'ALL' | 'DAILY' | 'WEEKLY' | 'RANGE' = 'DAILY';
  amplitudeCleanupDate = new Date().toISOString().slice(0, 10);
  amplitudeCleanupWeekReferenceDate = new Date().toISOString().slice(0, 10);
  amplitudeCleanupDateFrom = new Date().toISOString().slice(0, 10);
  amplitudeCleanupDateTo = new Date().toISOString().slice(0, 10);
  amplitudeCleanupResult?: AmplitudeCleanupResult;

  loading = false;
  message = '';
  error = '';
  dialogOpen = false;
  dialogTitle = '';
  dialogMessage = '';
  dialogKind: 'success' | 'error' | 'info' = 'info';
  uploadDialogOpen = false;
  uploadDialogMode: 'RECONCILIATION' | 'ACCOUNTING' = 'RECONCILIATION';
  appliedPeriodMode: 'RANGE' | 'SINGLE_DAY' = 'RANGE';
  appliedDateFrom = '';
  appliedDateTo = '';
  appliedSingleDay = '';

  runs: ReconciliationRun[] = [];
  selectedRun?: ReconciliationRun;
  summary?: ReconciliationSummary;
  dashboardSummary?: DashboardSummary;
  dashboardAmounts?: DashboardAmounts;
  dashboardDistribution: ResultDistribution[] = [];
  reportingPeriodType: ReportingPeriodType | '' = '';
  reportingReferenceDate = '';
  reportingSummary?: ReportingSummary;
  reportingLoading = false;
  selectedReportingResultType: DashboardResultTypeView | 'ALL' = 'ALL';
  dashboardTimeline: DashboardTimelinePoint[] = [];
  dashboardDataQuality?: DataQuality;
  dashboardTopAnomalies: Array<{
    transactionKey: string;
    businessDate: string;
    resultType: string;
    bankStatusRaw?: string | null;
    operatorStatusRaw?: string | null;
    bankAmount?: number | null;
    operatorAmount?: number | null;
    amountDifference?: number | null;
    reason?: string | null;
  }> = [];
  compensationRows: CompensationDaily[] = [];
  compensationDiscrepancies: CompensationDiscrepancy[] = [];
  compensationRiskFilter: 'ALL' | 'ABSENT_OPERATEUR' | 'ABSENT_BANQUE' | 'ECHEC_DEUX_COTES' = 'ALL';
  compensationPeriod?: CompensationPeriodResponse;
  compensationMode: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY';
  compensationDateMode: 'SINGLE' | 'RANGE' = 'SINGLE';
  compensationDate = '';
  compensationDateFrom = '';
  compensationDateTo = '';
  compensationWeekFrom = '';
  compensationWeekTo = '';
  compensationWeekReferenceDate = '';
  compensationMonth = new Date().getMonth() + 1;
  allResults: ReconciliationResult[] = [];
  currentPage = 1;
  readonly pageSize = 20;
  private summaryRequestVersion = 0;

  bankTxById = new Map<number, BankTransaction>();
  moovTxById = new Map<number, MoovTransaction>();
  orangeTxById = new Map<number, OrangeTransaction>();

  readonly filterOptions: Array<ReconciliationResultType | 'ALL'> = [
    'ALL',
    'MATCH_OK',
    'ECHEC_DES_DEUX_COTES',
    'DEBIT_A_TORT',
    'CREDIT_SANS_DEBIT',
    'ABSENT_COTE_BANQUE',
    'ABSENT_COTE_MOOV',
    'ABSENT_COTE_ORANGE',
    'MONTANT_DIFFERENT',
    'DOUBLON_BANQUE',
    'DOUBLON_MOOV',
    'STATUT_INCONNU'
  ];

  readonly operationOptions: Array<'ALL' | 'BANK_TO_WALLET' | 'WALLET_TO_BANK'> = ['ALL', 'BANK_TO_WALLET', 'WALLET_TO_BANK'];
  readonly operationOptionLabels: Record<'ALL' | 'BANK_TO_WALLET' | 'WALLET_TO_BANK', string> = {
    ALL: 'Toutes',
    BANK_TO_WALLET: 'Banque vers wallet',
    WALLET_TO_BANK: 'Wallet vers banque'
  };

  quickFilters: Array<{ label: string; type: ReconciliationResultType | 'ALL'; className: string; count: () => number }> = [];

  constructor(private readonly api: ReconciliationApiService, private readonly router: Router) {}

  ngOnInit(): void {
    this.applyPathState(this.router.url);
    this.quickFilters = [
      { label: 'Global', type: 'ALL', className: 'q-neutral', count: () => this.totalResults },
      { label: 'Debit a tort', type: 'DEBIT_A_TORT', className: 'q-danger', count: () => this.summary?.totalDebitATort ?? 0 },
      { label: 'Credit sans debit', type: 'CREDIT_SANS_DEBIT', className: 'q-info', count: () => this.summary?.totalCreditSansDebit ?? 0 },
      { label: 'Echec 2 cotes', type: 'ECHEC_DES_DEUX_COTES', className: 'q-danger', count: () => this.summary?.totalEchecDesDeuxCotes ?? 0 },
      { label: 'Doublons', type: 'DOUBLON_BANQUE', className: 'q-warning', count: () => this.summary?.totalDoublons ?? 0 }
    ];
    this.loadRuns();
    this.loadSummaryAndResults();
    this.loadDashboardData();
  }

  setOperator(operator: OperatorType): void {
    this.selectedOperator = operator;
    this.selectedRun = undefined;
    if (this.cleanupSourceType !== 'BANQUE') {
      this.cleanupSourceType = operator;
    }
    this.selectedFilter = 'ALL';
    this.operationFilter = 'ALL';
    this.currentPage = 1;
    this.loadRuns();
    this.rebuildSummary();
    this.loadDashboardData();
    this.loadReportingSummary();
  }

  setPage(page: 'DASHBOARD' | 'RECONCILIATION' | 'COMPENSATION' | 'ACCOUNTING'): void {
    this.activePage = page;
    this.pushPath(page === 'DASHBOARD' ? '/dashboard' : page === 'RECONCILIATION' ? '/reconciliation' : page === 'COMPENSATION' ? '/compensation' : '/accounting');
    if (page === 'DASHBOARD') {
      this.loadDashboardData();
      this.loadReportingSummary();
    }
    if (page === 'COMPENSATION') {
      this.compensationRows = [];
      this.compensationPeriod = undefined;
    }
    if (page === 'ACCOUNTING') {
      this.loadAccountingCheck();
    }
  }

  enterOperator(operator: OperatorType): void {
    this.selectedOperator = operator;
    this.showHome = false;
    this.activePage = 'RECONCILIATION';
    this.pushPath('/reconciliation');
    this.setOperator(operator);
  }

  enterAccounting(): void {
    this.showHome = false;
    this.activePage = 'ACCOUNTING';
    this.pushPath('/accounting');
    this.loadAccountingCheck();
  }

  backToHome(): void {
    this.showHome = true;
    this.pushPath('/home');
  }

  private applyPathState(pathname: string): void {
    const path = (pathname || '/').toLowerCase();
    if (path.endsWith('/dashboard')) {
      this.showHome = false;
      this.activePage = 'DASHBOARD';
      return;
    }
    if (path.endsWith('/reconciliation')) {
      this.showHome = false;
      this.activePage = 'RECONCILIATION';
      return;
    }
    if (path.endsWith('/compensation')) {
      this.showHome = false;
      this.activePage = 'COMPENSATION';
      return;
    }
    if (path.endsWith('/accounting')) {
      this.showHome = false;
      this.activePage = 'ACCOUNTING';
      return;
    }
    this.showHome = true;
  }

  private pushPath(path: '/home' | '/dashboard' | '/reconciliation' | '/compensation' | '/accounting'): void {
    if (this.router.url === path) {
      return;
    }
    this.router.navigateByUrl(path);
  }

  onBankFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0];
    if (!selectedFile) {
      delete this.bankFiles[this.selectedOperator];
      return;
    }
    this.bankFiles[this.selectedOperator] = selectedFile;
  }

  onMoovFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.moovFile = input.files?.[0];
  }

  onOrangeFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.orangeFile = input.files?.[0];
  }
  onAmplitudeFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.amplitudeFile = input.files?.[0];
  }

  importBankOnly(): void {
    const bankFile = this.bankFiles[this.selectedOperator];
    if (!bankFile) {
      this.error = 'Veuillez choisir le fichier Banque.';
      this.openDialog('error', 'Validation', this.error);
      return;
    }
    this.error = '';
    this.message = '';
    this.loading = true;
    this.api.importBank(bankFile, this.businessDate, this.selectedOperator).subscribe({
      next: (bankImport) => {
        const scope = bankImport.operatorScope || this.selectedOperator;
        this.message = `Fichier Banque (${scope}) uploade avec succes. Import #${bankImport.id} (${bankImport.validRows}/${bankImport.totalRows}).`;
        delete this.bankFiles[this.selectedOperator];
        this.clearBankFileInput();
        this.uploadDialogOpen = false;
        this.openDialog('success', 'Import Banque termine', this.message);
        this.loading = false;
        this.loadRuns();
        this.loadSummaryAndResults();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Echec import du fichier Banque.';
        this.openDialog('error', 'Echec import Banque', this.error);
        this.loading = false;
      }
    });
  }

  importSelectedOperator(): void {
    if (this.selectedOperator === 'MOOV') {
      this.importMoovOnly();
      return;
    }
    this.uploadOrange();
  }

  importMoovOnly(): void {
    if (!this.moovFile) {
      this.error = 'Veuillez choisir le fichier Moov.';
      this.openDialog('error', 'Validation', this.error);
      return;
    }
    this.error = '';
    this.message = '';
    this.loading = true;
    this.api.importMoov(this.moovFile, this.businessDate).subscribe({
      next: (moovImport) => {
        this.message = `Fichier Moov uploade avec succes. Import #${moovImport.id} (${moovImport.validRows}/${moovImport.totalRows}).`;
        this.moovFile = undefined;
        this.clearMoovFileInput();
        this.uploadDialogOpen = false;
        this.openDialog('success', 'Import Moov termine', this.message);
        this.loading = false;
        this.loadRuns();
        this.loadSummaryAndResults();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Echec import du fichier Moov.';
        this.openDialog('error', 'Echec import Moov', this.error);
        this.loading = false;
      }
    });
  }

  uploadOrange(): void {
    if (!this.orangeFile) {
      this.error = 'Veuillez choisir le fichier Orange.';
      this.openDialog('error', 'Validation', this.error);
      return;
    }
    this.error = '';
    this.message = '';
    this.loading = true;
    this.api.importOrange(this.orangeFile, this.businessDate).subscribe({
      next: (orangeImport) => {
        this.message = `Fichier Orange uploade avec succes. Import #${orangeImport.id} (${orangeImport.validRows}/${orangeImport.totalRows}).`;
        this.orangeFile = undefined;
        this.clearOrangeFileInput();
        this.uploadDialogOpen = false;
        this.openDialog('success', 'Import Orange termine', this.message);
        this.loading = false;
        this.loadRuns();
        this.loadSummaryAndResults();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Echec import du fichier Orange.';
        this.openDialog('error', 'Echec import Orange', this.error);
        this.loading = false;
      }
    });
  }

  importAmplitudeOnly(): void {
    if (!this.amplitudeFile) {
      this.error = 'Veuillez choisir le fichier AMPLITUDE.';
      this.openDialog('error', 'Validation', this.error);
      return;
    }
    this.loading = true;
    this.api.importAmplitude(this.amplitudeFile, this.businessDate).subscribe({
      next: (amplitudeImport) => {
        this.message = `Fichier AMPLITUDE uploade avec succes. Import #${amplitudeImport.id} (${amplitudeImport.validRows}/${amplitudeImport.totalRows}).`;
        this.amplitudeFile = undefined;
        if (this.amplitudeFileInput?.nativeElement) this.amplitudeFileInput.nativeElement.value = '';
        this.uploadDialogOpen = false;
        this.openDialog('success', 'Import AMPLITUDE termine', this.message);
        this.loading = false;
        this.loadAccountingCheck();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Echec import du fichier AMPLITUDE.';
        this.openDialog('error', 'Echec import AMPLITUDE', this.error);
        this.loading = false;
      }
    });
  }

  loadAccountingCheck(): void {
    const range = this.resolveAccountingRange();
    if (!range) return;
    this.accountingDateFrom = range.from;
    this.accountingDateTo = range.to;
    this.api.getAccountingCheck(range.from, range.to, this.accountingOperator).subscribe({
      next: (rows) => this.accountingRows = rows ?? [],
      error: () => this.accountingRows = []
    });
    this.api.getAccountingKpi(range.from, range.to, this.accountingOperator).subscribe({
      next: (kpi) => this.accountingKpi = kpi,
      error: () => this.accountingKpi = undefined
    });
  }

  runAmplitudeCleanup(): void {
    this.error = '';
    this.message = '';
    this.loading = true;
    this.amplitudeCleanupResult = undefined;

    let request$;
    if (this.amplitudeCleanupMode === 'ALL') {
      request$ = this.api.cleanupAmplitudeAll();
    } else if (this.amplitudeCleanupMode === 'DAILY') {
      if (!this.amplitudeCleanupDate) {
        this.loading = false;
        this.openDialog('error', 'Validation', 'Veuillez renseigner la date journaliere.');
        return;
      }
      request$ = this.api.cleanupAmplitudeDaily(this.amplitudeCleanupDate);
    } else if (this.amplitudeCleanupMode === 'WEEKLY') {
      if (!this.amplitudeCleanupWeekReferenceDate) {
        this.loading = false;
        this.openDialog('error', 'Validation', 'Veuillez renseigner la date de reference hebdomadaire.');
        return;
      }
      request$ = this.api.cleanupAmplitudeWeekly(this.amplitudeCleanupWeekReferenceDate);
    } else {
      if (!this.amplitudeCleanupDateFrom || !this.amplitudeCleanupDateTo) {
        this.loading = false;
        this.openDialog('error', 'Validation', 'Veuillez renseigner les dates de debut et fin.');
        return;
      }
      request$ = this.api.cleanupAmplitudeRange(this.amplitudeCleanupDateFrom, this.amplitudeCleanupDateTo);
    }

    request$.subscribe({
      next: (result) => {
        this.amplitudeCleanupResult = result;
        this.message = `Suppression AMPLITUDE terminee: imports=${result.deletedImports}, transactions=${result.deletedTransactions}.`;
        this.openDialog('success', 'Nettoyage AMPLITUDE', this.message);
        this.loading = false;
        this.loadAccountingCheck();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Echec du nettoyage AMPLITUDE.';
        this.openDialog('error', 'Echec nettoyage AMPLITUDE', this.error);
        this.loading = false;
      }
    });
  }

  exportAccountingKpiCsv(): void {
    const range = this.resolveAccountingRange();
    if (!range) return;
    this.api.exportAccountingKpiCsv(range.from, range.to, this.accountingOperator).subscribe({
      next: (blob) => this.downloadBlob(blob, `accounting-kpi-${this.accountingOperator.toLowerCase()}-${range.from}-${range.to}.csv`),
      error: () => (this.error = 'Echec export CSV KPI comptabilisation.')
    });
  }

  exportAccountingKpiPdf(): void {
    const range = this.resolveAccountingRange();
    if (!range) return;
    this.api.exportAccountingKpiPdf(range.from, range.to, this.accountingOperator).subscribe({
      next: (blob) => this.downloadBlob(blob, `accounting-kpi-${this.accountingOperator.toLowerCase()}-${range.from}-${range.to}.pdf`),
      error: () => (this.error = 'Echec export PDF KPI comptabilisation.')
    });
  }

  private resolveAccountingRange(): { from: string; to: string } | null {
    if (this.accountingMode === 'DAILY') {
      if (!this.accountingDate) return null;
      return { from: this.accountingDate, to: this.accountingDate };
    }
    if (this.accountingMode === 'WEEKLY') {
      if (!this.accountingWeekReferenceDate) return null;
      const d = new Date(this.accountingWeekReferenceDate + 'T00:00:00');
      const day = d.getDay();
      const mondayOffset = (day + 6) % 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        from: monday.toISOString().slice(0, 10),
        to: sunday.toISOString().slice(0, 10)
      };
    }
    if (this.accountingMode === 'RANGE') {
      if (!this.accountingDateFrom || !this.accountingDateTo) return null;
      return { from: this.accountingDateFrom, to: this.accountingDateTo };
    }
    const year = new Date().getFullYear();
    const first = new Date(year, this.accountingMonth - 1, 1);
    const last = new Date(year, this.accountingMonth, 0);
    return {
      from: first.toISOString().slice(0, 10),
      to: last.toISOString().slice(0, 10)
    };
  }

  get comptabiliseCount(): number {
    return this.accountingRows.filter(r => r.status === 'COMPTABILISE').length;
  }

  get nonComptabiliseCount(): number {
    return this.accountingRows.filter(r => r.status === 'NON_COMPTABILISE').length;
  }

  get accountingRiskCount(): number {
    return this.accountingRows.filter((r) => this.isAccountingRisk(r)).length;
  }

  get filteredAccountingRows(): AccountingCheckRow[] {
    const phone = this.accountingSearchPhone.trim().toLowerCase();
    const account = this.accountingSearchAccount.trim().toLowerCase();
    const ref = this.accountingSearchReference.trim().toLowerCase();
    const txId = this.accountingSearchTransactionId.trim().toLowerCase();

    return this.accountingRows
      .filter((r) => {
        if (this.accountingStatusFilter === 'COMPTABILISE') return r.status === 'COMPTABILISE';
        if (this.accountingStatusFilter === 'NON_COMPTABILISE') return r.status === 'NON_COMPTABILISE';
        if (this.accountingStatusFilter === 'A_RISQUE') return this.isAccountingRisk(r);
        return true;
      })
      .filter((r) => !phone || (r.phoneNumber || '').toLowerCase().includes(phone))
      .filter((r) => !account || (r.accountNumber || '').toLowerCase().includes(account))
      .filter((r) => !ref || (r.operationReference || '').toLowerCase().includes(ref))
      .filter((r) => !txId || (r.transactionId || '').toLowerCase().includes(txId));
  }

  private isAccountingRisk(row: AccountingCheckRow): boolean {
    if (row.status === 'NON_COMPTABILISE') return true;
    if (row.amount == null || row.amplitudeCredit == null) return false;
    return Number(row.amount) !== Number(row.amplitudeCredit);
  }

  statusIcon(value: string | null | undefined): string {
    const key = this.normalizeStatusKey(value);
    if (!key || key === '-') return '-';
    if (key.includes('MATCH') || (key.includes('COMPTABILISE') && !key.includes('NON')) || key.includes('OK_COMPENSATION')) return '✓';
    if (key.includes('INCONNU') || key.includes('UNKNOWN')) return '?';
    if (key.includes('DOUBLON') || key.includes('DIFFERENT') || key.includes('RISQUE')) return '!';
    if (key.includes('NON_COMPTABILISE') || key.includes('DEBIT') || key.includes('CREDIT') || key.includes('ABSENT') || key.includes('ECHEC') || key.includes('REJET') || key.includes('FAILED') || key.includes('A_VERIFIER')) return '!';
    return '•';
  }

  statusLabel(value: string | null | undefined): string {
    const key = this.normalizeStatusKey(value);
    const labels: Record<string, string> = {
      MATCH_OK: 'Match',
      COMPTABILISE: 'Comptabilise',
      NON_COMPTABILISE: 'Non comptabilise',
      DEBIT_A_TORT: 'Debit a tort',
      CREDIT_SANS_DEBIT: 'Credit sans debit',
      ECHEC_DES_DEUX_COTES: 'Echec 2 cotes',
      ABSENT_COTE_MOOV: 'Absent Moov',
      ABSENT_COTE_ORANGE: 'Absent Orange',
      ABSENT_COTE_OPERATEUR: 'Absent operateur',
      ABSENT_COTE_BANQUE: 'Absent Banque',
      MONTANT_DIFFERENT: 'Montant different',
      DOUBLON_BANQUE: 'Doublon Banque',
      DOUBLON_MOOV: 'Doublon operateur',
      STATUT_INCONNU: 'Statut inconnu',
      OK_COMPENSATION: 'OK',
      A_VERIFIER: 'A verifier'
    };
    return labels[key] || this.cleanStatusText(value);
  }

  statusClass(value: string | null | undefined): string {
    const key = this.normalizeStatusKey(value);
    if (key.includes('MATCH') || key === 'COMPTABILISE' || key === 'OK_COMPENSATION' || key.includes('ALLOUE') || key.includes('COMPLETED') || key === 'TS') return 'ok';
    if (key.includes('INCONNU') || key.includes('UNKNOWN')) return 'unknown';
    if (key.includes('DOUBLON') || key.includes('DIFFERENT') || key.includes('RISQUE')) return 'warn';
    if (key.includes('NON_COMPTABILISE') || key.includes('DEBIT') || key.includes('CREDIT') || key.includes('ABSENT') || key.includes('ECHEC') || key.includes('REJET') || key.includes('FAILED') || key.includes('CANCELLED') || key === 'TF' || key === 'A_VERIFIER') return 'ko';
    return 'neutral';
  }

  private normalizeStatusKey(value: string | null | undefined): string {
    return this.cleanStatusText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
      .toUpperCase();
  }

  private cleanStatusText(value: string | null | undefined): string {
    const text = String(value ?? '').trim();
    return text || '-';
  }

  runRetention(): void {
    this.error = '';
    this.message = '';
    this.loading = true;
    this.retentionResult = undefined;

    const keepDays = this.retentionUseCutoffDate ? null : this.retentionKeepDays;
    const cutoffDate = this.retentionUseCutoffDate ? this.retentionCutoffDate : null;
    this.api.runRetention(this.retentionMode, cutoffDate, keepDays).subscribe({
      next: (result) => {
        this.retentionResult = result;
        this.message = `Retention executee. Purges: ${result.purgedResults} resultats, ${result.purgedRuns} runs.`;
        this.loading = false;
        this.loadRuns();
        this.loadSummaryAndResults();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Echec execution retention.';
        this.loading = false;
      }
    });
  }

  cleanupImportsByDate(): void {
    if (!this.cleanupBusinessDate) {
      this.error = 'Veuillez renseigner la date de nettoyage.';
      this.openDialog('error', 'Validation', this.error);
      return;
    }
    this.error = '';
    this.message = '';
    this.loading = true;
    const cleanupOperator = this.cleanupSourceType === 'BANQUE' ? this.selectedOperator : null;
    this.api.deleteImportsBySourceAndDate(this.cleanupSourceType, this.cleanupBusinessDate, cleanupOperator).subscribe({
      next: (result) => {
        this.message = `Nettoyage termine: ${result.sourceType} ${result.businessDate} -> imports=${result.deletedImports}, transactions=${result.deletedTransactions}, runs=${result.deletedRuns}, resultats=${result.deletedResults}.`;
        this.cleanupPreview = undefined;
        this.openDialog('success', 'Nettoyage termine', this.message);
        this.loading = false;
        this.loadRuns();
        this.loadSummaryAndResults();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Echec du nettoyage par date.';
        this.openDialog('error', 'Echec nettoyage', this.error);
        this.loading = false;
      }
    });
  }

  cleanupAllBySource(): void {
    const cleanupOperator = this.cleanupSourceType === 'BANQUE' ? this.selectedOperator : null;
    const scopeLabel = cleanupOperator ? ` (${cleanupOperator})` : '';
    const confirmed = window.confirm(`Confirmer la suppression totale de ${this.cleanupSourceType}${scopeLabel} ?`);
    if (!confirmed) {
      return;
    }

    this.error = '';
    this.message = '';
    this.loading = true;
    this.api.deleteAllImportsBySource(this.cleanupSourceType, cleanupOperator).subscribe({
      next: (result) => {
        const opScope = result.operatorScope ? ` ${result.operatorScope}` : '';
        this.message = `Suppression totale terminee: ${result.sourceType}${opScope} -> imports=${result.deletedImports}, transactions=${result.deletedTransactions}, runs=${result.deletedRuns}, resultats=${result.deletedResults}.`;
        this.cleanupPreview = undefined;
        this.openDialog('success', 'Suppression totale terminee', this.message);
        this.loading = false;
        this.loadRuns();
        this.loadSummaryAndResults();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Echec de la suppression totale.';
        this.openDialog('error', 'Echec suppression totale', this.error);
        this.loading = false;
      }
    });
  }

  previewCleanupByDate(): void {
    if (!this.cleanupBusinessDate) {
      this.error = 'Veuillez renseigner la date de nettoyage.';
      this.openDialog('error', 'Validation', this.error);
      return;
    }
    this.error = '';
    this.message = '';
    this.loading = true;
    const cleanupOperator = this.cleanupSourceType === 'BANQUE' ? this.selectedOperator : null;
    this.api.previewDeleteImportsBySourceAndDate(this.cleanupSourceType, this.cleanupBusinessDate, cleanupOperator).subscribe({
      next: (preview) => {
        this.cleanupPreview = preview;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Echec de previsualisation.';
        this.openDialog('error', 'Echec previsualisation', this.error);
        this.loading = false;
      }
    });
  }

  runReconciliation(): void {
    this.error = '';
    this.message = '';
    this.loading = true;
    this.api
      .runReconciliation({
        businessDate: this.businessDate,
        dateFrom: null,
        dateTo: null,
        operator: this.selectedOperator,
        bankImportIds: null,
        moovImportIds: null,
        orangeImportIds: null,
        label: `${this.selectedOperator}-${this.runLabel || `RUN-${this.businessDate}`}`
      })
      .subscribe({
      next: (run) => {
        this.message = `Reconciliation lancee: run #${run.id}`;
        this.uploadDialogOpen = false;
        this.openDialog('success', 'Reconciliation', this.message);
        this.loading = false;
        this.loadRuns(run.id);
      },
        error: (err) => {
          this.error = err?.error?.message || 'Echec lancement de la reconciliation.';
          this.openDialog('error', 'Echec reconciliation', this.error);
          this.loading = false;
        }
      });
  }

  openUploadDialog(mode: 'RECONCILIATION' | 'ACCOUNTING'): void {
    this.uploadDialogMode = mode;
    this.uploadDialogOpen = true;
    this.message = '';
    this.error = '';
  }

  closeUploadDialog(): void {
    if (this.loading) {
      return;
    }
    this.uploadDialogOpen = false;
  }

  closeDialog(): void {
    this.dialogOpen = false;
  }

  loadRuns(selectRunId?: number): void {
    const { from, to, single } = this.activeDateFilters();
    this.api.listRuns(0, 30, this.selectedOperator, from, to, single, this.selectedPreset).subscribe({
      next: (page) => {
        this.runs = page.content;
        this.selectedRun = undefined;
        this.bankTxById.clear();
        this.moovTxById.clear();
        this.orangeTxById.clear();
        this.loadSummaryAndResults();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Impossible de charger les runs.';
      }
    });
  }

  applyKpiFilters(): void {
    this.error = '';
    this.appliedPeriodMode = this.periodMode;
    this.appliedDateFrom = this.dateFrom;
    this.appliedDateTo = this.dateTo;
    this.appliedSingleDay = this.singleDay;
    this.currentPage = 1;
    this.loadRuns();
    this.loadSummaryAndResults();
    this.loadDashboardData();
    this.loadReportingSummary();
  }

  applyPreset(preset: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_3_MONTHS'): void {
    this.selectedPreset = preset;
    this.periodMode = 'RANGE';
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now);
    if (preset === 'LAST_7_DAYS') start.setDate(now.getDate() - 6);
    if (preset === 'LAST_30_DAYS') start.setDate(now.getDate() - 29);
    if (preset === 'LAST_3_MONTHS') start.setMonth(now.getMonth() - 3);
    this.dateFrom = start.toISOString().slice(0, 10);
    this.dateTo = end;
    this.applyKpiFilters();
  }

  resetHistoryFilter(): void {
    this.selectedPreset = null;
    this.periodMode = 'RANGE';
    this.dateFrom = '';
    this.dateTo = '';
    this.singleDay = '';
    this.appliedPeriodMode = 'RANGE';
    this.appliedDateFrom = '';
    this.appliedDateTo = '';
    this.appliedSingleDay = '';
    this.error = '';
    this.currentPage = 1;
    this.loadRuns();
    this.loadSummaryAndResults();
    this.loadDashboardData();
    this.loadReportingSummary();
  }

  loadReportingSummary(): void {
    if (!this.reportingReferenceDate || !this.reportingPeriodType) {
      this.reportingSummary = undefined;
      this.selectedReportingResultType = 'ALL';
      return;
    }
    this.reportingLoading = true;
    this.api.getReportingSummary(this.reportingPeriodType, this.reportingReferenceDate, this.selectedOperator).subscribe({
      next: (data) => {
        this.reportingSummary = data;
        if (this.selectedReportingResultType !== 'ALL' && !data.distribution.some((item) => item.resultType === this.selectedReportingResultType)) {
          this.selectedReportingResultType = 'ALL';
        }
        this.reportingLoading = false;
      },
      error: () => {
        this.reportingSummary = undefined;
        this.selectedReportingResultType = 'ALL';
        this.reportingLoading = false;
      }
    });
  }

  exportReportingExcel(): void {
    if (!this.reportingPeriodType || !this.reportingReferenceDate) {
      return;
    }
    this.api.exportReportingExcel(this.reportingPeriodType, this.reportingReferenceDate, this.selectedOperator).subscribe({
      next: (blob) => this.downloadBlob(blob, this.reportingFileName('xlsx')),
      error: () => (this.error = 'Echec export Excel reporting.')
    });
  }

  exportReportingPdf(): void {
    if (!this.reportingPeriodType || !this.reportingReferenceDate) {
      return;
    }
    this.api.exportReportingPdf(this.reportingPeriodType, this.reportingReferenceDate, this.selectedOperator).subscribe({
      next: (blob) => this.downloadBlob(blob, this.reportingFileName('pdf')),
      error: () => (this.error = 'Echec export PDF reporting.')
    });
  }

  resetReportingFilters(): void {
    this.reportingPeriodType = '';
    this.reportingReferenceDate = '';
    this.reportingSummary = undefined;
    this.selectedReportingResultType = 'ALL';
  }

  selectReportingResultType(type: DashboardResultTypeView): void {
    this.selectedReportingResultType = this.selectedReportingResultType === type ? 'ALL' : type;
  }

  clearReportingResultType(): void {
    this.selectedReportingResultType = 'ALL';
  }

  get filteredReportingTransactionDetails(): ReportingTransactionDetail[] {
    const rows = this.reportingSummary?.transactionDetails ?? [];
    if (this.selectedReportingResultType === 'ALL') {
      return rows;
    }
    return rows.filter((row) => row.resultType === this.selectedReportingResultType);
  }

  get reportingDetailsTitle(): string {
    if (this.selectedReportingResultType === 'ALL') {
      return 'Operations reporting';
    }
    return `Operations ${this.statusLabel(this.selectedReportingResultType)}`;
  }

  get kpiScopeLabel(): string {
    if (this.appliedPeriodMode === 'SINGLE_DAY' && this.appliedSingleDay) return `Jour transaction: ${this.appliedSingleDay}`;
    if (this.appliedPeriodMode === 'RANGE' && this.appliedDateFrom && this.appliedDateTo) return `Periode transaction: ${this.appliedDateFrom} -> ${this.appliedDateTo}`;
    return 'Toutes les donnees';
  }

  get activeOperatorLabel(): string {
    return this.selectedOperator === 'MOOV' ? 'Moov' : 'Orange';
  }

  get accountingOperatorLabel(): string {
    return this.accountingOperator === 'MOOV' ? 'Moov' : 'Orange';
  }

  get selectedBankFileName(): string {
    return this.bankFiles[this.selectedOperator]?.name || '';
  }

  get selectedMoovFileName(): string {
    return this.moovFile?.name || '';
  }

  get selectedOrangeFileName(): string {
    return this.orangeFile?.name || '';
  }

  get selectedOperatorFileName(): string {
    return this.selectedOperator === 'MOOV' ? this.selectedMoovFileName : this.selectedOrangeFileName;
  }

  get counterpartStatusLabel(): string {
    return this.selectedOperator === 'MOOV' ? 'Statut Moov' : 'Statut Orange';
  }

  get counterpartAmountLabel(): string {
    return this.selectedOperator === 'MOOV' ? 'Montant Moov' : 'Montant Orange';
  }

  selectRun(run: ReconciliationRun): void {
    this.selectedRun = run;
    this.loadTransactionsForRun(run);
    this.loadSummaryAndResults();
    this.loadDashboardData();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.rebuildSummary();
  }

  applyQuickFilter(type: ReconciliationResultType | 'ALL'): void {
    this.selectedFilter = type;
    this.currentPage = 1;
    this.rebuildSummary();
  }

  onOperationFiltersChange(): void {
    this.currentPage = 1;
  }

  onTransactionKeyFilterChange(): void {
    this.currentPage = 1;
    this.loadSummaryAndResults();
  }

  onPhoneFilterChange(): void {
    this.currentPage = 1;
    this.loadSummaryAndResults();
  }

  onAccountNumberFilterChange(): void {
    this.currentPage = 1;
    this.loadSummaryAndResults();
  }

  resetResultFilters(): void {
    this.selectedFilter = 'ALL';
    this.operationFilter = 'ALL';
    this.transactionKeyFilter = '';
    this.phoneFilter = '';
    this.accountNumberFilter = '';
    this.operationDateMode = 'SINGLE';
    this.operationDateFilter = '';
    this.operationDateFrom = '';
    this.operationDateTo = '';
    this.currentPage = 1;
    this.loadSummaryAndResults();
  }

  private loadSummaryAndResults(): void {
    const requestVersion = ++this.summaryRequestVersion;
    const { from, to, single } = this.activeDateFilters();
    const results$ = this.api.getAllGlobalResults('ALL', 2000, this.selectedOperator, from, to, single, this.backendResultFilters());
    results$.subscribe({
      next: (rows) => {
        if (requestVersion !== this.summaryRequestVersion) {
          return;
        }
        this.allResults = rows;
        this.hydrateTransactionDetailsForRows(rows);
        this.currentPage = 1;
        this.rebuildSummary();
      },
      error: () => {
        if (requestVersion !== this.summaryRequestVersion) {
          return;
        }
        this.error = 'Impossible de charger les resultats.';
      }
    });
  }

  private backendResultFilters(): {
    transactionKey?: string | null;
    phoneNumber?: string | null;
    accountNumber?: string | null;
  } {
    return {
      transactionKey: this.transactionKeyFilter || null,
      phoneNumber: this.phoneFilter || null,
      accountNumber: this.accountNumberFilter || null
    };
  }

  private hydrateTransactionDetailsForRows(rows: ReconciliationResult[]): void {
    const bankIds = Array.from(
      new Set(rows.map((r) => r.bankTransactionId).filter((id): id is number => !!id && id > 0))
    );
    const counterpartIds = Array.from(
      new Set(rows.map((r) => r.moovTransactionId).filter((id): id is number => !!id && id > 0))
    );

    this.bankTxById.clear();
    this.moovTxById.clear();
    this.orangeTxById.clear();

    const calls: Array<import('rxjs').Observable<unknown[]>> = [];
    const hasBankCall = bankIds.length > 0;
    const hasCounterpartCall = counterpartIds.length > 0;
    const bankCallCount = hasBankCall ? this.chunkIds(bankIds, 200).length : 0;

    if (hasBankCall) {
      for (const chunk of this.chunkIds(bankIds, 200)) {
        calls.push(this.api.getBankTransactionsByIds(chunk));
      }
    }
    if (hasCounterpartCall) {
      const counterpartChunks = this.chunkIds(counterpartIds, 200);
      if (this.selectedOperator === 'MOOV') {
        for (const chunk of counterpartChunks) {
          calls.push(this.api.getMoovTransactionsByIds(chunk));
        }
      } else {
        for (const chunk of counterpartChunks) {
          calls.push(this.api.getOrangeTransactionsByIds(chunk));
        }
      }
    }

    if (!calls.length) {
      return;
    }

    forkJoin(calls).subscribe({
      next: (payloads) => {
        let idx = 0;
        if (hasBankCall) {
          for (let i = 0; i < bankCallCount; i++) {
            const bankPayload = (payloads[idx++] ?? []) as BankTransaction[];
            bankPayload.forEach((tx) => this.bankTxById.set(tx.id, tx));
          }
        }
        if (hasCounterpartCall) {
          const counterpartCallCount = payloads.length - idx;
          for (let i = 0; i < counterpartCallCount; i++) {
            const counterpartPayload = (payloads[idx++] ?? []) as Array<MoovTransaction | OrangeTransaction>;
            if (this.selectedOperator === 'MOOV') {
              (counterpartPayload as MoovTransaction[]).forEach((tx) => this.moovTxById.set(tx.id, tx));
            } else {
              (counterpartPayload as OrangeTransaction[]).forEach((tx) => this.orangeTxById.set(tx.id, tx));
            }
          }
        }
      }
    });
  }

  private chunkIds(ids: number[], size: number): number[][] {
    if (!ids.length) return [];
    const chunks: number[][] = [];
    for (let i = 0; i < ids.length; i += size) {
      chunks.push(ids.slice(i, i + size));
    }
    return chunks;
  }

  private loadTransactionsForRun(run: ReconciliationRun): void {
    const bankImportIds = this.parseIds(run.bankImportIds);
    const moovImportIds = this.parseIds(run.moovImportIds);
    const orangeImportIds = this.parseIds(run.orangeImportIds);
    if (!bankImportIds.length && !moovImportIds.length && !orangeImportIds.length) {
      return;
    }

    const bankCalls = bankImportIds.map((id) => this.api.getBankTransactions(id));
    const moovCalls = moovImportIds.map((id) => this.api.getMoovTransactions(id));
    const orangeCalls = orangeImportIds.map((id) => this.api.getOrangeTransactions(id));

    this.bankTxById.clear();
    this.moovTxById.clear();
    this.orangeTxById.clear();

    forkJoin([...bankCalls, ...moovCalls, ...orangeCalls]).subscribe({
      next: (pages) => {
        const bankPagesCount = bankCalls.length;
        const moovPagesCount = moovCalls.length;
        pages.slice(0, bankPagesCount).forEach((page) => page.content.forEach((tx) => this.bankTxById.set(tx.id, tx as BankTransaction)));
        pages.slice(bankPagesCount, bankPagesCount + moovPagesCount).forEach((page) => page.content.forEach((tx) => this.moovTxById.set(tx.id, tx as MoovTransaction)));
        pages.slice(bankPagesCount + moovPagesCount).forEach((page) => page.content.forEach((tx) => this.orangeTxById.set(tx.id, tx as OrangeTransaction)));
      }
    });
  }

  private rebuildSummary(): void {
    this.summary = this.computeSummary(this.operatorScopedResults);
  }

  private get operatorScopedResults(): ReconciliationResult[] {
    return this.allResults;
  }

  get totalResults(): number {
    if (!this.summary) return 0;
    return this.summary.totalMatchOk + (this.summary.totalEchecDesDeuxCotes ?? 0) + this.summary.totalDebitATort + this.summary.totalCreditSansDebit + this.summary.totalAbsentBanque + this.summary.totalAbsentMoov + this.summary.totalMontantDifferent + this.summary.totalDoublons;
  }

  get successRate(): number {
    if (this.summary?.tauxSucces != null) return this.summary.tauxSucces;
    if (!this.summary || this.totalResults === 0) return 0;
    return (this.summary.totalMatchOk * 100) / this.totalResults;
  }

  get failureRate(): number {
    if (this.summary?.tauxEchecGlobal != null) return this.summary.tauxEchecGlobal;
    return 100 - this.successRate;
  }

  get failureDoubleSideRate(): number {
    if (this.summary?.tauxEchecDesDeuxCotes != null) return this.summary.tauxEchecDesDeuxCotes;
    return this.percentage(this.summary?.totalEchecDesDeuxCotes ?? 0);
  }

  get failureDebitRate(): number {
    if (this.summary?.tauxDebitATort != null) return this.summary.tauxDebitATort;
    return this.percentage(this.summary?.totalDebitATort ?? 0);
  }

  get missingTotal(): number {
    if (!this.summary) return 0;
    return this.summary.totalAbsentBanque + this.summary.totalAbsentMoov;
  }

  get missingBankRate(): number {
    return this.percentage(this.summary?.totalAbsentBanque ?? 0);
  }

  get missingMoovRate(): number {
    return this.percentage(this.summary?.totalAbsentMoov ?? 0);
  }

  get globalAmountTotal(): number {
    if (!this.summary) return 0;
    return (this.summary.montantGlobalBanque ?? 0) + (this.summary.montantGlobalMoov ?? 0);
  }

  percentage(value: number): number {
    const total = this.totalResults;
    if (!total) return 0;
    return (value * 100) / total;
  }

  bankDate(row: ReconciliationResult): string {
    if (!row.bankTransactionId) return '-';
    return this.bankTxById.get(row.bankTransactionId)?.transactionDate || (row.businessDate ?? '-');
  }

  counterpartDate(row: ReconciliationResult): string {
    if (!row.moovTransactionId) return '-';
    if (this.selectedOperator === 'MOOV') {
      return this.moovTxById.get(row.moovTransactionId)?.completionTime || (row.businessDate ?? '-');
    }
    return this.orangeTxById.get(row.moovTransactionId)?.transactionDateTime || (row.businessDate ?? '-');
  }

  direction(row: ReconciliationResult): string {
    const operationType = this.resolveOperationType(row);
    if (operationType === 'BANK_TO_WALLET') return `Banque -> ${this.activeOperatorLabel}`;
    if (operationType === 'WALLET_TO_BANK') return `${this.activeOperatorLabel} -> Banque`;
    return `Banque <-> ${this.activeOperatorLabel}`;
  }

  bankFullName(row: ReconciliationResult): string {
    if (!row.bankTransactionId) return '-';
    const bankTx = this.bankTxById.get(row.bankTransactionId);
    if (!bankTx) return '-';
    const value = bankTx.fullName?.trim();
    return value ? value : '[VIDE EN BASE]';
  }

  bankMsisdn(row: ReconciliationResult): string {
    if (!row.bankTransactionId) return '-';
    const bankTx = this.bankTxById.get(row.bankTransactionId);
    if (!bankTx) return '-';
    const value = bankTx.phoneNumber?.trim();
    return value ? value : '[VIDE EN BASE]';
  }

  bankAccountNumber(row: ReconciliationResult): string {
    if (!row.bankTransactionId) return '-';
    const bankTx = this.bankTxById.get(row.bankTransactionId);
    if (!bankTx) return '-';
    const account = bankTx.accountNumber;
    if (!account) return '[VIDE EN BASE]';
    const digitsOnly = account.replace(/\D/g, '');
    return digitsOnly || '[VIDE EN BASE]';
  }

  bankOperationReference(row: ReconciliationResult): string {
    if (!row.bankTransactionId) return '-';
    const bankTx = this.bankTxById.get(row.bankTransactionId);
    if (!bankTx) return '-';
    const value = bankTx.operationReference?.trim();
    return value ? value : '[VIDE EN BASE]';
  }

  bankRejectReason(row: ReconciliationResult): string {
    if (!row.bankTransactionId) return '-';
    const bankTx = this.bankTxById.get(row.bankTransactionId);
    if (!bankTx) return '-';
    const value = bankTx.rejectReasonRaw?.trim();
    return value ? value : '-';
  }

  isSoftFailureRow(row: ReconciliationResult): boolean {
    return row.resultType === 'ABSENT_COTE_MOOV'
      || row.resultType === 'ABSENT_COTE_ORANGE'
      || row.resultType === 'ABSENT_COTE_BANQUE'
      || row.resultType === 'ECHEC_DES_DEUX_COTES';
  }

  get filteredResults(): ReconciliationResult[] {
    const keyFilter = this.transactionKeyFilter.trim().toLowerCase();
    const phoneFilter = this.phoneFilter.trim().toLowerCase();
    const accountFilter = this.accountNumberFilter.trim().toLowerCase();
    return this.operatorScopedResults
      .filter((row) => (this.selectedFilter === 'ALL' ? true : row.resultType === this.selectedFilter))
      .filter((row) => {
        if (this.operationFilter === 'ALL') return true;
        return this.resolveOperationType(row) === this.operationFilter;
      })
      .filter((row) => {
        if (!keyFilter) return true;
        return (row.transactionKey || '').toLowerCase().includes(keyFilter);
      })
      .filter((row) => {
        if (!phoneFilter) return true;
        return this.bankMsisdn(row).toLowerCase().includes(phoneFilter);
      })
      .filter((row) => {
        if (!accountFilter) return true;
        return this.bankAccountNumber(row).toLowerCase().includes(accountFilter);
      })
      .filter((row) => {
        if (!this.operationDateFilter && !(this.operationDateMode === 'RANGE' && this.operationDateFrom && this.operationDateTo)) return true;
        const bankDate = this.bankDate(row);
        const walletDate = this.counterpartDate(row);
        const businessDate = row.businessDate || '';
        const matchesSingleDate = (candidate: string) => candidate.startsWith(this.operationDateFilter);
        const matchesRangeDate = (candidate: string) => {
          if (!(this.operationDateFrom && this.operationDateTo)) return true;
          const day = candidate.slice(0, 10);
          return day >= this.operationDateFrom && day <= this.operationDateTo;
        };
        if (this.operationDateMode === 'RANGE') return matchesRangeDate(bankDate) || matchesRangeDate(walletDate) || matchesRangeDate(businessDate);
        return matchesSingleDate(bankDate) || matchesSingleDate(walletDate) || matchesSingleDate(businessDate);
      })
      .slice()
      .sort((a, b) => this.resolveSortTimestamp(b) - this.resolveSortTimestamp(a));
  }

  private resolveOperationType(row: ReconciliationResult): 'BANK_TO_WALLET' | 'WALLET_TO_BANK' | 'BOTH' {
    if (this.selectedOperator === 'MOOV' && row.moovTransactionId) {
      const txType = this.moovTxById.get(row.moovTransactionId)?.transactionType;
      if (txType === 'BANK_TO_MOOV') return 'BANK_TO_WALLET';
      if (txType === 'MOOV_TO_BANK') return 'WALLET_TO_BANK';
    }
    if (row.bankTransactionId && !row.moovTransactionId) return 'BANK_TO_WALLET';
    if (!row.bankTransactionId && row.moovTransactionId) return 'WALLET_TO_BANK';
    return 'BOTH';
  }

  private resolveSortTimestamp(row: ReconciliationResult): number {
    const candidates = [
      this.bankDate(row),
      this.counterpartDate(row),
      row.businessDate || ''
    ];
    for (const candidate of candidates) {
      const normalized = (candidate || '').toString().trim().replace(' ', 'T');
      if (!normalized || normalized === '-') {
        continue;
      }
      const parsed = Date.parse(normalized);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return 0;
  }

  get totalPages(): number {
    const total = this.filteredResults.length;
    return total === 0 ? 1 : Math.ceil(total / this.pageSize);
  }

  get paginatedResults(): ReconciliationResult[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredResults.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 1) {
      this.currentPage = 1;
      return;
    }
    if (page > this.totalPages) {
      this.currentPage = this.totalPages;
      return;
    }
    this.currentPage = page;
  }

  exportFilteredResultsExcel(): void {
    const rows = this.filteredResults;
    if (!rows.length) {
      this.error = 'Aucune ligne a exporter pour ce filtre.';
      return;
    }
    this.error = '';

    const headers = ['Cle', 'Type', 'Direction', 'Nom complet', 'MSISDN (Telephone)', 'Numero de compte', 'transactionDate (Banque)', `date (${this.activeOperatorLabel})`, 'Montant Banque', this.counterpartAmountLabel, 'Ecart', 'Statut Banque', this.counterpartStatusLabel];
    const csvRows: string[] = [];
    csvRows.push(headers.map((h) => this.csvCell(h)).join(';'));
    for (const row of rows) {
      csvRows.push([row.transactionKey, row.resultType, this.direction(row), this.bankFullName(row), this.bankMsisdn(row), this.bankAccountNumber(row), this.bankDate(row), this.counterpartDate(row), row.bankAmount ?? '', row.moovAmount ?? '', row.amountDifference ?? '', row.bankStatusRaw ?? '', row.moovStatusRaw ?? ''].map((value) => this.csvCell(value)).join(';'));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.href = url;
    link.download = `reconciliation-${this.selectedOperator.toLowerCase()}-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  get maxDistributionCount(): number {
    if (!this.dashboardDistribution.length) {
      return 1;
    }
    return Math.max(...this.dashboardDistribution.map((d) => d.count), 1);
  }

  get maxTimelineTransactions(): number {
    if (!this.dashboardTimeline.length) {
      return 1;
    }
    return Math.max(...this.dashboardTimeline.map((d) => d.totalTransactions), 1);
  }

  get maxTimelineAnomalies(): number {
    if (!this.dashboardTimeline.length) {
      return 1;
    }
    return Math.max(...this.dashboardTimeline.map((d) => d.anomalies), 1);
  }

  get dashboardKpiTiles(): KpiTile[] {
    if (!this.dashboardSummary) {
      return [];
    }
    const s = this.dashboardSummary;
    return [
      { label: 'Transactions Banque', value: s.totalBank, tone: 'kpi-soft-green' },
      { label: `Transactions ${this.activeOperatorLabel}`, value: s.totalOperator, tone: 'kpi-soft-yellow' },
      { label: 'Matching Rate', value: this.formatPercent(s.matchingRate), tone: 'kpi-soft-green' },
      { label: 'Success Rate', value: this.formatPercent(s.successRate), tone: 'kpi-soft-yellow' },
      { label: 'Anomaly Rate', value: this.formatPercent(s.anomalyRate), tone: 'kpi-soft-orange' },
      { label: 'Total Results', value: s.totalResults, tone: 'kpi-soft-yellow' },
      { label: 'Montant Anomalies', value: this.formatAmount(s.montantAnomalies), tone: 'kpi-soft-orange' },
      { label: 'Ecart Global', value: this.formatAmount(s.ecartGlobal), tone: 'kpi-soft-red' }
    ];
  }

  get reportingKpiTiles(): KpiTile[] {
    const r = this.reportingSummary?.kpis;
    if (!r) {
      return [];
    }
    return [
      { label: 'Tx Total', value: r.totalTransactions, tone: 'kpi-soft-green' },
      { label: 'Success Rate', value: this.formatPercent(r.successRate), tone: 'kpi-soft-green' },
      { label: 'Anomaly Rate', value: this.formatPercent(r.anomalyRate), tone: 'kpi-soft-orange' },
      { label: 'Montant Banque', value: this.formatAmount(r.montantTotalBanque), tone: 'kpi-soft-yellow' },
      { label: `Montant ${this.activeOperatorLabel}`, value: this.formatAmount(r.montantTotalOperateur), tone: 'kpi-soft-yellow' },
      { label: 'Moy. Jour', value: this.formatNumber(r.moyenneJournaliereTransactions), tone: 'kpi-soft-yellow' },
      {
        label: 'Pic Jour',
        value: r.picVolumeJournalier.totalTransactions,
        tone: 'kpi-soft-yellow',
        hint: r.picVolumeJournalier.businessDate || '-'
      },
      { label: 'Debit a tort', value: r.debitATortCount, tone: 'kpi-soft-orange' },
      { label: 'Ecart Global', value: this.formatAmount(r.ecartGlobal), tone: 'kpi-soft-red' }
    ];
  }

  get dashboardQualityMetrics(): KpiTile[] {
    if (!this.dashboardDataQuality) {
      return [];
    }
    const q = this.dashboardDataQuality;
    return [
      { label: 'Imports', value: q.totalImports, tone: 'kpi-soft-yellow' },
      { label: 'Lignes valides', value: q.validRows, tone: 'kpi-soft-green' },
      { label: 'Lignes invalides', value: q.invalidRows, tone: 'kpi-soft-red' },
      { label: 'Parsing Success', value: this.formatPercent(q.parsingSuccessRate), tone: 'kpi-soft-green' },
      { label: 'Duplicate Rate', value: this.formatPercent(q.duplicateRate), tone: 'kpi-soft-orange' }
    ];
  }

  get dashboardAmountMetrics(): KpiTile[] {
    if (!this.dashboardAmounts) {
      return [];
    }
    const a = this.dashboardAmounts;
    return [
      { label: 'Banque', value: this.formatAmount(a.montantGlobalBanque), tone: 'kpi-soft-green' },
      { label: this.activeOperatorLabel, value: this.formatAmount(a.montantGlobalOperateur), tone: 'kpi-soft-yellow' },
      { label: 'Anomalies', value: this.formatAmount(a.montantAnomalies), tone: 'kpi-soft-orange' },
      { label: 'Ecart', value: this.formatAmount(a.ecartGlobal), tone: 'kpi-soft-red' }
    ];
  }

  private formatPercent(value?: number | null): string {
    return `${this.formatNumber(value)}%`;
  }

  private formatAmount(value?: number | null): string {
    return this.formatNumber(value);
  }

  private formatNumber(value?: number | null): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Number(value ?? 0));
  }

  private computeSummary(rows: ReconciliationResult[]): ReconciliationSummary {
    const count = (type: ReconciliationResultType) => rows.filter((r) => r.resultType === type).length;
    const totalMatchOk = count('MATCH_OK');
    const totalEchecDesDeuxCotes = count('ECHEC_DES_DEUX_COTES');
    const totalDebitATort = count('DEBIT_A_TORT');
    const totalCreditSansDebit = count('CREDIT_SANS_DEBIT');
    const totalAbsentBanque = count('ABSENT_COTE_BANQUE');
    const totalAbsentMoov = this.selectedOperator === 'MOOV' ? count('ABSENT_COTE_MOOV') : count('ABSENT_COTE_ORANGE');
    const totalMontantDifferent = count('MONTANT_DIFFERENT');
    const totalDoublons = count('DOUBLON_BANQUE') + count('DOUBLON_MOOV');
    const totalRows = rows.length;
    const montantGlobalBanque = rows.reduce((acc, row) => acc + Number(row.bankAmount ?? 0), 0);
    const montantGlobalMoov = rows.reduce((acc, row) => acc + Number(row.moovAmount ?? 0), 0);
    const toRate = (v: number) => (totalRows ? (v * 100) / totalRows : 0);

    return {
      totalBank: rows.filter((r) => r.bankTransactionId != null).length,
      totalMoov: rows.filter((r) => r.moovTransactionId != null).length,
      totalMatchOk,
      totalEchecDesDeuxCotes,
      totalDebitATort,
      totalCreditSansDebit,
      totalAbsentBanque,
      totalAbsentMoov,
      totalMontantDifferent,
      totalDoublons,
      tauxSucces: toRate(totalMatchOk),
      tauxEchecGlobal: toRate(totalRows - totalMatchOk),
      tauxEchecDesDeuxCotes: toRate(totalEchecDesDeuxCotes),
      tauxDebitATort: toRate(totalDebitATort),
      tauxCreditSansDebit: toRate(totalCreditSansDebit),
      tauxAbsentBanque: toRate(totalAbsentBanque),
      tauxAbsentMoov: toRate(totalAbsentMoov),
      tauxMontantDifferent: toRate(totalMontantDifferent),
      tauxDoublons: toRate(totalDoublons),
      montantGlobalBanque,
      montantGlobalMoov,
      ecartGlobal: montantGlobalBanque - montantGlobalMoov
    };
  }

  private loadDashboardData(): void {
    const params = this.dashboardFilterParams();
    const distributionParams = this.hasAppliedTransactionDateFilter()
      ? { ...params, runId: null }
      : { channel: this.selectedOperator, runId: null, importId: null, businessDate: null, dateFrom: null, dateTo: null };
    this.api.getDashboardSummary(params).subscribe({
      next: (data) => (this.dashboardSummary = data),
      error: () => (this.dashboardSummary = undefined)
    });
    this.api.getDashboardAmounts(params).subscribe({
      next: (data) => (this.dashboardAmounts = data),
      error: () => (this.dashboardAmounts = undefined)
    });
    this.api.getDashboardDistribution(distributionParams).subscribe({
      next: (data) => (this.dashboardDistribution = data),
      error: () => (this.dashboardDistribution = [])
    });
    this.api.getDashboardTimeline(params).subscribe({
      next: (data) => (this.dashboardTimeline = data),
      error: () => (this.dashboardTimeline = [])
    });
    this.api.getDashboardDataQuality(params).subscribe({
      next: (data) => (this.dashboardDataQuality = data),
      error: () => (this.dashboardDataQuality = undefined)
    });
    this.api.getDashboardTopAnomalies(params, 0, 10).subscribe({
      next: (page) => (this.dashboardTopAnomalies = page.content),
      error: () => (this.dashboardTopAnomalies = [])
    });
    this.api.getDailyCompensation(
      this.selectedOperator,
      this.compensationDate || null,
      this.compensationDate || null
    ).subscribe({
      next: (rows) => (this.compensationRows = rows),
      error: () => (this.compensationRows = [])
    });
  }

  loadCompensation(): void {
    if (this.compensationMode === 'WEEKLY') {
      if (!this.compensationWeekReferenceDate) {
        return;
      }
      this.api.getWeeklyCompensationByReference(this.selectedOperator, this.compensationWeekReferenceDate).subscribe({
        next: (period) => {
          this.compensationPeriod = period;
          this.compensationRows = period.rows;
          const ordered = [...period.rows].sort((a, b) => a.businessDate.localeCompare(b.businessDate));
          this.compensationWeekFrom = ordered[0]?.businessDate || '';
          this.compensationWeekTo = ordered[ordered.length - 1]?.businessDate || '';
          if (this.compensationWeekFrom && this.compensationWeekTo) {
            this.loadCompensationDiscrepancies(this.compensationWeekFrom, this.compensationWeekTo);
          }
        },
        error: () => {
          this.compensationRows = [];
          this.compensationPeriod = undefined;
        }
      });
      return;
    }
    if (this.compensationMode === 'MONTHLY') {
      const year = new Date().getFullYear();
      this.api.getMonthlyCompensation(this.selectedOperator, this.compensationMonth, year).subscribe({
        next: (period) => {
          this.compensationPeriod = period;
          this.compensationRows = period.rows;
          const ordered = [...period.rows].sort((a, b) => a.businessDate.localeCompare(b.businessDate));
          const from = ordered[0]?.businessDate || '';
          const to = ordered[ordered.length - 1]?.businessDate || '';
          if (from && to) {
            this.loadCompensationDiscrepancies(from, to);
          }
        },
        error: () => {
          this.compensationRows = [];
          this.compensationPeriod = undefined;
        }
      });
      return;
    }
    const from = this.compensationDateMode === 'SINGLE'
      ? (this.compensationDate || null)
      : (this.compensationDateFrom || null);
    const to = this.compensationDateMode === 'SINGLE'
      ? (this.compensationDate || null)
      : (this.compensationDateTo || null);
    this.api.getDailyCompensation(
      this.selectedOperator,
      from,
      to
    ).subscribe({
      next: (rows) => {
        this.compensationRows = rows;
        this.compensationPeriod = undefined;
        if (from && to) {
          this.loadCompensationDiscrepancies(from, to);
        }
      },
      error: () => {
        this.compensationRows = [];
        this.compensationPeriod = undefined;
      }
    });
  }

  private loadCompensationDiscrepancies(dateFrom: string, dateTo: string): void {
    this.api.getCompensationDiscrepancies(this.selectedOperator, dateFrom, dateTo, 0, 200).subscribe({
      next: (page) => (this.compensationDiscrepancies = page.content),
      error: () => (this.compensationDiscrepancies = [])
    });
  }

  get filteredCompensationDiscrepancies(): CompensationDiscrepancy[] {
    return this.compensationDiscrepancies.filter((row) => {
      if (this.compensationRiskFilter === 'ALL') return true;
      if (this.compensationRiskFilter === 'ABSENT_OPERATEUR') {
        return row.resultType === 'ABSENT_COTE_MOOV' || row.resultType === 'ABSENT_COTE_ORANGE';
      }
      if (this.compensationRiskFilter === 'ABSENT_BANQUE') {
        return row.resultType === 'ABSENT_COTE_BANQUE';
      }
      return row.resultType === 'ECHEC_DES_DEUX_COTES';
    });
  }

  private riskRowsByType(type: 'ABSENT_OPERATEUR' | 'ABSENT_BANQUE' | 'ECHEC_DEUX_COTES'): CompensationDiscrepancy[] {
    if (type === 'ABSENT_OPERATEUR') {
      return this.compensationDiscrepancies.filter((r) => r.resultType === 'ABSENT_COTE_MOOV' || r.resultType === 'ABSENT_COTE_ORANGE');
    }
    if (type === 'ABSENT_BANQUE') {
      return this.compensationDiscrepancies.filter((r) => r.resultType === 'ABSENT_COTE_BANQUE');
    }
    return this.compensationDiscrepancies.filter((r) => r.resultType === 'ECHEC_DES_DEUX_COTES');
  }

  private sumAmount(rows: CompensationDiscrepancy[], side: 'bank' | 'operator'): number {
    return rows.reduce((acc, r) => acc + Number(side === 'bank' ? (r.bankAmount ?? 0) : (r.operatorAmount ?? 0)), 0);
  }

  get riskAbsentOperatorCount(): number { return this.riskRowsByType('ABSENT_OPERATEUR').length; }
  get riskAbsentBankCount(): number { return this.riskRowsByType('ABSENT_BANQUE').length; }
  get riskEchecDeuxCotesCount(): number { return this.riskRowsByType('ECHEC_DEUX_COTES').length; }
  get riskTotalCount(): number { return this.riskAbsentOperatorCount + this.riskAbsentBankCount + this.riskEchecDeuxCotesCount; }

  get riskAbsentOperatorBankAmount(): number { return this.sumAmount(this.riskRowsByType('ABSENT_OPERATEUR'), 'bank'); }
  get riskAbsentOperatorOperatorAmount(): number { return this.sumAmount(this.riskRowsByType('ABSENT_OPERATEUR'), 'operator'); }
  get riskAbsentBankBankAmount(): number { return this.sumAmount(this.riskRowsByType('ABSENT_BANQUE'), 'bank'); }
  get riskAbsentBankOperatorAmount(): number { return this.sumAmount(this.riskRowsByType('ABSENT_BANQUE'), 'operator'); }
  get riskEchecDeuxCotesBankAmount(): number { return this.sumAmount(this.riskRowsByType('ECHEC_DEUX_COTES'), 'bank'); }
  get riskEchecDeuxCotesOperatorAmount(): number { return this.sumAmount(this.riskRowsByType('ECHEC_DEUX_COTES'), 'operator'); }

  get canLoadCompensation(): boolean {
    if (this.compensationDateMode === 'SINGLE') {
      return this.compensationMode !== 'DAILY' || !!this.compensationDate;
    }
    if (this.compensationMode === 'DAILY') {
      return !!this.compensationDateFrom && !!this.compensationDateTo;
    }
    if (this.compensationMode === 'WEEKLY') {
      return !!this.compensationWeekReferenceDate;
    }
    return this.compensationMode === 'MONTHLY';
  }


  private dashboardFilterParams(): {
    channel: 'MOOV' | 'ORANGE';
    businessDate?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    runId?: number | null;
    importId?: number | null;
  } {
    if (this.appliedPeriodMode === 'SINGLE_DAY' && this.appliedSingleDay) {
      return { channel: this.selectedOperator, businessDate: this.appliedSingleDay, runId: null };
    }
    if (this.appliedDateFrom && this.appliedDateTo) {
      return {
        channel: this.selectedOperator,
        dateFrom: this.appliedDateFrom,
        dateTo: this.appliedDateTo,
        runId: null
      };
    }
    return { channel: this.selectedOperator, runId: null };
  }

  private hasAppliedTransactionDateFilter(): boolean {
    if (this.appliedPeriodMode === 'SINGLE_DAY') {
      return !!this.appliedSingleDay;
    }
    return !!(this.appliedDateFrom && this.appliedDateTo);
  }

  private parseIds(raw?: string): number[] {
    if (!raw) return [];
    return raw.split(',').map((v) => Number(v.trim())).filter((v) => Number.isFinite(v) && v > 0);
  }

  private activeDateFilters(): { from: string | null; to: string | null; single: string | null } {
    if (this.appliedPeriodMode === 'SINGLE_DAY') return { from: null, to: null, single: this.appliedSingleDay || null };
    if (!this.appliedDateFrom && !this.appliedDateTo) return { from: null, to: null, single: null };
    return { from: this.appliedDateFrom || null, to: this.appliedDateTo || null, single: null };
  }

  private csvCell(value: unknown): string {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  private reportingFileName(ext: 'pdf' | 'xlsx'): string {
    const period = this.reportingPeriodType.toLowerCase();
    const operator = this.selectedOperator.toLowerCase();
    return `reporting-${operator}-${period}-${this.reportingReferenceDate}.${ext}`;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private openDialog(kind: 'success' | 'error' | 'info', title: string, message: string): void {
    this.dialogKind = kind;
    this.dialogTitle = title;
    this.dialogMessage = message;
    this.dialogOpen = true;
  }

  private clearBankFileInput(): void {
    if (this.bankFileInput?.nativeElement) {
      this.bankFileInput.nativeElement.value = '';
    }
  }

  private clearMoovFileInput(): void {
    if (this.moovFileInput?.nativeElement) {
      this.moovFileInput.nativeElement.value = '';
    }
  }

  private clearOrangeFileInput(): void {
    if (this.orangeFileInput?.nativeElement) {
      this.orangeFileInput.nativeElement.value = '';
    }
  }
}
