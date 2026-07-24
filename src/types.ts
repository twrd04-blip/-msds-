/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum HazardCategory {
  CHEMICAL = "화학적 인자",
  PHYSICAL = "물리적 인자",
  BIOLOGICAL = "생물학적 인자",
  ERGONOMIC = "인간공학적 인자",
}

export enum RiskLevel {
  LOW = "저위험",
  MEDIUM = "중위험",
  HIGH = "고위험",
}

export interface HazardousFactor {
  id: string;
  manageNo: string;         // 관리 번호
  nameKo: string;           // 국문 명칭
  nameEn: string;           // 영문 명칭
  casNo?: string;           // CAS 번호 (화학인자용)
  category: HazardCategory; // 분류
  department: string;       // 보관 및 사용 부서
  process: string;          // 취급 공정
  exposureLimitTwa?: string; // TWA 노출기준
  exposureLimitStel?: string; // STEL 노출기준
  healthEffects: string;    // 주요 유해성 및 건강 영향
  msdsLink?: string;        // MSDS 관리번호 또는 링크
  ppeRequired: string[];    // 필수 개인보호구
  safetyRules: string;      // 작업안전수칙
  emergencyRules: string;   // 비상 조치 요령
  measurementInterval: string; // 작업환경측정 주기 (e.g., "6개월 1회")
  specialExam: boolean;     // 특수건강진단 대상 여부
  detailedSafetyDiagnostic: boolean; // 정밀안전진단 대상 여부
  workEnvMeasurement: boolean;       // 작업환경측정 대상 여부
  riskLevel: RiskLevel;     // 위험성 수준 (저/중/고)
  ghsPictograms: string[];  // GHS 그림문자 키 목록
  createdAt: string;
}

export interface GhsDefinition {
  id: string;
  nameKo: string;
  nameEn: string;
  description: string;
}

export const GHS_PICTOGRAMS: Record<string, GhsDefinition> = {
  explosive: {
    id: "explosive",
    nameKo: "폭발성 물질",
    nameEn: "Explosive",
    description: "불안정성 폭발성 물질, 자기반응성 물질, 유기과산화물",
  },
  flammable: {
    id: "flammable",
    nameKo: "인화성 물질",
    nameEn: "Flammable",
    description: "인화성 가스/액체/고체, 에어로졸, 자기반응성 물질",
  },
  oxidizing: {
    id: "oxidizing",
    nameKo: "산화성 물질",
    nameEn: "Oxidizing",
    description: "산화성 가스/액체/고체",
  },
  gases_under_pressure: {
    id: "gases_under_pressure",
    nameKo: "고압 가스",
    nameEn: "Compressed Gas",
    description: "압축가스, 액화가스, 냉동액화가스, 용해가스",
  },
  corrosive: {
    id: "corrosive",
    nameKo: "금속부식성/피부부식성",
    nameEn: "Corrosive",
    description: "금속부식성 물질, 피부부식성 및 심한 안구손상성 물질",
  },
  toxic: {
    id: "toxic",
    nameKo: "급성 독성 물질",
    nameEn: "Acute Toxic",
    description: "경구, 경피, 흡입 시 급성 독성을 일으키는 물질",
  },
  irritant: {
    id: "irritant",
    nameKo: "감작성/피부 자극성",
    nameEn: "Irritant",
    description: "피부 과민성 물질, 호흡기계 자극, 피부 부식/자극성 물질",
  },
  health_hazard: {
    id: "health_hazard",
    nameKo: "전신 유해성/호흡기 과민성",
    nameEn: "Health Hazard",
    description: "호흡기 과민성, 발암성, 생식세포 변이원성, 특정표적장기 독성",
  },
  environmental: {
    id: "environmental",
    nameKo: "수생 환경 유해성",
    nameEn: "Environmental Hazard",
    description: "수생환경유해성 물질 (만성 또는 급성)",
  },
};
