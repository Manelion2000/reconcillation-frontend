import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { EMPTY, Observable, defer } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import {
  BankTransaction,
  DashboardAmounts,
  DashboardSummary,
  DashboardTimelinePoint,
  DataQuality,
  FileImport,
  ResultDistribution,
  MoovTransaction,
  OrangeTransaction,
  ReconciliationResult,
  ReconciliationResultType,
  ReconciliationRun,
  ReconciliationSummary,
  TopAnomaly,
  ReportingPeriodType,
  ReportingSummary,
  DataRetentionMode,
  RetentionExecution,
  SpringPage,
  ImportBulkDeletionResult,
  ImportFullDeletionResult,
  ImportDeletionPreviewResult
  , CompensationDaily, CompensationPeriodResponse, CompensationDiscrepancy, AccountingCheckRow, AmplitudeCleanupResult, AccountingKpi
} from './models';

@Injectable({ providedIn: 'root' })
export class ReconciliationApiService {
  private readonly api = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  importBank(file: File, businessDate: string, operator: 'MOOV' | 'ORANGE'): Observable<FileImport> {
    const form = new FormData();
    form.append('file', file);
    form.append('businessDate', businessDate);
    form.append('operator', operator);
    return this.http.post<FileImport>(`${this.api}/imports/bank`, form);
  }

  importMoov(file: File, businessDate: string): Observable<FileImport> {
    const form = new FormData();
    form.append('file', file);
    form.append('businessDate', businessDate);
    return this.http.post<FileImport>(`${this.api}/imports/moov`, form);
  }

  importOrange(file: File, businessDate: string): Observable<FileImport> {
    const form = new FormData();
    form.append('file', file);
    form.append('businessDate', businessDate);
    return this.http.post<FileImport>(`${this.api}/imports/orange`, form);
  }
  importAmplitude(file: File, businessDate: string): Observable<FileImport> {
    const form = new FormData();
    form.append('file', file);
    form.append('businessDate', businessDate);
    return this.http.post<FileImport>(`${this.api}/imports/amplitude`, form);
  }

  deleteImportsBySourceAndDate(
    sourceType: 'BANQUE' | 'MOOV' | 'ORANGE' | 'AMPLITUDE',
    businessDate: string,
    operator?: 'MOOV' | 'ORANGE' | null,
    confirmCascade = false
  ): Observable<ImportBulkDeletionResult> {
    let params = new HttpParams()
      .set('businessDate', businessDate)
      .set('confirmCascade', String(confirmCascade));
    if (operator) {
      params = params.set('operator', operator);
    }
    return this.http.delete<ImportBulkDeletionResult>(`${this.api}/imports/${sourceType}`, { params });
  }

  previewDeleteImportsBySourceAndDate(
    sourceType: 'BANQUE' | 'MOOV' | 'ORANGE' | 'AMPLITUDE',
    businessDate: string,
    operator?: 'MOOV' | 'ORANGE' | null
  ): Observable<ImportDeletionPreviewResult> {
    let params = new HttpParams().set('businessDate', businessDate);
    if (operator) {
      params = params.set('operator', operator);
    }
    return this.http.get<ImportDeletionPreviewResult>(`${this.api}/imports/${sourceType}/preview-delete`, { params });
  }

  deleteAllImportsBySource(
    sourceType: 'BANQUE' | 'MOOV' | 'ORANGE' | 'AMPLITUDE',
    operator?: 'MOOV' | 'ORANGE' | null,
    confirmCascade = false
  ): Observable<ImportFullDeletionResult> {
    let params = new HttpParams().set('confirmCascade', String(confirmCascade));
    if (operator) {
      params = params.set('operator', operator);
    }
    return this.http.delete<ImportFullDeletionResult>(`${this.api}/imports/${sourceType}/all`, { params });
  }

  runReconciliation(payload: {
    businessDate?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    operator?: 'MOOV' | 'ORANGE' | null;
    bankImportIds?: string | null;
    moovImportIds?: string | null;
    orangeImportIds?: string | null;
    label: string;
  }): Observable<ReconciliationRun> {
    return this.http.post<ReconciliationRun>(`${this.api}/reconciliations/run`, payload);
  }

  latestRun(): Observable<ReconciliationRun | null> {
    return this.http.get<ReconciliationRun | null>(`${this.api}/reconciliations/history/latest`);
  }

  resetRuns(page = 0, size = 30): Observable<SpringPage<ReconciliationRun>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'startedAt,desc');
    return this.http.get<SpringPage<ReconciliationRun>>(`${this.api}/reconciliations/history/reset`, { params });
  }

  listRuns(
    page = 0,
    size = 30,
    operator?: 'MOOV' | 'ORANGE' | null,
    dateFrom?: string | null,
    dateTo?: string | null,
    singleDay?: string | null,
    preset?: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_3_MONTHS' | null
  ): Observable<SpringPage<ReconciliationRun>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'startedAt,desc');
    if (operator) {
      params = params.set('operator', operator);
    }
    if (singleDay) {
      params = params.set('singleDay', singleDay);
    }
    if (preset) {
      params = params.set('preset', preset);
    }
    if (dateFrom && dateTo) {
      params = params.set('dateFrom', dateFrom).set('dateTo', dateTo);
    }
    return this.http.get<SpringPage<ReconciliationRun>>(`${this.api}/reconciliations/runs`, { params });
  }

  getSummary(runId: number): Observable<ReconciliationSummary> {
    return this.http.get<ReconciliationSummary>(`${this.api}/reconciliations/runs/${runId}/summary`);
  }

  getGlobalSummary(dateFrom?: string | null, dateTo?: string | null, singleDay?: string | null): Observable<ReconciliationSummary> {
    let params = new HttpParams();
    if (singleDay) {
      params = params.set('singleDay', singleDay);
    } else {
      if (dateFrom) params = params.set('dateFrom', dateFrom);
      if (dateTo) params = params.set('dateTo', dateTo);
    }
    return this.http.get<ReconciliationSummary>(`${this.api}/reconciliations/summary`, { params });
  }

  getResults(runId: number, type: ReconciliationResultType | 'ALL', page = 0, size = 200): Observable<SpringPage<ReconciliationResult>> {
    const endpoint = this.resolveResultsEndpoint(type);
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<SpringPage<ReconciliationResult>>(`${this.api}/reconciliations/runs/${runId}/${endpoint}`, { params });
  }

  getGlobalResults(
    type: ReconciliationResultType | 'ALL',
    page = 0,
    size = 500,
    operator?: 'MOOV' | 'ORANGE' | null,
    dateFrom?: string | null,
    dateTo?: string | null,
    singleDay?: string | null,
    filters?: {
      transactionKey?: string | null;
      phoneNumber?: string | null;
      accountNumber?: string | null;
      operationReference?: string | null;
    } | null
  ): Observable<SpringPage<ReconciliationResult>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (operator) {
      params = params.set('operator', operator);
    }
    if (type !== 'ALL') {
      params = params.set('type', type);
    }
    if (singleDay) {
      params = params.set('singleDay', singleDay);
    } else {
      if (dateFrom) params = params.set('dateFrom', dateFrom);
      if (dateTo) params = params.set('dateTo', dateTo);
    }
    const transactionKey = filters?.transactionKey?.trim();
    const phoneNumber = filters?.phoneNumber?.trim();
    const accountNumber = filters?.accountNumber?.trim();
    const operationReference = filters?.operationReference?.trim();
    if (transactionKey) params = params.set('transactionKey', transactionKey);
    if (phoneNumber) params = params.set('phoneNumber', phoneNumber);
    if (accountNumber) params = params.set('accountNumber', accountNumber);
    if (operationReference) params = params.set('operationReference', operationReference);
    return this.http.get<SpringPage<ReconciliationResult>>(`${this.api}/reconciliations/results`, { params });
  }

  getAllResults(runId: number, type: ReconciliationResultType | 'ALL', size = 2000): Observable<ReconciliationResult[]> {
    return this.fetchAllPages((page) => this.getResults(runId, type, page, size));
  }

  getAllGlobalResults(
    type: ReconciliationResultType | 'ALL',
    size = 2000,
    operator?: 'MOOV' | 'ORANGE' | null,
    dateFrom?: string | null,
    dateTo?: string | null,
    singleDay?: string | null,
    filters?: {
      transactionKey?: string | null;
      phoneNumber?: string | null;
      accountNumber?: string | null;
      operationReference?: string | null;
    } | null
  ): Observable<ReconciliationResult[]> {
    return this.fetchAllPages((page) => this.getGlobalResults(type, page, size, operator, dateFrom, dateTo, singleDay, filters));
  }

  getBankTransactions(importId: number): Observable<SpringPage<BankTransaction>> {
    const params = new HttpParams().set('importId', importId).set('page', 0).set('size', 5000);
    return this.http.get<SpringPage<BankTransaction>>(`${this.api}/transactions/bank`, { params });
  }

  getMoovTransactions(importId: number): Observable<SpringPage<MoovTransaction>> {
    const params = new HttpParams().set('importId', importId).set('page', 0).set('size', 5000);
    return this.http.get<SpringPage<MoovTransaction>>(`${this.api}/transactions/moov`, { params });
  }

  getOrangeTransactions(importId: number): Observable<SpringPage<OrangeTransaction>> {
    const params = new HttpParams().set('importId', importId).set('page', 0).set('size', 5000);
    return this.http.get<SpringPage<OrangeTransaction>>(`${this.api}/transactions/orange`, { params });
  }

  getBankTransactionsByIds(ids: number[]): Observable<BankTransaction[]> {
    return this.http.post<BankTransaction[]>(`${this.api}/transactions/bank/by-ids`, ids ?? []);
  }

  getMoovTransactionsByIds(ids: number[]): Observable<MoovTransaction[]> {
    return this.http.post<MoovTransaction[]>(`${this.api}/transactions/moov/by-ids`, ids ?? []);
  }

  getOrangeTransactionsByIds(ids: number[]): Observable<OrangeTransaction[]> {
    return this.http.post<OrangeTransaction[]>(`${this.api}/transactions/orange/by-ids`, ids ?? []);
  }

  runRetention(mode: DataRetentionMode, cutoffDateExclusive?: string | null, keepDays?: number | null): Observable<RetentionExecution> {
    let params = new HttpParams();
    params = params.set('mode', mode);
    if (cutoffDateExclusive) {
      params = params.set('cutoffDateExclusive', cutoffDateExclusive);
    } else if (keepDays != null && keepDays > 0) {
      params = params.set('keepDays', keepDays);
    }
    return this.http.post<RetentionExecution>(`${this.api}/reconciliations/retention/run`, null, { params });
  }

  getDashboardSummary(params: {
    channel: 'MOOV' | 'ORANGE';
    businessDate?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    runId?: number | null;
    importId?: number | null;
  }): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.api}/dashboard/reconciliation/summary`, { params: this.dashboardParams(params) });
  }

  getDashboardDistribution(params: {
    channel: 'MOOV' | 'ORANGE';
    businessDate?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    runId?: number | null;
    importId?: number | null;
  }): Observable<ResultDistribution[]> {
    return this.http.get<ResultDistribution[]>(`${this.api}/dashboard/reconciliation/results-distribution`, { params: this.dashboardParams(params) });
  }

  getDashboardAmounts(params: {
    channel: 'MOOV' | 'ORANGE';
    businessDate?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    runId?: number | null;
    importId?: number | null;
  }): Observable<DashboardAmounts> {
    return this.http.get<DashboardAmounts>(`${this.api}/dashboard/reconciliation/amounts`, { params: this.dashboardParams(params) });
  }

  getDashboardTimeline(params: {
    channel: 'MOOV' | 'ORANGE';
    businessDate?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    runId?: number | null;
    importId?: number | null;
  }): Observable<DashboardTimelinePoint[]> {
    return this.http.get<DashboardTimelinePoint[]>(`${this.api}/dashboard/reconciliation/timeline`, { params: this.dashboardParams(params) });
  }

  getDashboardTopAnomalies(
    params: {
      channel: 'MOOV' | 'ORANGE';
      businessDate?: string | null;
      dateFrom?: string | null;
      dateTo?: string | null;
      runId?: number | null;
      importId?: number | null;
    },
    page = 0,
    size = 20
  ): Observable<SpringPage<TopAnomaly>> {
    let httpParams = this.dashboardParams(params).set('page', page).set('size', size);
    return this.http.get<SpringPage<TopAnomaly>>(`${this.api}/dashboard/reconciliation/top-anomalies`, { params: httpParams });
  }

  getDashboardDataQuality(params: {
    channel: 'MOOV' | 'ORANGE';
    businessDate?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    runId?: number | null;
    importId?: number | null;
  }): Observable<DataQuality> {
    return this.http.get<DataQuality>(`${this.api}/dashboard/reconciliation/data-quality`, { params: this.dashboardParams(params) });
  }

  getReportingSummary(
    periodType: ReportingPeriodType,
    referenceDate: string,
    channel: 'MOOV' | 'ORANGE'
  ): Observable<ReportingSummary> {
    const params = new HttpParams()
      .set('periodType', periodType)
      .set('referenceDate', referenceDate)
      .set('channel', channel);
    return this.http.get<ReportingSummary>(`${this.api}/dashboard/reconciliation/reporting/summary`, { params });
  }

  exportReportingExcel(
    periodType: ReportingPeriodType,
    referenceDate: string,
    channel: 'MOOV' | 'ORANGE'
  ): Observable<Blob> {
    const params = new HttpParams()
      .set('periodType', periodType)
      .set('referenceDate', referenceDate)
      .set('channel', channel);
    return this.http.get(`${this.api}/dashboard/reconciliation/reporting/export/excel`, { params, responseType: 'blob' });
  }

  exportReportingPdf(
    periodType: ReportingPeriodType,
    referenceDate: string,
    channel: 'MOOV' | 'ORANGE'
  ): Observable<Blob> {
    const params = new HttpParams()
      .set('periodType', periodType)
      .set('referenceDate', referenceDate)
      .set('channel', channel);
    return this.http.get(`${this.api}/dashboard/reconciliation/reporting/export/pdf`, { params, responseType: 'blob' });
  }

  getDailyCompensation(
    operator: 'MOOV' | 'ORANGE',
    dateFrom?: string | null,
    dateTo?: string | null
  ): Observable<CompensationDaily[]> {
    let params = new HttpParams().set('operator', operator);
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);
    return this.http.get<CompensationDaily[]>(`${this.api}/compensations/daily`, { params });
  }

  getWeeklyCompensation(
    operator: 'MOOV' | 'ORANGE',
    dateFrom: string,
    dateTo: string
  ): Observable<CompensationPeriodResponse> {
    const params = new HttpParams()
      .set('operator', operator)
      .set('dateFrom', dateFrom)
      .set('dateTo', dateTo);
    return this.http.get<CompensationPeriodResponse>(`${this.api}/compensations/weekly`, { params });
  }

  getWeeklyCompensationByReference(
    operator: 'MOOV' | 'ORANGE',
    referenceDate: string
  ): Observable<CompensationPeriodResponse> {
    const params = new HttpParams()
      .set('operator', operator)
      .set('referenceDate', referenceDate);
    return this.http.get<CompensationPeriodResponse>(`${this.api}/compensations/weekly/by-reference`, { params });
  }

  getMonthlyCompensation(
    operator: 'MOOV' | 'ORANGE',
    month: number,
    year: number
  ): Observable<CompensationPeriodResponse> {
    const params = new HttpParams()
      .set('operator', operator)
      .set('month', month)
      .set('year', year);
    return this.http.get<CompensationPeriodResponse>(`${this.api}/compensations/monthly`, { params });
  }

  getCompensationDiscrepancies(
    operator: 'MOOV' | 'ORANGE',
    dateFrom: string,
    dateTo: string,
    page = 0,
    size = 100
  ): Observable<SpringPage<CompensationDiscrepancy>> {
    const params = new HttpParams()
      .set('operator', operator)
      .set('dateFrom', dateFrom)
      .set('dateTo', dateTo)
      .set('page', page)
      .set('size', size);
    return this.http.get<SpringPage<CompensationDiscrepancy>>(`${this.api}/compensations/discrepancies`, { params });
  }

  getAccountingCheck(dateFrom: string, dateTo: string, operator?: 'MOOV' | 'ORANGE'): Observable<AccountingCheckRow[]> {
    const params = new HttpParams().set('dateFrom', dateFrom).set('dateTo', dateTo);
    return this.http.get<AccountingCheckRow[]>(`${this.accountingOperatorPath(operator)}/check`, { params });
  }

  getAccountingKpi(dateFrom: string, dateTo: string, operator?: 'MOOV' | 'ORANGE'): Observable<AccountingKpi> {
    const params = new HttpParams().set('dateFrom', dateFrom).set('dateTo', dateTo);
    return this.http.get<AccountingKpi>(`${this.accountingOperatorPath(operator)}/kpi`, { params });
  }

  getLatestCarthagoDate(operator?: 'MOOV' | 'ORANGE'): Observable<string | null> {
    let params = new HttpParams();
    if (operator) {
      params = params.set('operator', operator);
    }
    return this.http.get<string | null>(`${this.api}/accounting/carthago/latest-date`, { params });
  }

  exportAccountingKpiCsv(dateFrom: string, dateTo: string, operator?: 'MOOV' | 'ORANGE'): Observable<Blob> {
    const params = new HttpParams().set('dateFrom', dateFrom).set('dateTo', dateTo);
    return this.http.get(`${this.accountingOperatorPath(operator)}/kpi/export/csv`, { params, responseType: 'blob' });
  }

  exportAccountingKpiPdf(dateFrom: string, dateTo: string, operator?: 'MOOV' | 'ORANGE'): Observable<Blob> {
    const params = new HttpParams().set('dateFrom', dateFrom).set('dateTo', dateTo);
    return this.http.get(`${this.accountingOperatorPath(operator)}/kpi/export/pdf`, { params, responseType: 'blob' });
  }

  private accountingOperatorPath(operator?: 'MOOV' | 'ORANGE'): string {
    if (operator === 'MOOV') return `${this.api}/accounting/amplitude/bankMoov`;
    if (operator === 'ORANGE') return `${this.api}/accounting/amplitude/bankOrange`;
    return `${this.api}/accounting`;
  }

  cleanupAmplitudeAll(): Observable<AmplitudeCleanupResult> {
    return this.http.delete<AmplitudeCleanupResult>(`${this.api}/accounting/amplitude/cleanup/all`);
  }

  cleanupAmplitudeDaily(businessDate: string): Observable<AmplitudeCleanupResult> {
    const params = new HttpParams().set('businessDate', businessDate);
    return this.http.delete<AmplitudeCleanupResult>(`${this.api}/accounting/amplitude/cleanup/daily`, { params });
  }

  cleanupAmplitudeWeekly(referenceDate: string): Observable<AmplitudeCleanupResult> {
    const params = new HttpParams().set('referenceDate', referenceDate);
    return this.http.delete<AmplitudeCleanupResult>(`${this.api}/accounting/amplitude/cleanup/weekly`, { params });
  }

  cleanupAmplitudeRange(dateFrom: string, dateTo: string): Observable<AmplitudeCleanupResult> {
    const params = new HttpParams().set('dateFrom', dateFrom).set('dateTo', dateTo);
    return this.http.delete<AmplitudeCleanupResult>(`${this.api}/accounting/amplitude/cleanup/range`, { params });
  }

  private dashboardParams(params: {
    channel: 'MOOV' | 'ORANGE';
    businessDate?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    runId?: number | null;
    importId?: number | null;
  }): HttpParams {
    let httpParams = new HttpParams().set('channel', params.channel);
    if (params.businessDate) {
      httpParams = httpParams.set('businessDate', params.businessDate);
    } else {
      if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
      if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    }
    if (params.runId != null) httpParams = httpParams.set('runId', params.runId);
    if (params.importId != null) httpParams = httpParams.set('importId', params.importId);
    return httpParams;
  }

  private resolveResultsEndpoint(type: ReconciliationResultType | 'ALL'): string {
    switch (type) {
      case 'ALL':
        return 'results';
      case 'MATCH_OK':
        return 'matches';
      case 'DEBIT_A_TORT':
        return 'debits-a-tort';
      case 'CREDIT_SANS_DEBIT':
        return 'credits-sans-debit';
      case 'ECHEC_DES_DEUX_COTES':
        return 'echecs';
      case 'ABSENT_COTE_BANQUE':
        return 'absents-banque';
      case 'ABSENT_COTE_MOOV':
        return 'absents-moov';
      case 'ABSENT_COTE_ORANGE':
        return 'absents-orange';
      case 'OPERATEUR_NON_ABOUTI_SANS_BANQUE':
        return 'operateur-non-abouti-sans-banque';
      case 'MONTANT_DIFFERENT':
        return 'montants-differents';
      case 'DOUBLON_BANQUE':
      case 'DOUBLON_MOOV':
        return 'doublons';
      default:
        return 'results';
    }
  }

  private fetchAllPages<T>(fetchPage: (page: number) => Observable<SpringPage<T>>): Observable<T[]> {
    return defer(() => fetchPage(0)).pipe(
      expand((pageData) => {
        const nextPage = pageData.number + 1;
        return nextPage < pageData.totalPages ? fetchPage(nextPage) : EMPTY;
      }),
      reduce((acc, pageData) => acc.concat(pageData.content), [] as T[]),
      map((rows) => rows ?? [])
    );
  }
}
