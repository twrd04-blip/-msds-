/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  ShieldAlert,
  Flame,
  ClipboardList,
  Activity,
  HeartPulse,
  Clock,
} from "lucide-react";
import { HazardousFactor, HazardCategory, RiskLevel } from "../types";

interface DashboardStatsProps {
  factors: HazardousFactor[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ factors }) => {
  const totalCount = factors.length;

  const chemCount = factors.filter(
    (f) => f.category === HazardCategory.CHEMICAL
  ).length;
  const physCount = factors.filter(
    (f) => f.category === HazardCategory.PHYSICAL
  ).length;
  const ergoCount = factors.filter(
    (f) => f.category === HazardCategory.ERGONOMIC
  ).length;
  const bioCount = factors.filter(
    (f) => f.category === HazardCategory.BIOLOGICAL
  ).length;

  const highRiskCount = factors.filter(
    (f) => f.riskLevel === RiskLevel.HIGH
  ).length;
  const specialExamCount = factors.filter((f) => f.specialExam).length;
  const measurementTargetCount = factors.filter((f) => f.workEnvMeasurement).length;
  const detailedDiagnosticCount = factors.filter((f) => f.detailedSafetyDiagnostic).length;

  // Let's calculate percentage of high risk
  const highRiskPercent = totalCount > 0 ? Math.round((highRiskCount / totalCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Registered Box */}
      <div className="bg-white border border-neutral-200 p-5 rounded-lg shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
            전체 관리 대상 유해인자
          </span>
          <span className="text-3xl font-extrabold text-neutral-900 mt-1 block">
            {totalCount} <span className="text-sm font-medium text-neutral-500">종</span>
          </span>
          <span className="text-xs text-neutral-400 mt-1 block">
            화학 {chemCount} | 물리 {physCount} | 인공 {ergoCount} | 생물 {bioCount}
          </span>
        </div>
        <div className="bg-neutral-50 text-neutral-700 p-3 rounded-md">
          <ClipboardList size={24} />
        </div>
      </div>

      {/* High Risk Alarms */}
      <div className="bg-white border border-neutral-200 p-5 rounded-lg shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-red-600 uppercase tracking-wider block">
            고위험 (3등급) 유해인자
          </span>
          <span className="text-3xl font-extrabold text-red-600 mt-1 block">
            {highRiskCount} <span className="text-sm font-medium text-red-400">종</span>
          </span>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-20 bg-neutral-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-red-600 h-1.5 rounded-full"
                style={{ width: `${highRiskPercent}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-neutral-500 font-semibold">
              점유율 {highRiskPercent}%
            </span>
          </div>
        </div>
        <div className="bg-red-50 text-red-600 p-3 rounded-md">
          <ShieldAlert size={24} />
        </div>
      </div>

      {/* Special Medical Health Exam Targets */}
      <div className="bg-white border border-neutral-200 p-5 rounded-lg shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">
            특수건강진단 대상 인자
          </span>
          <span className="text-3xl font-extrabold text-blue-900 mt-1 block">
            {specialExamCount} <span className="text-sm font-medium text-neutral-500">종</span>
          </span>
          <span className="text-xs text-neutral-400 mt-1 block">
            노출근로자 정기 특수검진 대상
          </span>
        </div>
        <div className="bg-blue-50 text-blue-600 p-3 rounded-md">
          <HeartPulse size={24} />
        </div>
      </div>

      {/* Environmental Worksite Measurements */}
      <div className="bg-white border border-neutral-200 p-5 rounded-lg shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider block">
            작업환경측정 대상 인자
          </span>
          <span className="text-3xl font-extrabold text-orange-600 mt-1 block">
            {measurementTargetCount} <span className="text-sm font-medium text-neutral-500">종</span>
          </span>
          <span className="text-xs text-neutral-400 mt-1 block">
            반기 정기 측정 | 정밀안전진단 {detailedDiagnosticCount}종
          </span>
        </div>
        <div className="bg-orange-50 text-orange-600 p-3 rounded-md">
          <Activity size={24} />
        </div>
      </div>
    </div>
  );
};
