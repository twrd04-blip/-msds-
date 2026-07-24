/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Download, Upload, RotateCcw, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import { HazardousFactor, GHS_PICTOGRAMS } from "../types";

interface ExportImportProps {
  factors: HazardousFactor[];
  onImport: (imported: HazardousFactor[]) => void;
  onReset: () => void;
}

export const ExportImport: React.FC<ExportImportProps> = ({
  factors,
  onImport,
  onReset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error" | null;
  }>({ text: "", type: null });
  const [showResetModal, setShowResetModal] = useState(false);

  const showStatus = (text: string, type: "success" | "error") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: "", type: null });
    }, 4000);
  };

  // Export to JSON Backup
  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(factors, null, 2));
      const downloadAnchor = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `유해인자대장_백업_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showStatus("대장 데이터가 성공적으로 내보내기 되었습니다.", "success");
    } catch (err) {
      showStatus("데이터 내보내기에 실패했습니다.", "error");
    }
  };

  // Export to CSV Sheet
  const handleExportCsv = () => {
    try {
      const headers = [
        "관리번호",
        "유해인자명(국문)",
        "유해인자명(영문)",
        "CAS번호",
        "분류",
        "사용부서",
        "취급공정",
        "노출기준(TWA)",
        "노출기준(STEL)",
        "작업환경측정주기",
        "특수검진대상여부",
        "정밀안전진단대상여부",
        "작업환경측정대상여부",
        "위험성수준",
        "GHS 유해성 그림문자",
      ];

      const csvRows = [headers.join(",")];

      for (const f of factors) {
        const ghsNames = f.ghsPictograms && f.ghsPictograms.length > 0
          ? f.ghsPictograms.map((key) => GHS_PICTOGRAMS[key]?.nameKo || key).join("; ")
          : "N/A";

        const values = [
          f.manageNo,
          `"${f.nameKo.replace(/"/g, '""')}"`,
          `"${f.nameEn.replace(/"/g, '""')}"`,
          f.casNo || "N/A",
          f.category,
          `"${f.department.replace(/"/g, '""')}"`,
          `"${f.process.replace(/"/g, '""')}"`,
          `"${(f.exposureLimitTwa || "N/A").replace(/"/g, '""')}"`,
          `"${(f.exposureLimitStel || "N/A").replace(/"/g, '""')}"`,
          `"${f.measurementInterval.replace(/"/g, '""')}"`,
          f.specialExam ? "Y" : "N",
          f.detailedSafetyDiagnostic ? "Y" : "N",
          f.workEnvMeasurement ? "Y" : "N",
          f.riskLevel,
          `"${ghsNames.replace(/"/g, '""')}"`,
        ];
        csvRows.push(values.join(","));
      }

      // Add UTF-8 BOM for Excel Korean compatibility
      const csvContent = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `유해인자대장_${dateStr}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showStatus("엑셀 호환 CSV 파일이 다운로드 되었습니다.", "success");
    } catch (err) {
      showStatus("CSV 변환 중 오류가 발생했습니다.", "error");
    }
  };

  // Import from JSON Backup
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const parsed = JSON.parse(result);

        if (Array.isArray(parsed)) {
          // Quick schema sanity check
          const isValid = parsed.every(
            (item) => item.id && item.nameKo && item.category && item.riskLevel
          );

          if (isValid) {
            onImport(parsed);
            showStatus(`총 ${parsed.length}건의 대장 정보를 성공적으로 복구했습니다.`, "success");
          } else {
            showStatus("올바르지 않은 백업 파일 형식이거나 손상된 데이터입니다.", "error");
          }
        } else {
          showStatus("JSON 백업 파일은 배열 구조여야 합니다.", "error");
        }
      } catch (err) {
        showStatus("백업 파일을 읽는 도중 오류가 발생했습니다.", "error");
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be imported again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmReset = () => {
    onReset();
    setShowResetModal(false);
    showStatus("표준 유해인자 대장 데이터로 초기화되었습니다.", "success");
  };

  return (
    <div className="bg-white border border-neutral-200 p-4 rounded-lg shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-neutral-800">
          대장 데이터 관리 및 안전진단 보존
        </span>
        <span className="text-xs text-neutral-500 mt-1">
          산업안전보건법 제114조 및 제115조에 따른 MSDS 및 유해인자 정보를 백업/보존하거나 백업본에서 복원할 수 있습니다.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Status indicator popup */}
        {statusMessage.text && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-sm animate-fade-in ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <button
          onClick={handleExportCsv}
          className="bg-neutral-800 hover:bg-neutral-900 text-white font-medium text-xs px-3.5 py-2 rounded-md flex items-center gap-1.5 transition-colors"
          id="btn-export-csv"
        >
          <Download size={14} />
          <span>엑셀 CSV 내보내기</span>
        </button>

        <button
          onClick={handleExportBackup}
          className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium text-xs px-3.5 py-2 rounded-md flex items-center gap-1.5 transition-colors"
          id="btn-export-backup"
        >
          <Download size={14} />
          <span>대장 백업 (.json)</span>
        </button>

        <button
          onClick={triggerFileInput}
          className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium text-xs px-3.5 py-2 rounded-md flex items-center gap-1.5 transition-colors"
          id="btn-import-backup"
        >
          <Upload size={14} />
          <span>대장 복원</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportBackup}
          accept=".json"
          className="hidden"
        />

        <button
          onClick={() => setShowResetModal(true)}
          className="bg-white border border-red-200 hover:bg-red-50 text-red-600 font-medium text-xs px-3 py-2 rounded-md flex items-center gap-1.5 transition-colors"
          id="btn-reset-default"
        >
          <RotateCcw size={14} />
          <span>표준 대장 리셋</span>
        </button>
      </div>

      {/* CUSTOM CONFIRM MODAL FOR RESET */}
      {showResetModal && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-neutral-200 overflow-hidden">
            <div className="bg-neutral-800 text-white px-5 py-3.5 flex items-center gap-2">
              <RotateCcw size={16} className="text-red-400" />
              <h4 className="font-bold text-sm">표준 대장 데이터 리셋 확인</h4>
            </div>
            <div className="p-5">
              <div className="flex gap-3 items-start">
                <div className="bg-red-100 text-red-600 p-2 rounded-full shrink-0">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 leading-normal">
                    주의: 정말로 대장을 초기 표준 데이터(벤젠, 톨루엔 등)로 강제 리셋하시겠습니까?
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                    현재까지 사용자가 직접 추가하거나 수정한 모든 유해인자 대장 기록이 사라지며 복구할 수 없습니다. 계속 진행하시겠습니까?
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 px-5 py-3 border-t border-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs px-3 py-2 rounded"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 rounded shadow-sm"
              >
                덮어쓰기 리셋
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
