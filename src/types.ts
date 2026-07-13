/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GhsHazards {
  explosive: boolean;
  flammable: boolean;
  oxidizing: boolean;
  gasUnderPressure: boolean;
  corrosive: boolean;
  acuteToxicity: boolean;
  healthHazard: boolean;
  irritant: boolean;
  environmentalHazard: boolean;
}

export interface RevisionLog {
  id: string;
  date: string;
  author: string;
  action: string;
  beforeValue?: string; // JSON string
  afterValue?: string;  // JSON string
}

export interface Chemical {
  id: string;
  num: number;
  name: string;
  casNo: string;
  manufacturer: string;
  quantity: number;
  unit: string;
  location: string;
  labName: string;
  ghsHazards: GhsHazards;
  isSafetyDiagnosis: '대상' | '비대상' | '검토 필요';
  isWorkEnvMeasure: '대상' | '비대상' | '검토 필요';
  isSpecialHealthCheck: '대상' | '비대상' | '검토 필요';
  unNo?: string;
  formula?: string;
  usage?: string;
  firstAid?: string;
  storageMethod?: string;
  msdsFileId?: string;
  msdsFileName?: string;
  status: '사용중' | '폐기' | '비활성';
  logs: RevisionLog[];
  confidenceName?: number;
  confidenceCasNo?: number;
  confidenceManufacturer?: number;
  safetyDiagnosisReason?: string;
  workEnvMeasureReason?: string;
  specialHealthCheckReason?: string;
  attachments?: {
    id: string;
    name: string;
    type: 'test_report' | 'purchase_history' | 'other';
    uploadDate: string;
  }[];
}
