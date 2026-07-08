export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface FileImport {
  id: number;
  sourceType: 'BANQUE' | 'MOOV' | 'ORANGE' | 'AMPLITUDE';
  operatorScope?: 'MOOV' | 'ORANGE' | null;
  originalFilename: string;
  storedFilename: string;
  businessDate: string;
  importedAt: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importStatus: string;
  errorMessage?: string | null;
}

export interface ImportBulkDeletionResult {
  sourceType: 'BANQUE' | 'MOOV' | 'ORANGE' | 'AMPLITUDE';
  businessDate: string;
  deletedImports: number;
  deletedTransactions: number;
  deletedResults: number;
  deletedRuns: number;
}

export interface ImportFullDeletionResult {
  sourceType: 'BANQUE' | 'MOOV' | 'ORANGE' | 'AMPLITUDE';
  operatorScope?: 'MOOV' | 'ORANGE' | null;
  deletedImports: number;
  deletedTransactions: number;
  deletedResults: number;
  deletedRuns: number;
}

export interface ImportDeletionPreviewResult {
  sourceType: 'BANQUE' | 'MOOV' | 'ORANGE' | 'AMPLITUDE';
  businessDate: string;
  candidateImports: number;
  candidateTransactions: number;
  impactedResults: number;
  impactedRuns: number;
}

export interface ReconciliationRun {
  id: number;
  label: string;
  operator?: 'MOOV' | 'ORANGE' | null;
  businessDateFrom: string;
  businessDateTo: string;
  bankImportIds?: string;
  moovImportIds?: string;
  orangeImportIds?: string;
  startedAt: string;
  finishedAt?: string | null;
  status: string;
  summaryJson?: string;
}

export interface ReconciliationSummary {
  totalBank: number;
  totalMoov: number;
  totalMatchOk: number;
  totalEchecDesDeuxCotes?: number;
  totalDebitATort: number;
  totalCreditSansDebit: number;
  totalAbsentBanque: number;
  totalAbsentMoov: number;
  totalMontantDifferent: number;
  totalDoublons: number;
  tauxSucces?: number;
  tauxEchecGlobal?: number;
  tauxEchecDesDeuxCotes?: number;
  tauxDebitATort?: number;
  tauxCreditSansDebit?: number;
  tauxAbsentBanque?: number;
  tauxAbsentMoov?: number;
  tauxMontantDifferent?: number;
  tauxDoublons?: number;
  montantGlobalBanque: number;
  montantGlobalMoov: number;
  ecartGlobal: number;
}

export interface ReconciliationResult {
  id: number;
  businessDate?: string | null;
  transactionKey: string;
  resultType: ReconciliationResultType;
  bankTransactionId?: number | null;
  moovTransactionId?: number | null;
  bankStatusRaw?: string | null;
  moovStatusRaw?: string | null;
  bankAmount?: number | null;
  moovAmount?: number | null;
  amountDifference?: number | null;
  reason?: string | null;
}

export interface BankTransaction {
  id: number;
  transactionId: string;
  allocationStatusRaw?: string | null;
  rejectReasonRaw?: string | null;
  amount?: number | null;
  transactionDate?: string | null;
  fullName?: string | null;
  accountNumber?: string | null;
  phoneNumber?: string | null;
  operationReference?: string | null;
  operationNature?: 'BANK_TO_WALLET' | 'WALLET_TO_BANK' | 'BANK_TO_MOOV' | 'MOOV_TO_BANK' | string | null;
}

export interface MoovTransaction {
  id: number;
  receiptNo: string;
  transactionStatusRaw?: string | null;
  transactionType?: 'BANK_TO_WALLET' | 'WALLET_TO_BANK' | 'BANK_TO_MOOV' | 'MOOV_TO_BANK' | string | null;
  amount?: number | null;
  completionTime?: string | null;
  msisdn?: string | null;
}

export interface OrangeTransaction {
  id: number;
  aliasBankAccountNumber: string;
  senderMobileNumber?: string | null;
  transactionStatusRaw?: string | null;
  amount?: number | null;
  transactionDateTime?: string | null;
}

export type ReconciliationResultType =
  | 'MATCH_OK'
  | 'DEBIT_A_TORT'
  | 'CREDIT_SANS_DEBIT'
  | 'ECHEC_DES_DEUX_COTES'
  | 'ABSENT_COTE_MOOV'
  | 'ABSENT_COTE_ORANGE'
  | 'ABSENT_COTE_BANQUE'
  | 'OPERATEUR_ABOUTI_SANS_CARTHAGO'
  | 'OPERATEUR_NON_ABOUTI_SANS_BANQUE'
  | 'APPROVISIONNEMENT'
  | 'MONTANT_DIFFERENT'
  | 'DOUBLON_BANQUE'
  | 'DOUBLON_MOOV'
  | 'STATUT_INCONNU';

export type DataRetentionMode = 'ARCHIVE_AND_PURGE' | 'PURGE_ONLY';

export interface RetentionExecution {
  executedAt: string;
  cutoffDateExclusive: string;
  mode: DataRetentionMode;
  archivedResults: number;
  archivedRuns: number;
  purgedResults: number;
  purgedRuns: number;
}

export interface DashboardSummary {
  periodType: 'DAY' | 'RANGE';
  businessDate?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  channel: 'MOOV' | 'ORANGE';
  totalBank: number;
  totalOperator: number;
  totalResults: number;
  matchOk: number;
  debitATort: number;
  creditSansDebit: number;
  echecDesDeuxCotes: number;
  absentCoteOperateur: number;
  absentCoteBanque: number;
  montantDifferent: number;
  statutInconnu: number;
  doublons: number;
  invalidRows: number;
  matchingRate: number;
  successRate: number;
  anomalyRate: number;
  montantGlobalBanque: number;
  montantGlobalOperateur: number;
  montantAnomalies: number;
  ecartGlobal: number;
}

export type DashboardResultTypeView =
  | 'MATCH_OK'
  | 'DEBIT_A_TORT'
  | 'CREDIT_SANS_DEBIT'
  | 'ECHEC_DES_DEUX_COTES'
  | 'ABSENT_COTE_OPERATEUR'
  | 'ABSENT_COTE_BANQUE'
  | 'OPERATEUR_ABOUTI_SANS_CARTHAGO'
  | 'OPERATEUR_NON_ABOUTI_SANS_BANQUE'
  | 'APPROVISIONNEMENT'
  | 'MONTANT_DIFFERENT'
  | 'STATUT_INCONNU'
  | 'DOUBLONS';

export interface ResultDistribution {
  resultType: DashboardResultTypeView;
  count: number;
}

export interface DashboardAmounts {
  montantGlobalBanque: number;
  montantGlobalOperateur: number;
  montantAnomalies: number;
  ecartGlobal: number;
}

export interface DashboardTimelinePoint {
  hour: string;
  totalTransactions: number;
  anomalies: number;
}

export interface TopAnomaly {
  transactionKey: string;
  businessDate: string;
  resultType: DashboardResultTypeView;
  bankStatusRaw?: string | null;
  operatorStatusRaw?: string | null;
  bankAmount?: number | null;
  operatorAmount?: number | null;
  amountDifference?: number | null;
  reason?: string | null;
}

export interface DataQuality {
  totalImports: number;
  invalidRows: number;
  validRows: number;
  parsingSuccessRate: number;
  duplicateCount: number;
  duplicateRate: number;
  invalidRowRate: number;
}

export type ReportingPeriodType = 'DAY' | 'WEEK' | 'MONTH';

export interface ReportingKpis {
  totalTransactions: number;
  matchingCount: number;
  anomalyCount: number;
  successRate: number;
  anomalyRate: number;
  debitATortCount: number;
  creditSansDebitCount: number;
  absentCoteBanqueCount: number;
  absentCoteOperateurCount: number;
  montantDifferentCount: number;
  doublonsCount: number;
  statutInconnuCount: number;
  montantTotalBanque: number;
  montantTotalOperateur: number;
  montantAnomalies: number;
  ecartGlobal: number;
  operateurSuccessCount: number;
  operateurSuccessAmount: number;
  bankSuccessCount: number;
  bankSuccessAmount: number;
  operateurSuccessSansCarthagoCount: number;
  operateurSuccessSansCarthagoAmount: number;
  operateurHorsPerimetreCount: number;
  operateurHorsPerimetreAmount: number;
  moyenneJournaliereTransactions: number;
  picVolumeJournalier: {
    businessDate?: string | null;
    totalTransactions: number;
  };
}

export interface ReportingDailyBreakdown {
  businessDate: string;
  totalTransactions: number;
  matchingCount: number;
  anomalyCount: number;
  successRate: number;
  montantBanque: number;
  montantOperateur: number;
  ecart: number;
}

export interface ReportingTransactionDetail {
  businessDate: string;
  transactionKey: string;
  resultType: DashboardResultTypeView;
  direction: string;
  bankStatus?: string | null;
  operatorStatus?: string | null;
  bankAmount?: number | null;
  operatorAmount?: number | null;
  amountDifference?: number | null;
  reason?: string | null;
}

export interface ReportingSummary {
  periodType: ReportingPeriodType;
  referenceDate: string;
  dateFrom: string;
  dateTo: string;
  channel: 'MOOV' | 'ORANGE';
  generatedAt: string;
  kpis: ReportingKpis;
  distribution: ResultDistribution[];
  dailyBreakdown: ReportingDailyBreakdown[];
  transactionDetails: ReportingTransactionDetail[];
}

export interface CompensationDaily {
  businessDate: string;
  operator: 'MOOV' | 'ORANGE';
  operatorSuccessCount: number;
  bankSuccessCount: number;
  operatorSuccessAmount: number;
  bankSuccessAmount: number;
  difference: number;
  decision: 'OK_COMPENSATION' | 'A_VERIFIER' | string;
}

export interface CompensationPeriodResponse {
  periodType: 'WEEK' | 'MONTH' | string;
  label: string;
  rows: CompensationDaily[];
  totalOperatorSuccessCount: number;
  totalBankSuccessCount: number;
  totalOperatorSuccessAmount: number;
  totalBankSuccessAmount: number;
  totalDifference: number;
  decision: 'OK_COMPENSATION' | 'A_VERIFIER' | string;
}

export interface CompensationDiscrepancy {
  businessDate: string;
  transactionKey: string;
  operationReference?: string | null;
  resultType: ReconciliationResultType;
  operatorPhoneNumber?: string | null;
  bankStatusRaw?: string | null;
  operatorStatusRaw?: string | null;
  bankAmount?: number | null;
  operatorAmount?: number | null;
  amountDifference?: number | null;
  reason?: string | null;
}

export type AccountingStatus = 'COMPTABILISE' | 'NON_COMPTABILISE' | 'AMPLITUDE_SANS_CARTHAGO';

export interface AccountingCheckRow {
  bankTransactionId?: number | null;
  transactionId?: string | null;
  operationDate?: string | null;
  amount?: number | null;
  amplitudeCredit?: number | null;
  accountNumber?: string | null;
  bankPhoneNumber?: string | null;
  operationReference?: string | null;
  accountingDateRaw?: string | null;
  valueDateRaw?: string | null;
  pieceNumber?: string | null;
  eventNumber?: string | null;
  phoneNumber?: string | null;
  operationNature?: 'BANK_TO_WALLET' | 'WALLET_TO_BANK' | 'BANK_TO_MOOV' | 'MOOV_TO_BANK' | string | null;
  status: AccountingStatus;
}

export interface AmplitudeCleanupResult {
  mode: 'ALL' | 'DAILY' | 'RANGE' | 'WEEKLY' | string;
  dateFrom?: string | null;
  dateTo?: string | null;
  deletedImports: number;
  deletedTransactions: number;
}

export interface AccountingKpi {
  totalTransactions: number;
  totalAmount: number;
  comptabilizedTransactions: number;
  comptabilizedAmount: number;
  comptabilizationRateCount: number;
  comptabilizationRateAmount: number;
  nonComptabilizedTransactions: number;
  nonComptabilizedAmount: number;
  nonComptabilizationRateCount: number;
  amountAtRisk: number;
  netGapAmount: number;
  absoluteGapAmount: number;
  transactionsWithGapCount: number;
  totalGapAmount: number;
}
