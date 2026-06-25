import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, from, Observable } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';
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
  FileImport,
  ReconciliationResult,
  ReconciliationResultType,
  ReconciliationRun,
  ReconciliationSummary,
  RetentionExecution
} from './core/models';

type OperatorType = 'MOOV' | 'ORANGE';
type ImportSourceType = 'BANQUE' | 'MOOV' | 'ORANGE' | 'AMPLITUDE';
type KpiTone = 'kpi-soft-green' | 'kpi-soft-yellow' | 'kpi-soft-orange' | 'kpi-soft-red';
type PageType = 'DASHBOARD' | 'HISTORIQUE' | 'RECONCILIATION' | 'COMPENSATION' | 'ACCOUNTING';

interface KpiTile {
  label: string;
  value: string | number;
  tone: KpiTone;
  hint?: string;
}

interface ReconciliationHistoryRow {
  businessDate: string;
  totalTransactions: number;
  matched: number;
  gaps: number;
  absentOperator: number;
  absentBank: number;
  successRate: number;
  latestRun?: ReconciliationRun;
}

interface AccountingHistoryRow {
  businessDate: string;
  totalTransactions: number;
  totalAmount: number;
  comptabilizedTransactions: number;
  comptabilizedAmount: number;
  nonComptabilizedTransactions: number;
  nonComptabilizedAmount: number;
  amountAtRisk: number;
  comptabilizationRate: number;
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
  activePage: PageType = 'DASHBOARD';
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

  bankFiles: Partial<Record<OperatorType, File[]>> = {};
  moovFiles: File[] = [];
  orangeFiles: File[] = [];
  amplitudeFiles: File[] = [];
  accountingDateFrom = new Date().toISOString().slice(0, 10);
  accountingDateTo = new Date().toISOString().slice(0, 10);
  accountingOperator: OperatorType = 'MOOV';
  accountingView: 'CURRENT' | 'HISTORY' = 'CURRENT';
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
  compensationDate = new Date().toISOString().slice(0, 10);
  compensationDateFrom = '';
  compensationDateTo = '';
  compensationWeekFrom = '';
  compensationWeekTo = '';
  compensationWeekReferenceDate = new Date().toISOString().slice(0, 10);
  compensationMonth = new Date().getMonth() + 1;
  allResults: ReconciliationResult[] = [];
  currentPage = 1;
  readonly pageSize = 20;
  tablePages: Record<string, number> = {};
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
    'OPERATEUR_NON_ABOUTI_SANS_BANQUE',
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

  setPage(page: PageType): void {
    this.activePage = page;
    this.pushPath(
      page === 'DASHBOARD'
        ? '/dashboard'
        : page === 'HISTORIQUE'
          ? '/historique-reconciliations'
          : page === 'RECONCILIATION'
            ? '/reconciliation'
            : page === 'COMPENSATION'
              ? '/compensation'
              : '/accounting'
    );
    if (page === 'DASHBOARD') {
      this.loadDashboardData();
      this.loadReportingSummary();
    }
    if (page === 'HISTORIQUE') {
      this.loadRuns();
      this.loadSummaryAndResults();
    }
    if (page === 'COMPENSATION') {
      this.loadCompensation();
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
    if (path.endsWith('/historique-reconciliations')) {
      this.showHome = false;
      this.activePage = 'HISTORIQUE';
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

  private pushPath(path: '/home' | '/dashboard' | '/historique-reconciliations' | '/reconciliation' | '/compensation' | '/accounting'): void {
    if (this.router.url === path) {
      return;
    }
    this.router.navigateByUrl(path);
  }

  onBankFile(event: Event): void {
    const files = this.filesFromEvent(event);
    if (!files.length) {
      delete this.bankFiles[this.selectedOperator];
      return;
    }
    this.bankFiles[this.selectedOperator] = files;
  }

  onMoovFile(event: Event): void {
    this.moovFiles = this.filesFromEvent(event);
  }

  onOrangeFile(event: Event): void {
    this.orangeFiles = this.filesFromEvent(event);
  }
  onAmplitudeFile(event: Event): void {
    this.amplitudeFiles = this.filesFromEvent(event);
  }

  importBankOnly(): void {
    const bankFiles = this.bankFiles[this.selectedOperator] ?? [];
    if (!bankFiles.length) {
      this.error = 'Veuillez choisir au moins un fichier Banque.';
      this.openDialog('error', 'Validation', this.error);
      return;
    }
    this.error = '';
    this.message = '';
    this.loading = true;
    this.uploadSequentially(bankFiles, (file) => this.api.importBank(file, this.businessDate, this.selectedOperator)).subscribe({
      next: (imports) => {
        const scope = imports[0]?.operatorScope || this.selectedOperator;
        this.message = this.buildImportSuccessMessage('Banque', imports, scope);
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
    if (!this.moovFiles.length) {
      this.error = 'Veuillez choisir au moins un fichier Moov.';
      this.openDialog('error', 'Validation', this.error);
      return;
    }
    this.error = '';
    this.message = '';
    this.loading = true;
    this.uploadSequentially(this.moovFiles, (file) => this.api.importMoov(file, this.businessDate)).subscribe({
      next: (imports) => {
        this.message = this.buildImportSuccessMessage('Moov', imports);
        this.moovFiles = [];
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
    if (!this.orangeFiles.length) {
      this.error = 'Veuillez choisir au moins un fichier Orange.';
      this.openDialog('error', 'Validation', this.error);
      return;
    }
    this.error = '';
    this.message = '';
    this.loading = true;
    this.uploadSequentially(this.orangeFiles, (file) => this.api.importOrange(file, this.businessDate)).subscribe({
      next: (imports) => {
        this.message = this.buildImportSuccessMessage('Orange', imports);
        this.orangeFiles = [];
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
    if (!this.amplitudeFiles.length) {
      this.error = 'Veuillez choisir au moins un fichier AMPLITUDE.';
      this.openDialog('error', 'Validation', this.error);
      return;
    }
    this.loading = true;
    this.uploadSequentially(this.amplitudeFiles, (file) => this.api.importAmplitude(file, this.businessDate)).subscribe({
      next: (imports) => {
        this.message = this.buildImportSuccessMessage('AMPLITUDE', imports);
        this.amplitudeFiles = [];
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

  private filesFromEvent(event: Event): File[] {
    const input = event.target as HTMLInputElement;
    return Array.from(input.files ?? []);
  }

  private uploadSequentially(files: File[], upload: (file: File) => Observable<FileImport>): Observable<FileImport[]> {
    return from(files).pipe(
      concatMap((file) => upload(file)),
      toArray()
    );
  }

  private buildImportSuccessMessage(label: string, imports: FileImport[], scope?: string): string {
    const count = imports.length;
    const totalRows = imports.reduce((sum, item) => sum + (item.totalRows ?? 0), 0);
    const validRows = imports.reduce((sum, item) => sum + (item.validRows ?? 0), 0);
    const ids = imports.map((item) => `#${item.id}`).join(', ');
    const sourceLabel = scope ? `${label} (${scope})` : label;
    return `${count} fichier${count > 1 ? 's' : ''} ${sourceLabel} uploade${count > 1 ? 's' : ''} avec succes. Imports ${ids} (${validRows}/${totalRows}).`;
  }

  loadAccountingCheck(): void {
    const range = this.resolveAccountingRange();
    if (!range) return;
    this.accountingDateFrom = range.from;
    this.accountingDateTo = range.to;
    this.resetTablePage('accounting-current');
    this.resetTablePage('accounting-history');
    this.api.getAccountingCheck(range.from, range.to, this.accountingOperator).subscribe({
      next: (rows) => this.accountingRows = rows ?? [],
      error: () => this.accountingRows = []
    });
    this.api.getAccountingKpi(range.from, range.to, this.accountingOperator).subscribe({
      next: (kpi) => this.accountingKpi = kpi,
      error: () => this.accountingKpi = undefined
    });
  }

  showAccountingCurrent(): void {
    this.accountingView = 'CURRENT';
  }

  showAccountingHistory(): void {
    this.accountingView = 'HISTORY';
    this.api.getLatestCarthagoDate(this.accountingOperator).subscribe({
      next: (latestDate) => {
        this.applyAccountingLastSevenDays(latestDate || undefined);
        this.loadAccountingCheck();
      },
      error: () => {
        this.applyAccountingLastSevenDays();
        this.loadAccountingCheck();
      }
    });
  }

  private applyAccountingLastSevenDays(referenceDate?: string): void {
    const end = referenceDate ? new Date(referenceDate + 'T00:00:00') : new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    this.accountingMode = 'RANGE';
    this.accountingDateFrom = start.toISOString().slice(0, 10);
    this.accountingDateTo = end.toISOString().slice(0, 10);
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

  exportAccountingListExcel(type: 'COMPTABILISE' | 'RISQUE'): void {
    const rows = type === 'COMPTABILISE'
      ? this.accountingRows.filter((row) => row.status === 'COMPTABILISE')
      : this.accountingRows.filter((row) => this.isAccountingRisk(row));
    if (!rows.length) {
      this.error = type === 'COMPTABILISE'
        ? 'Aucune operation comptabilisee a exporter.'
        : 'Aucune operation a risque a exporter.';
      return;
    }
    this.error = '';
    const title = type === 'COMPTABILISE' ? 'Operations comptabilisees' : 'Operations a risque';
    const headers = ['Date compta', 'Date valeur', 'Tel AMPLITUDE', `Tel Carthago ${this.accountingOperatorLabel}`, 'Reference operation', 'Transaction ID', 'Date operation', 'Montant Carthago', 'Credit AMPLITUDE', 'Compte', 'Statut'];
    const body = rows.map((row) => [
      row.accountingDateRaw || '',
      row.valueDateRaw || '',
      row.phoneNumber || '',
      row.bankPhoneNumber || '',
      row.operationReference || '',
      row.transactionId || '',
      row.operationDate || '',
      row.amount ?? '',
      row.amplitudeCredit ?? '',
      row.accountNumber || '',
      this.statusLabel(row.status)
    ]);
    const html = this.buildExcelHtml(title, headers, body);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const range = this.resolveAccountingRange();
    const period = range ? `${range.from}-${range.to}` : new Date().toISOString().slice(0, 10);
    this.downloadBlob(blob, `amplitude-${type.toLowerCase()}-${this.accountingOperator.toLowerCase()}-${period}.xls`);
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

  get accountingHistoryRows(): AccountingHistoryRow[] {
    const rowsByDate = new Map<string, AccountingCheckRow[]>();
    for (const row of this.accountingRows) {
      const businessDate = (row.operationDate || row.accountingDateRaw || '-').slice(0, 10);
      rowsByDate.set(businessDate, [...(rowsByDate.get(businessDate) ?? []), row]);
    }

    return Array.from(rowsByDate.entries())
      .map(([businessDate, rows]) => {
        const totalTransactions = rows.length;
        const totalAmount = this.sumAccountingAmount(rows, 'amount');
        const comptabilizedRows = rows.filter((row) => row.status === 'COMPTABILISE');
        const nonComptabilizedRows = rows.filter((row) => row.status === 'NON_COMPTABILISE');
        const comptabilizedTransactions = comptabilizedRows.length;
        const comptabilizedAmount = this.sumAccountingAmount(comptabilizedRows, 'amount');
        const nonComptabilizedTransactions = nonComptabilizedRows.length;
        const nonComptabilizedAmount = this.sumAccountingAmount(nonComptabilizedRows, 'amount');
        return {
          businessDate,
          totalTransactions,
          totalAmount,
          comptabilizedTransactions,
          comptabilizedAmount,
          nonComptabilizedTransactions,
          nonComptabilizedAmount,
          amountAtRisk: nonComptabilizedAmount,
          comptabilizationRate: totalTransactions ? (comptabilizedTransactions * 100) / totalTransactions : 0
        };
      })
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
  }

  get accountingHistoryTotals(): AccountingHistoryRow {
    const rows = this.accountingHistoryRows;
    const totalTransactions = rows.reduce((sum, row) => sum + row.totalTransactions, 0);
    const comptabilizedTransactions = rows.reduce((sum, row) => sum + row.comptabilizedTransactions, 0);
    return {
      businessDate: '',
      totalTransactions,
      totalAmount: rows.reduce((sum, row) => sum + row.totalAmount, 0),
      comptabilizedTransactions,
      comptabilizedAmount: rows.reduce((sum, row) => sum + row.comptabilizedAmount, 0),
      nonComptabilizedTransactions: rows.reduce((sum, row) => sum + row.nonComptabilizedTransactions, 0),
      nonComptabilizedAmount: rows.reduce((sum, row) => sum + row.nonComptabilizedAmount, 0),
      amountAtRisk: rows.reduce((sum, row) => sum + row.amountAtRisk, 0),
      comptabilizationRate: totalTransactions ? (comptabilizedTransactions * 100) / totalTransactions : 0
    };
  }

  openAccountingHistoryDate(row: AccountingHistoryRow): void {
    if (!row.businessDate || row.businessDate === '-') return;
    this.accountingView = 'CURRENT';
    this.accountingMode = 'DAILY';
    this.accountingDate = row.businessDate;
    this.loadAccountingCheck();
  }

  exportAccountingHistoryDateCsv(row: AccountingHistoryRow): void {
    const rows = this.accountingRows.filter((item) => (item.operationDate || item.accountingDateRaw || '-').slice(0, 10) === row.businessDate);
    if (!rows.length) {
      this.error = 'Aucune ligne comptable a exporter pour cette date.';
      return;
    }
    const csvRows: string[] = [];
    csvRows.push(['Historique comptabilisation', this.accountingOperator, row.businessDate].map((value) => this.csvCell(value)).join(';'));
    csvRows.push(['Total', 'Montant total', 'Comptabilisees', 'Montant comptabilise', 'Non comptabilisees', 'Montant a risque', 'Taux comptabilisation'].map((value) => this.csvCell(value)).join(';'));
    csvRows.push([row.totalTransactions, row.totalAmount, row.comptabilizedTransactions, row.comptabilizedAmount, row.nonComptabilizedTransactions, row.amountAtRisk, `${this.formatNumber(row.comptabilizationRate)}%`].map((value) => this.csvCell(value)).join(';'));
    csvRows.push('');
    csvRows.push(['Date compta', 'Date valeur', 'Tel AMPLITUDE', `Tel Carthago ${this.accountingOperatorLabel}`, 'Reference operation', 'Transaction ID', 'Date operation', 'Montant Carthago', 'Credit AMPLITUDE', 'Compte', 'Statut'].map((value) => this.csvCell(value)).join(';'));
    for (const item of rows) {
      csvRows.push([item.accountingDateRaw || '', item.valueDateRaw || '', item.phoneNumber || '', item.bankPhoneNumber || '', item.operationReference || '', item.transactionId || '', item.operationDate || '', item.amount ?? '', item.amplitudeCredit ?? '', item.accountNumber || '', this.statusLabel(item.status)].map((value) => this.csvCell(value)).join(';'));
    }
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `historique-comptabilisation-${this.accountingOperator.toLowerCase()}-${row.businessDate}.csv`);
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

  get paginatedAccountingRows(): AccountingCheckRow[] {
    return this.paginateRows(this.filteredAccountingRows, 'accounting-current');
  }

  get paginatedAccountingHistoryRows(): AccountingHistoryRow[] {
    return this.paginateRows(this.accountingHistoryRows, 'accounting-history');
  }

  get paginatedCompensationRows(): CompensationDaily[] {
    return this.paginateRows(this.compensationRows, 'compensation-position');
  }

  get paginatedCompensationDiscrepancies(): CompensationDiscrepancy[] {
    return this.paginateRows(this.filteredCompensationDiscrepancies, 'compensation-risk');
  }

  get paginatedHistoryRows(): ReconciliationHistoryRow[] {
    return this.paginateRows(this.historyRows, 'history');
  }

  get paginatedReportingTransactionDetails(): ReportingTransactionDetail[] {
    return this.paginateRows(this.filteredReportingTransactionDetails, 'reporting-details');
  }

  get paginatedDashboardTopAnomalies(): typeof this.dashboardTopAnomalies {
    return this.paginateRows(this.dashboardTopAnomalies, 'dashboard-anomalies');
  }

  private isAccountingRisk(row: AccountingCheckRow): boolean {
    if (row.status === 'NON_COMPTABILISE') return true;
    if (row.amount == null || row.amplitudeCredit == null) return false;
    return Number(row.amount) !== Number(row.amplitudeCredit);
  }

  private sumAccountingAmount(rows: AccountingCheckRow[], field: 'amount' | 'amplitudeCredit'): number {
    return rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);
  }

  statusIcon(value: string | null | undefined): string {
    const key = this.normalizeStatusKey(value);
    if (!key || key === '-') return '-';
    if (key.includes('MATCH') || (key.includes('COMPTABILISE') && !key.includes('NON')) || key.includes('OK_COMPENSATION')) return '✓';
    if (key.includes('INCONNU') || key.includes('UNKNOWN')) return '?';
    if (key.includes('DOUBLON') || key.includes('DIFFERENT') || key.includes('RISQUE') || key.includes('SANS_CARTHAGO')) return '!';
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
      OPERATEUR_ABOUTI_SANS_CARTHAGO: `${this.activeOperatorLabel} abouti sans Carthago`,
      OPERATEUR_NON_ABOUTI_SANS_BANQUE: 'Operateur non abouti',
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
    if (key.includes('SANS_CARTHAGO')) return 'warn';
    if (key.includes('MATCH') || key === 'COMPTABILISE' || key === 'OK_COMPENSATION' || key.includes('ALLOUE') || key.includes('ABOUTI') || key.includes('COMPLETED') || key === 'TS') return 'ok';
    if (key.includes('INCONNU') || key.includes('UNKNOWN')) return 'unknown';
    if (key.includes('DOUBLON') || key.includes('DIFFERENT') || key.includes('RISQUE') || key.includes('NON_ABOUTI')) return 'warn';
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
    return this.fileListLabel(this.bankFiles[this.selectedOperator] ?? []);
  }

  get selectedMoovFileName(): string {
    return this.fileListLabel(this.moovFiles);
  }

  get selectedOrangeFileName(): string {
    return this.fileListLabel(this.orangeFiles);
  }

  get selectedOperatorFileName(): string {
    return this.selectedOperator === 'MOOV' ? this.selectedMoovFileName : this.selectedOrangeFileName;
  }

  get selectedAmplitudeFileName(): string {
    return this.fileListLabel(this.amplitudeFiles);
  }

  private fileListLabel(files: File[]): string {
    if (!files.length) {
      return '';
    }
    if (files.length === 1) {
      return files[0].name;
    }
    return `${files.length} fichiers selectionnes`;
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

  openHistoryRun(row: ReconciliationHistoryRow): void {
    if (!row.businessDate || row.businessDate === '-') {
      return;
    }

    this.periodMode = 'SINGLE_DAY';
    this.singleDay = row.businessDate;
    this.dateFrom = '';
    this.dateTo = '';
    this.selectedPreset = null;
    this.appliedPeriodMode = 'SINGLE_DAY';
    this.appliedSingleDay = row.businessDate;
    this.appliedDateFrom = '';
    this.appliedDateTo = '';
    this.reportingPeriodType = 'DAY';
    this.reportingReferenceDate = row.businessDate;
    this.selectedReportingResultType = 'ALL';
    this.selectedRun = row.latestRun;
    this.setPage('DASHBOARD');
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
      if (txType === 'BANK_TO_WALLET' || txType === 'BANK_TO_MOOV') return 'BANK_TO_WALLET';
      if (txType === 'WALLET_TO_BANK' || txType === 'MOOV_TO_BANK') return 'WALLET_TO_BANK';
    }
    if (row.bankTransactionId) {
      const operationNature = this.bankTxById.get(row.bankTransactionId)?.operationNature;
      if (operationNature === 'BANK_TO_WALLET' || operationNature === 'BANK_TO_MOOV') return 'BANK_TO_WALLET';
      if (operationNature === 'WALLET_TO_BANK' || operationNature === 'MOOV_TO_BANK') return 'WALLET_TO_BANK';
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

  tablePage(tableId: string): number {
    return this.tablePages[tableId] ?? 1;
  }

  tableTotalPages(rows: unknown[]): number {
    return Math.max(Math.ceil(rows.length / this.pageSize), 1);
  }

  goTablePage(tableId: string, rows: unknown[], page: number): void {
    const total = this.tableTotalPages(rows);
    this.tablePages[tableId] = Math.min(Math.max(page, 1), total);
  }

  private resetTablePage(tableId: string): void {
    this.tablePages[tableId] = 1;
  }

  private paginateRows<T>(rows: T[], tableId: string): T[] {
    const total = this.tableTotalPages(rows);
    const page = Math.min(this.tablePage(tableId), total);
    if (page !== this.tablePage(tableId)) {
      this.tablePages[tableId] = page;
    }
    const start = (page - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  private buildExcelHtml(title: string, headers: string[], rows: Array<Array<string | number>>): string {
    const headerCells = headers.map((value) => `<th>${this.escapeHtml(value)}</th>`).join('');
    const bodyRows = rows
      .map((row) => `<tr>${row.map((value) => `<td>${this.escapeHtml(value)}</td>`).join('')}</tr>`)
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr><th colspan="${headers.length}">${this.escapeHtml(title)}</th></tr><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
  }

  private escapeHtml(value: string | number | null | undefined): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  exportHistoryDateCsv(historyRow: ReconciliationHistoryRow): void {
    const rows = this.operatorScopedResults.filter((row) => (row.businessDate || '-') === historyRow.businessDate);
    if (!rows.length) {
      this.error = 'Aucune ligne a exporter pour cette date.';
      return;
    }
    this.error = '';

    const csvRows: string[] = [];
    csvRows.push(['Historique reconciliation', this.selectedOperator, historyRow.businessDate].map((value) => this.csvCell(value)).join(';'));
    csvRows.push(['Total transactions', 'Matches', 'Ecarts', `Manquants ${this.activeOperatorLabel}`, 'Manquants Banque', 'Taux de succes'].map((value) => this.csvCell(value)).join(';'));
    csvRows.push([
      historyRow.totalTransactions,
      historyRow.matched,
      historyRow.gaps,
      historyRow.absentOperator,
      historyRow.absentBank,
      `${this.formatNumber(historyRow.successRate)}%`
    ].map((value) => this.csvCell(value)).join(';'));
    csvRows.push('');
    csvRows.push(['Cle', 'Type', 'Direction', 'Reference operation', 'Nom complet', 'Telephone', 'Compte', 'Date Banque', `Date ${this.activeOperatorLabel}`, 'Montant Banque', this.counterpartAmountLabel, 'Ecart', 'Statut Banque', this.counterpartStatusLabel, 'Motif'].map((value) => this.csvCell(value)).join(';'));
    for (const row of rows) {
      csvRows.push([
        row.transactionKey,
        row.resultType,
        this.direction(row),
        this.bankOperationReference(row),
        this.bankFullName(row),
        this.bankMsisdn(row),
        this.bankAccountNumber(row),
        this.bankDate(row),
        this.counterpartDate(row),
        row.bankAmount ?? '',
        row.moovAmount ?? '',
        row.amountDifference ?? '',
        row.bankStatusRaw ?? '',
        row.moovStatusRaw ?? '',
        row.reason ?? ''
      ].map((value) => this.csvCell(value)).join(';'));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `historique-reconciliation-${this.selectedOperator.toLowerCase()}-${historyRow.businessDate}.csv`);
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
      { label: 'Ecart aboutis', value: this.formatAmount(s.ecartGlobal), tone: 'kpi-soft-red' }
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
      {
        label: 'Banque abouti',
        value: this.formatAmount(r.bankSuccessAmount),
        tone: 'kpi-soft-green',
        hint: `${this.formatNumber(r.bankSuccessCount)} tx`
      },
      {
        label: `${this.activeOperatorLabel} abouti`,
        value: this.formatAmount(r.operateurSuccessAmount),
        tone: 'kpi-soft-green',
        hint: `${this.formatNumber(r.operateurSuccessCount)} tx`
      },
      {
        label: `${this.activeOperatorLabel} abouti sans Carthago`,
        value: r.operateurSuccessSansCarthagoCount ?? 0,
        tone: 'kpi-soft-orange',
        hint: `Montant: ${this.formatAmount(r.operateurSuccessSansCarthagoAmount)}`
      },
      {
        label: `${this.activeOperatorLabel} hors Carthago`,
        value: r.operateurHorsPerimetreCount ?? 0,
        tone: 'kpi-soft-orange',
        hint: `Montant: ${this.formatAmount(r.operateurHorsPerimetreAmount)}`
      },
      {
        label: 'Activite jour',
        value: this.formatNumber(r.moyenneJournaliereTransactions),
        tone: 'kpi-soft-yellow',
        hint: `Pic: ${this.formatNumber(r.picVolumeJournalier.totalTransactions)} tx${r.picVolumeJournalier.businessDate ? ` le ${r.picVolumeJournalier.businessDate}` : ''}`
      },
      { label: 'Debit a tort', value: r.debitATortCount, tone: 'kpi-soft-orange' },
      {
        label: 'Ecart aboutis',
        value: this.formatAmount((r.bankSuccessAmount ?? 0) - (r.operateurSuccessAmount ?? 0)),
        tone: 'kpi-soft-red'
      }
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
      { label: 'Banque abouti', value: this.formatAmount(a.montantGlobalBanque), tone: 'kpi-soft-green' },
      { label: `${this.activeOperatorLabel} abouti`, value: this.formatAmount(a.montantGlobalOperateur), tone: 'kpi-soft-yellow' },
      { label: 'Anomalies', value: this.formatAmount(a.montantAnomalies), tone: 'kpi-soft-orange' },
      { label: 'Ecart aboutis', value: this.formatAmount(a.ecartGlobal), tone: 'kpi-soft-red' }
    ];
  }

  get historyRows(): ReconciliationHistoryRow[] {
    const rowsByDate = new Map<string, ReconciliationResult[]>();
    for (const row of this.operatorScopedResults) {
      const businessDate = row.businessDate || '-';
      rowsByDate.set(businessDate, [...(rowsByDate.get(businessDate) ?? []), row]);
    }

    return Array.from(rowsByDate.entries())
      .map(([businessDate, rows]) => {
        const financiallyRelevant = rows.filter((row) => row.resultType !== 'OPERATEUR_NON_ABOUTI_SANS_BANQUE');
        const matched = financiallyRelevant.filter((row) => row.resultType === 'MATCH_OK').length;
        const absentOperator = financiallyRelevant.filter((row) =>
          row.resultType === 'ABSENT_COTE_MOOV' || row.resultType === 'ABSENT_COTE_ORANGE'
        ).length;
        const absentBank = financiallyRelevant.filter((row) => row.resultType === 'ABSENT_COTE_BANQUE').length;
        const gaps = financiallyRelevant.filter((row) => row.resultType !== 'MATCH_OK').length;
        const latestRun = this.runs
          .filter((run) => businessDate >= run.businessDateFrom && businessDate <= run.businessDateTo)
          .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''))[0];

        return {
          businessDate,
          totalTransactions: financiallyRelevant.length,
          matched,
          gaps,
          absentOperator,
          absentBank,
          successRate: financiallyRelevant.length ? (matched * 100) / financiallyRelevant.length : 0,
          latestRun
        };
      })
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
  }

  get historyTotalTransactions(): number {
    return this.historyRows.reduce((sum, row) => sum + row.totalTransactions, 0);
  }

  get historyMatched(): number {
    return this.historyRows.reduce((sum, row) => sum + row.matched, 0);
  }

  get historyGaps(): number {
    return this.historyRows.reduce((sum, row) => sum + row.gaps, 0);
  }

  get historySuccessRate(): number {
    return this.historyTotalTransactions ? (this.historyMatched * 100) / this.historyTotalTransactions : 0;
  }

  get historyErrorRate(): number {
    return this.historyTotalTransactions ? (this.historyGaps * 100) / this.historyTotalTransactions : 0;
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
    const financialRows = rows.filter((row) => row.resultType !== 'OPERATEUR_NON_ABOUTI_SANS_BANQUE');
    const countFinancial = (type: ReconciliationResultType) => financialRows.filter((r) => r.resultType === type).length;
    const totalMatchOk = countFinancial('MATCH_OK');
    const totalEchecDesDeuxCotes = countFinancial('ECHEC_DES_DEUX_COTES');
    const totalDebitATort = countFinancial('DEBIT_A_TORT');
    const totalCreditSansDebit = countFinancial('CREDIT_SANS_DEBIT');
    const totalAbsentBanque = countFinancial('ABSENT_COTE_BANQUE');
    const totalAbsentMoov = this.selectedOperator === 'MOOV' ? countFinancial('ABSENT_COTE_MOOV') : countFinancial('ABSENT_COTE_ORANGE');
    const totalMontantDifferent = countFinancial('MONTANT_DIFFERENT');
    const totalDoublons = countFinancial('DOUBLON_BANQUE') + countFinancial('DOUBLON_MOOV');
    const totalRows = financialRows.length;
    const montantGlobalBanque = financialRows.reduce((acc, row) => acc + Number(row.bankAmount ?? 0), 0);
    const montantGlobalMoov = financialRows.reduce((acc, row) => acc + Number(row.moovAmount ?? 0), 0);
    const toRate = (v: number) => (totalRows ? (v * 100) / totalRows : 0);

    return {
      totalBank: financialRows.filter((r) => r.bankTransactionId != null).length,
      totalMoov: financialRows.filter((r) => r.moovTransactionId != null).length,
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

  get compensationBankCount(): number {
    return this.compensationPeriod?.totalBankSuccessCount
      ?? this.compensationRows.reduce((sum, row) => sum + Number(row.bankSuccessCount ?? 0), 0);
  }

  get compensationOperatorCount(): number {
    return this.compensationPeriod?.totalOperatorSuccessCount
      ?? this.compensationRows.reduce((sum, row) => sum + Number(row.operatorSuccessCount ?? 0), 0);
  }

  get compensationBankAmount(): number {
    return this.compensationPeriod?.totalBankSuccessAmount
      ?? this.compensationRows.reduce((sum, row) => sum + Number(row.bankSuccessAmount ?? 0), 0);
  }

  get compensationOperatorAmount(): number {
    return this.compensationPeriod?.totalOperatorSuccessAmount
      ?? this.compensationRows.reduce((sum, row) => sum + Number(row.operatorSuccessAmount ?? 0), 0);
  }

  get compensationNetGap(): number {
    return this.compensationPeriod?.totalDifference
      ?? this.compensationRows.reduce((sum, row) => sum + Number(row.difference ?? 0), 0);
  }

  get compensationDecision(): string {
    if (this.compensationPeriod?.decision) {
      return this.compensationPeriod.decision;
    }
    if (!this.compensationRows.length) {
      return '-';
    }
    return this.compensationRows.every((row) => row.decision === 'OK_COMPENSATION') ? 'OK_COMPENSATION' : 'A_VERIFIER';
  }

  get compensationPeriodLabel(): string {
    if (this.compensationPeriod?.label) {
      return this.compensationPeriod.label;
    }
    if (this.compensationMode === 'DAILY' && this.compensationDateMode === 'SINGLE') {
      return this.compensationDate || 'Jour non defini';
    }
    if (this.compensationMode === 'DAILY') {
      return `${this.compensationDateFrom || '-'} -> ${this.compensationDateTo || '-'}`;
    }
    if (this.compensationMode === 'WEEKLY') {
      return this.compensationWeekFrom && this.compensationWeekTo
        ? `${this.compensationWeekFrom} -> ${this.compensationWeekTo}`
        : `Semaine de reference ${this.compensationWeekReferenceDate || '-'}`;
    }
    return `Mois ${this.compensationMonth}/${new Date().getFullYear()}`;
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

  exportCompensationCsv(): void {
    if (!this.compensationRows.length && !this.compensationDiscrepancies.length) {
      this.error = 'Aucune donnee de compensation a exporter.';
      return;
    }
    this.error = '';
    const csvRows: string[] = [];
    csvRows.push(['Synthese compensation', this.selectedOperator, this.compensationPeriodLabel].map((value) => this.csvCell(value)).join(';'));
    csvRows.push(['Decision', this.statusLabel(this.compensationDecision)].map((value) => this.csvCell(value)).join(';'));
    csvRows.push(['Nb tx Banque', 'Nb tx Operateur', 'Montant Banque', `Montant ${this.activeOperatorLabel}`, 'Ecart net', 'Operations a justifier'].map((value) => this.csvCell(value)).join(';'));
    csvRows.push([this.compensationBankCount, this.compensationOperatorCount, this.compensationBankAmount, this.compensationOperatorAmount, this.compensationNetGap, this.riskTotalCount].map((value) => this.csvCell(value)).join(';'));
    csvRows.push('');

    csvRows.push(['Position par date'].map((value) => this.csvCell(value)).join(';'));
    csvRows.push(['Date', 'Operateur', 'Nb tx Operateur', 'Nb tx Banque', 'Montant Operateur', 'Montant Banque', 'Ecart', 'Decision'].map((value) => this.csvCell(value)).join(';'));
    for (const row of this.compensationRows) {
      csvRows.push([
        row.businessDate,
        row.operator,
        row.operatorSuccessCount,
        row.bankSuccessCount,
        row.operatorSuccessAmount,
        row.bankSuccessAmount,
        row.difference,
        this.statusLabel(row.decision)
      ].map((value) => this.csvCell(value)).join(';'));
    }
    csvRows.push('');

    csvRows.push(['Ecarts a justifier'].map((value) => this.csvCell(value)).join(';'));
    csvRows.push(['Date', 'Cle', 'Reference operation', 'Type', 'Telephone operateur', 'Statut Banque', 'Statut Operateur', 'Montant Banque', 'Montant Operateur', 'Ecart', 'Motif'].map((value) => this.csvCell(value)).join(';'));
    for (const row of this.filteredCompensationDiscrepancies) {
      csvRows.push([
        row.businessDate,
        row.transactionKey,
        row.operationReference || '',
        this.statusLabel(row.resultType),
        row.operatorPhoneNumber || '',
        this.statusLabel(row.bankStatusRaw),
        this.statusLabel(row.operatorStatusRaw),
        row.bankAmount ?? '',
        row.operatorAmount ?? '',
        row.amountDifference ?? '',
        row.reason || ''
      ].map((value) => this.csvCell(value)).join(';'));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    this.downloadBlob(blob, `compensation-${this.selectedOperator.toLowerCase()}-${stamp}.csv`);
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
