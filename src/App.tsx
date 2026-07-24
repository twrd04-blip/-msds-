/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Shield,
  ShieldAlert,
  FileText,
  Printer,
  Edit,
  Trash2,
  Sparkles,
  Check,
  Eye,
  Info,
  X,
  HeartPulse,
  AlertTriangle,
  Clipboard,
  Copy,
  Users,
  Building,
  HelpCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { HazardousFactor, HazardCategory, RiskLevel, GHS_PICTOGRAMS } from "./types";
import { DEFAULT_HAZARDOUS_FACTORS } from "./data";
import { GhsIcon } from "./components/GhsIcon";
import { DashboardStats } from "./components/DashboardStats";
import { ExportImport } from "./components/ExportImport";

// Define default form data
const INITIAL_FORM_STATE = {
  manageNo: "",
  nameKo: "",
  nameEn: "",
  casNo: "",
  category: HazardCategory.CHEMICAL,
  department: "",
  process: "",
  exposureLimitTwa: "",
  exposureLimitStel: "",
  healthEffects: "",
  msdsLink: "",
  ppeRequired: [] as string[],
  safetyRules: "",
  emergencyRules: "",
  measurementInterval: "6개월 1회",
  specialExam: true,
  detailedSafetyDiagnostic: false,
  workEnvMeasurement: true,
  riskLevel: RiskLevel.MEDIUM,
  ghsPictograms: [] as string[],
};

// Common PPE list for quick selection
const COMMON_PPE_LIST = [
  "유기화합물용 방독마스크",
  "송기마스크",
  "보안경 (밀착 고글형)",
  "안면보호구 (Face Shield)",
  "내화학성 장갑 (니트릴)",
  "내화학성 장갑 (부틸)",
  "내화학성 장갑 (네오프렌)",
  "불침투성 보호의",
  "정전기방지 안전화",
  "귀마개 (Earplugs)",
  "귀덮개 (Earmuffs)",
  "특수 고무 장화",
  "방진 마스크 (1급 이상)",
  "허리보호대 (요추 지지대)",
];

export default function App() {
  // Primary State
  const [factors, setFactors] = useState<HazardousFactor[]>(() => {
    const saved = localStorage.getItem("hazard_factors");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Local storage loading error, reverting to default.", e);
      }
    }
    return DEFAULT_HAZARDOUS_FACTORS;
  });

  const [selectedFactorId, setSelectedFactorId] = useState<string>("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>("ALL");
  const [selectedExamFilter, setSelectedExamFilter] = useState<string>("ALL");
  const [selectedDiagnosticFilter, setSelectedDiagnosticFilter] = useState<string>("ALL");
  const [selectedMeasurementFilter, setSelectedMeasurementFilter] = useState<string>("ALL");

  // Delete Target Management State (Custom Modal Dialog replacement for window.confirm)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form Management State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // AI loading state
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Print Poster State
  const [showPosterFactor, setShowPosterFactor] = useState<HazardousFactor | null>(null);

  // Persistence effect
  useEffect(() => {
    localStorage.setItem("hazard_factors", JSON.stringify(factors));
  }, [factors]);

  // Find currently active factor
  const activeFactor = factors.find((f) => f.id === selectedFactorId) || factors[0] || null;

  // Filter Registry Items
  const filteredFactors = factors.filter((f) => {
    const matchesSearch =
      f.nameKo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.casNo && f.casNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      f.manageNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.process.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "ALL" || f.category === selectedCategory;

    const matchesRisk =
      selectedRiskFilter === "ALL" || f.riskLevel === selectedRiskFilter;

    const matchesExam =
      selectedExamFilter === "ALL" ||
      (selectedExamFilter === "YES" && f.specialExam) ||
      (selectedExamFilter === "NO" && !f.specialExam);

    const matchesDiagnostic =
      selectedDiagnosticFilter === "ALL" ||
      (selectedDiagnosticFilter === "YES" && f.detailedSafetyDiagnostic) ||
      (selectedDiagnosticFilter === "NO" && !f.detailedSafetyDiagnostic);

    const matchesMeasurement =
      selectedMeasurementFilter === "ALL" ||
      (selectedMeasurementFilter === "YES" && f.workEnvMeasurement) ||
      (selectedMeasurementFilter === "NO" && !f.workEnvMeasurement);

    return matchesSearch && matchesCategory && matchesRisk && matchesExam && matchesDiagnostic && matchesMeasurement;
  });

  // Action: Add new blank registry item
  const handleAddNewClick = () => {
    const nextNo = `HAZ-NEW-${String(factors.length + 1).padStart(3, "0")}`;
    setFormData({
      ...INITIAL_FORM_STATE,
      manageNo: nextNo,
    });
    setEditingId(null);
    setIsFormOpen(true);
  };

  // Action: Edit existing registry item
  const handleEditClick = (f: HazardousFactor) => {
    setFormData({
      manageNo: f.manageNo,
      nameKo: f.nameKo,
      nameEn: f.nameEn,
      casNo: f.casNo || "",
      category: f.category,
      department: f.department,
      process: f.process,
      exposureLimitTwa: f.exposureLimitTwa || "",
      exposureLimitStel: f.exposureLimitStel || "",
      healthEffects: f.healthEffects,
      msdsLink: f.msdsLink || "",
      ppeRequired: [...f.ppeRequired],
      safetyRules: f.safetyRules,
      emergencyRules: f.emergencyRules,
      measurementInterval: f.measurementInterval,
      specialExam: f.specialExam,
      detailedSafetyDiagnostic: f.detailedSafetyDiagnostic !== undefined ? f.detailedSafetyDiagnostic : false,
      workEnvMeasurement: f.workEnvMeasurement !== undefined ? f.workEnvMeasurement : false,
      riskLevel: f.riskLevel,
      ghsPictograms: [...f.ghsPictograms],
    });
    setEditingId(f.id);
    setIsFormOpen(true);
  };

  // Action: Delete registry item
  const handleDeleteFactor = (id: string) => {
    setDeleteTargetId(id);
  };

  // Action: Confirm and Delete
  const confirmDeleteFactor = () => {
    if (deleteTargetId) {
      const updated = factors.filter((f) => f.id !== deleteTargetId);
      setFactors(updated);
      if (selectedFactorId === deleteTargetId) {
        if (updated.length > 0) {
          setSelectedFactorId(updated[0].id);
        } else {
          setSelectedFactorId("");
        }
      }
      setDeleteTargetId(null);
    }
  };

  // Action: Submit Form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nameKo.trim()) {
      alert("유해인자 한글 명칭은 필수 입력값입니다.");
      return;
    }

    if (editingId) {
      // Update
      const updated = factors.map((f) => {
        if (f.id === editingId) {
          return {
            ...f,
            ...formData,
          };
        }
        return f;
      });
      setFactors(updated);
      setIsFormOpen(false);
      setEditingId(null);
    } else {
      // Create
      const newId = Date.now().toString();
      const newItem: HazardousFactor = {
        id: newId,
        ...formData,
        createdAt: new Date().toISOString(),
      };
      setFactors([newItem, ...factors]);
      setSelectedFactorId(newId);
      setIsFormOpen(false);
    }
  };

  // Action: Import complete list
  const handleImportList = (imported: HazardousFactor[]) => {
    setFactors(imported);
    if (imported.length > 0) {
      setSelectedFactorId(imported[0].id);
    }
  };

  // Action: Reset standard list
  const handleResetList = () => {
    setFactors(DEFAULT_HAZARDOUS_FACTORS);
    setSelectedFactorId("1");
  };

  // Action: Trigger Gemini AI Analysis and Autocomplete
  const handleAiFill = async () => {
    const queryName = formData.nameKo.trim();
    if (!queryName) {
      alert("AI 분석을 수행하려면 먼저 한글 명칭 칸에 유해인자명(예: 아세톤, 메탄올, X선, 염산 등)을 입력해주세요.");
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await fetch("/api/gemini/analyze-factor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: queryName,
          category: formData.category,
          casNo: formData.casNo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "분석 서버 응답 에러");
      }

      const parsedData = await response.json();

      // Overwrite the current form state with Gemini generated data
      setFormData((prev) => ({
        ...prev,
        nameKo: parsedData.nameKo || prev.nameKo,
        nameEn: parsedData.nameEn || prev.nameEn,
        casNo: parsedData.casNo && parsedData.casNo !== "N/A" ? parsedData.casNo : prev.casNo,
        exposureLimitTwa: parsedData.exposureLimitTwa || prev.exposureLimitTwa,
        exposureLimitStel: parsedData.exposureLimitStel && parsedData.exposureLimitStel !== "N/A" ? parsedData.exposureLimitStel : prev.exposureLimitStel,
        healthEffects: parsedData.healthEffects || prev.healthEffects,
        ppeRequired: parsedData.ppeRequired && parsedData.ppeRequired.length > 0 ? parsedData.ppeRequired : prev.ppeRequired,
        safetyRules: parsedData.safetyRules || prev.safetyRules,
        emergencyRules: parsedData.emergencyRules || prev.emergencyRules,
        ghsPictograms: parsedData.ghsPictograms || prev.ghsPictograms,
        riskLevel: parsedData.riskLevel as RiskLevel || prev.riskLevel,
        measurementInterval: parsedData.measurementInterval || prev.measurementInterval,
        specialExam: parsedData.specialExam !== undefined ? parsedData.specialExam : prev.specialExam,
        detailedSafetyDiagnostic: parsedData.detailedSafetyDiagnostic !== undefined ? parsedData.detailedSafetyDiagnostic : prev.detailedSafetyDiagnostic,
        workEnvMeasurement: parsedData.workEnvMeasurement !== undefined ? parsedData.workEnvMeasurement : prev.workEnvMeasurement,
      }));

    } catch (error: any) {
      console.error(error);
      alert(`AI 자동 작성 중 오류가 발생했습니다: ${error.message || "서버 응답을 확인해주십시오."}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Toggle GHS selection
  const handleGhsToggle = (key: string) => {
    if (formData.ghsPictograms.includes(key)) {
      setFormData({
        ...formData,
        ghsPictograms: formData.ghsPictograms.filter((k) => k !== key),
      });
    } else {
      setFormData({
        ...formData,
        ghsPictograms: [...formData.ghsPictograms, key],
      });
    }
  };

  // Toggle PPE selection
  const handlePpeToggle = (ppe: string) => {
    if (formData.ppeRequired.includes(ppe)) {
      setFormData({
        ...formData,
        ppeRequired: formData.ppeRequired.filter((p) => p !== ppe),
      });
    } else {
      setFormData({
        ...formData,
        ppeRequired: [...formData.ppeRequired, ppe],
      });
    }
  };

  // Helper: Copy Rules to Clipboard
  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    alert(`${title} 정보가 클립보드에 복사되었습니다!`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* Upper header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-sm" id="header-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white p-2 rounded-lg flex items-center justify-center">
              <Shield size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-neutral-100 border border-neutral-300 text-neutral-600 px-1.5 py-0.5 rounded">
                  산업안전보건법 제104조/114조
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Check size={10} /> OSH 안전기준 적합
                </span>
              </div>
              <h1 className="text-xl font-black text-neutral-800 tracking-tight mt-0.5">
                유해인자 대장 관리 시스템
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleAddNewClick}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm w-full md:w-auto"
              id="btn-add-factor"
            >
              <Plus size={16} />
              <span>신규 유해인자 등록</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compliance Dashboard Stats Panel */}
        <DashboardStats factors={factors} />

        {/* Data Import/Export backup Panel */}
        <ExportImport
          factors={factors}
          onImport={handleImportList}
          onReset={handleResetList}
        />

        {/* Search, filters & workspace split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Area: Filter Controls & Registry List (7 Cols) */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm flex flex-col gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-neutral-400" size={18} />
                <input
                  type="text"
                  placeholder="유해인자명, 영문명, CAS 번호, 부서 또는 취급공정 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500"
                />
              </div>

              {/* Advanced multi-row Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-neutral-100">
                {/* Risk Level Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                    위험성 수준
                  </label>
                  <select
                    value={selectedRiskFilter}
                    onChange={(e) => setSelectedRiskFilter(e.target.value)}
                    className="w-full text-xs bg-neutral-50 border border-neutral-200 p-1.5 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  >
                    <option value="ALL">전체 위험도</option>
                    <option value={RiskLevel.HIGH}>고위험 (3등급)</option>
                    <option value={RiskLevel.MEDIUM}>중위험 (2등급)</option>
                    <option value={RiskLevel.LOW}>저위험 (1등급)</option>
                  </select>
                </div>

                {/* Special Examination Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                    특수건강진단
                  </label>
                  <select
                    value={selectedExamFilter}
                    onChange={(e) => setSelectedExamFilter(e.target.value)}
                    className="w-full text-xs bg-neutral-50 border border-neutral-200 p-1.5 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  >
                    <option value="ALL">전체</option>
                    <option value="YES">대상</option>
                    <option value="NO">비대상</option>
                  </select>
                </div>

                {/* Detailed Safety Diagnostic Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                    정밀안전진단
                  </label>
                  <select
                    value={selectedDiagnosticFilter}
                    onChange={(e) => setSelectedDiagnosticFilter(e.target.value)}
                    className="w-full text-xs bg-neutral-50 border border-neutral-200 p-1.5 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  >
                    <option value="ALL">전체</option>
                    <option value="YES">대상</option>
                    <option value="NO">비대상</option>
                  </select>
                </div>

                {/* Work Env Measurement Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                    작업환경측정
                  </label>
                  <select
                    value={selectedMeasurementFilter}
                    onChange={(e) => setSelectedMeasurementFilter(e.target.value)}
                    className="w-full text-xs bg-neutral-50 border border-neutral-200 p-1.5 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  >
                    <option value="ALL">전체</option>
                    <option value="YES">대상</option>
                    <option value="NO">비대상</option>
                  </select>
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-100">
                <span className="text-[10px] font-bold text-neutral-400 mr-2">유해분류:</span>
                {[
                  { key: "ALL", label: "전체" },
                  { key: HazardCategory.CHEMICAL, label: "화학인자" },
                  { key: HazardCategory.PHYSICAL, label: "물리인자" },
                  { key: HazardCategory.ERGONOMIC, label: "인간공학" },
                  { key: HazardCategory.BIOLOGICAL, label: "생물학" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedCategory(tab.key)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedCategory === tab.key
                        ? "bg-neutral-800 text-white"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Registry table list */}
            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-600">
                  대장 인벤토리 (총 {filteredFactors.length}건 검색됨)
                </span>
                <span className="text-[10px] text-neutral-400">
                  항목 클릭 시 오른쪽에서 정밀 안전 보건 세부조회 및 인쇄가 가능합니다.
                </span>
              </div>

              {filteredFactors.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <Info size={40} className="text-neutral-300 mb-2" />
                  <span className="text-sm font-bold text-neutral-500">
                    조건에 해당하는 유해인자 대장 기록이 없습니다.
                  </span>
                  <span className="text-xs text-neutral-400 mt-1">
                    신규로 등록하거나 대장 초기 표준 리셋을 실행하십시오.
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-400 text-[11px] font-extrabold uppercase border-b border-neutral-200">
                        <th className="py-2.5 px-4">관리번호 / 인자명</th>
                        <th className="py-2.5 px-3">취급 부서 및 공정</th>
                        <th className="py-2.5 px-3">위험도</th>
                        <th className="py-2.5 px-3">안전보건대상</th>
                        <th className="py-2.5 px-3 text-right">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {filteredFactors.map((f) => {
                        const isSelected = f.id === selectedFactorId;
                        return (
                          <tr
                            key={f.id}
                            onClick={() => setSelectedFactorId(f.id)}
                            className={`cursor-pointer transition-colors hover:bg-neutral-50 ${
                              isSelected ? "bg-neutral-50 border-l-2 border-red-600" : ""
                            }`}
                          >
                            {/* ManageNo & Name */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                                <span>{f.manageNo}</span>
                                <span className="text-neutral-300">|</span>
                                <span>{f.category}</span>
                              </div>
                              <div className="font-bold text-neutral-900 mt-0.5 text-sm">
                                {f.nameKo}
                              </div>
                              <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                                <span className="font-mono">{f.nameEn}</span>
                                {f.casNo && f.casNo !== "N/A" && (
                                  <>
                                    <span className="text-neutral-300">•</span>
                                    <span className="bg-neutral-100 text-neutral-600 px-1 py-0.2 rounded font-mono text-[10px]">
                                      CAS {f.casNo}
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Department & Process */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1 text-neutral-700 font-semibold">
                                <Building size={12} className="text-neutral-400" />
                                <span>{f.department}</span>
                              </div>
                              <div className="text-neutral-400 text-[11px] mt-0.5">
                                {f.process}
                              </div>
                            </td>

                            {/* Risk level badges */}
                            <td className="py-3 px-3">
                              {f.riskLevel === RiskLevel.HIGH ? (
                                <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-extrabold text-[10px] inline-block">
                                  {f.riskLevel}
                                </span>
                              ) : f.riskLevel === RiskLevel.MEDIUM ? (
                                <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded font-extrabold text-[10px] inline-block">
                                  {f.riskLevel}
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-extrabold text-[10px] inline-block">
                                  {f.riskLevel}
                                </span>
                              )}
                            </td>

                            {/* Safety & Health target indicators */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1 items-start">
                                {f.specialExam ? (
                                  <span className="text-blue-700 font-bold bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[9px] inline-flex items-center gap-0.5 whitespace-nowrap">
                                    <HeartPulse size={8} /> 특수검진
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 text-[9px] px-1.5 font-mono">특수검진 -</span>
                                )}
                                {f.detailedSafetyDiagnostic ? (
                                  <span className="text-amber-700 font-bold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[9px] inline-flex items-center gap-0.5 whitespace-nowrap">
                                    정밀진단
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 text-[9px] px-1.5 font-mono">정밀진단 -</span>
                                )}
                                {f.workEnvMeasurement ? (
                                  <span className="text-teal-700 font-bold bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded text-[9px] inline-flex items-center gap-0.5 whitespace-nowrap">
                                    환경측정
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 text-[9px] px-1.5 font-mono">환경측정 -</span>
                                )}
                              </div>
                            </td>

                            {/* Management Actions */}
                            <td className="py-3 px-3 text-right">
                              <div
                                className="inline-flex gap-1"
                                onClick={(e) => e.stopPropagation()} // Stop selection cascade
                              >
                                <button
                                  onClick={() => handleEditClick(f)}
                                  className="p-1 hover:bg-neutral-200 rounded text-neutral-600"
                                  title="대장 편집"
                                  id={`btn-edit-${f.id}`}
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteFactor(f.id)}
                                  className="p-1 hover:bg-red-100 rounded text-red-600"
                                  title="대장 삭제"
                                  id={`btn-delete-${f.id}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Right Area: Dynamic Panel / View or Edit (5 Cols) */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            {activeFactor ? (
              <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                {/* Panel Header */}
                <div className="bg-neutral-800 text-white p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} className="text-red-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">
                      {activeFactor.manageNo}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowPosterFactor(activeFactor)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors"
                      id="btn-print-active-poster"
                    >
                      <Printer size={12} />
                      <span>보건안내판 인쇄</span>
                    </button>
                    <button
                      onClick={() => handleEditClick(activeFactor)}
                      className="bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-xs px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors"
                      id="btn-edit-active"
                    >
                      <Edit size={12} />
                      <span>수정</span>
                    </button>
                  </div>
                </div>

                {/* Main View Details */}
                <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[750px]">
                  {/* Category, Title & CAS */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                        {activeFactor.category}
                      </span>
                      {activeFactor.specialExam && (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                          특수건강진단 대상
                        </span>
                      )}
                      {activeFactor.detailedSafetyDiagnostic && (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                          정밀안전진단 대상
                        </span>
                      )}
                      {activeFactor.workEnvMeasurement && (
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded">
                          작업환경측정 대상
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight mt-2">
                      {activeFactor.nameKo}
                    </h2>
                    <p className="text-xs text-neutral-500 font-mono mt-0.5 uppercase">
                      {activeFactor.nameEn}
                    </p>

                    {activeFactor.casNo && activeFactor.casNo !== "N/A" && (
                      <div className="mt-2.5 inline-flex items-center gap-2 bg-neutral-100 px-2.5 py-1 rounded text-xs">
                        <span className="font-extrabold text-neutral-500">CAS Registry No:</span>
                        <span className="font-mono text-neutral-900 font-bold">
                          {activeFactor.casNo}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Standard OSH Exposure values */}
                  <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold block">
                        노출기준 TWA (시간가중평균)
                      </span>
                      <span className="text-sm font-bold text-neutral-800 mt-0.5 block">
                        {activeFactor.exposureLimitTwa || "규정 수치 없음"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold block">
                        노출기준 STEL / 최고한도
                      </span>
                      <span className="text-sm font-bold text-neutral-800 mt-0.5 block">
                        {activeFactor.exposureLimitStel || "N/A"}
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-neutral-100 mt-1 flex justify-between text-[11px]">
                      <div>
                        <span className="text-neutral-400 font-medium">측정 주기:</span>{" "}
                        <span className="font-bold text-neutral-800">
                          {activeFactor.measurementInterval}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 font-medium">부서/공정:</span>{" "}
                        <span className="font-bold text-neutral-800">
                          {activeFactor.department} ({activeFactor.process})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* GHS Pictograms block (for Chemicals) */}
                  {activeFactor.ghsPictograms && activeFactor.ghsPictograms.length > 0 && (
                    <div className="border-t border-neutral-100 pt-4">
                      <h3 className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider mb-3">
                        GHS 물질 유해성 그림문자
                      </h3>
                      <div className="flex flex-wrap gap-4 py-2 bg-neutral-50/50 p-3 rounded-lg border border-dashed border-neutral-200">
                        {activeFactor.ghsPictograms.map((picto) => (
                          <GhsIcon key={picto} type={picto} size="md" showLabel={true} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Health Effects & Symptoms */}
                  <div className="border-t border-neutral-100 pt-4">
                    <h3 className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider mb-2">
                      주요 유해성 및 인체 영향
                    </h3>
                    <p className="text-xs text-neutral-700 leading-relaxed bg-red-50/30 border border-red-100/50 p-3 rounded-lg font-medium">
                      {activeFactor.healthEffects}
                    </p>
                  </div>

                  {/* PPE required checkboxes */}
                  <div className="border-t border-neutral-100 pt-4">
                    <h3 className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider mb-2">
                      공정 취급 시 필수 개인보호구
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {activeFactor.ppeRequired.map((ppe) => (
                        <span
                          key={ppe}
                          className="bg-blue-50 text-blue-800 border border-blue-100 text-[11px] font-bold px-2.5 py-1 rounded"
                        >
                          🛡️ {ppe}
                        </span>
                      ))}
                      {activeFactor.ppeRequired.length === 0 && (
                        <span className="text-xs text-neutral-400 font-semibold italic">
                          지정된 특수 개인보호구 없음
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Safe Work Rules (작업안전수칙) */}
                  <div className="border-t border-neutral-100 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">
                        현장 취급 시 안전작업 수칙
                      </h3>
                      <button
                        onClick={() =>
                          copyToClipboard(activeFactor.safetyRules, "안전작업 수칙")
                        }
                        className="text-neutral-500 hover:text-neutral-800 text-[11px] font-semibold flex items-center gap-1"
                        id="btn-copy-safety-rules"
                      >
                        <Copy size={12} />
                        <span>복사</span>
                      </button>
                    </div>
                    <pre className="bg-neutral-900 text-neutral-100 p-3.5 rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap">
                      {activeFactor.safetyRules}
                    </pre>
                  </div>

                  {/* Emergency Procedures (비상 조치 요령) */}
                  <div className="border-t border-neutral-100 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">
                        누출 및 인체 접촉 시 비상 조치 요령
                      </h3>
                      <button
                        onClick={() =>
                          copyToClipboard(activeFactor.emergencyRules, "비상조치 요령")
                        }
                        className="text-neutral-500 hover:text-neutral-800 text-[11px] font-semibold flex items-center gap-1"
                        id="btn-copy-emergency-rules"
                      >
                        <Copy size={12} />
                        <span>복사</span>
                      </button>
                    </div>
                    <pre className="bg-neutral-900 text-neutral-100 p-3.5 rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap">
                      {activeFactor.emergencyRules}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-lg p-8 shadow-sm text-center">
                <p className="text-neutral-400 text-sm">유해인자를 선택하거나 등록해주십시오.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-neutral-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span>© 2026 OSH Hazardous Factors Compliance System. All Rights Reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-neutral-700">산업안전보건법 제114조 준수</span>
            <span className="text-neutral-300">|</span>
            <span className="font-semibold text-neutral-700">Gemini AI 안전 진단 엔진</span>
          </div>
        </div>
      </footer>

      {/* FORM DIALOG/MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl border border-neutral-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Form Title banner with Gemini AI prompt assistant */}
            <div className="bg-neutral-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-red-400" />
                <h3 className="font-black text-base">
                  {editingId ? "유해인자 대장 정보 수정" : "신규 유해인자 대장 등록"}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors"
                id="btn-close-form"
              >
                <X size={18} />
              </button>
            </div>

            {/* AI Assistant Banner */}
            <div className="bg-red-50 border-b border-red-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-2.5">
                <div className="bg-red-600 text-white p-2 rounded flex items-center justify-center shrink-0 w-9 h-9">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-red-900">
                    Gemini 3.6 Flash - AI 원클릭 자동 작성 어시스턴트
                  </h4>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    한글 유해인자명(예: 아세톤, 포르말린 등)만 입력하고 버튼을 누르면 MSDS 노출기준, PPE, GHS 기호, 안전 수칙을 완벽하게 자동 기입합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAiFill}
                disabled={isAiLoading}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-md flex items-center justify-center gap-1 transition-all shrink-0 shadow-sm"
                id="btn-ai-autofill"
              >
                {isAiLoading ? (
                  <>
                    <Clock size={12} className="animate-spin" />
                    <span>AI 안전 정보 작성중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    <span>AI 원클릭 자동 작성</span>
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="overflow-y-auto p-6 flex-1 flex flex-col gap-5">
              {/* Core fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    관리 대장 번호 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.manageNo}
                    onChange={(e) => setFormData({ ...formData, manageNo: e.target.value })}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    인자 대분류 *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as HazardCategory })
                    }
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  >
                    <option value={HazardCategory.CHEMICAL}>{HazardCategory.CHEMICAL}</option>
                    <option value={HazardCategory.PHYSICAL}>{HazardCategory.PHYSICAL}</option>
                    <option value={HazardCategory.ERGONOMIC}>{HazardCategory.ERGONOMIC}</option>
                    <option value={HazardCategory.BIOLOGICAL}>{HazardCategory.BIOLOGICAL}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    위험성평가 위험수준 *
                  </label>
                  <select
                    value={formData.riskLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, riskLevel: e.target.value as RiskLevel })
                    }
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  >
                    <option value={RiskLevel.HIGH}>{RiskLevel.HIGH}</option>
                    <option value={RiskLevel.MEDIUM}>{RiskLevel.MEDIUM}</option>
                    <option value={RiskLevel.LOW}>{RiskLevel.LOW}</option>
                  </select>
                </div>
              </div>

              {/* Names & CAS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    유해인자명 (국문) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 벤젠 (또는 아세톤)"
                    value={formData.nameKo}
                    onChange={(e) => setFormData({ ...formData, nameKo: e.target.value })}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    공식 영문명 (English)
                  </label>
                  <input
                    type="text"
                    placeholder="예: Benzene"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    CAS 번호 (화학 물질 해당)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 71-43-2"
                    value={formData.casNo}
                    onChange={(e) => setFormData({ ...formData, casNo: e.target.value })}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>
              </div>

              {/* Department & Process */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    취급 및 보관 부서 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 조립2부, 도장팀, 생산기술소"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    유해인자 노출 공정 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 제품 표면 유기용제 탈지/세척 공정"
                    value={formData.process}
                    onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>
              </div>

              {/* OSHA limits */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    노출 기준치 TWA (8시간 기준)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 0.5 ppm 또는 90 dBA"
                    value={formData.exposureLimitTwa}
                    onChange={(e) => setFormData({ ...formData, exposureLimitTwa: e.target.value })}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    STEL / Ceiling 값
                  </label>
                  <input
                    type="text"
                    placeholder="예: 2.5 ppm"
                    value={formData.exposureLimitStel}
                    onChange={(e) => setFormData({ ...formData, exposureLimitStel: e.target.value })}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    작업환경측정 주기
                  </label>
                  <input
                    type="text"
                    value={formData.measurementInterval}
                    onChange={(e) => setFormData({ ...formData, measurementInterval: e.target.value })}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.specialExam}
                      onChange={(e) => setFormData({ ...formData, specialExam: e.target.checked })}
                      className="w-4 h-4 rounded border-neutral-300 text-neutral-800 focus:ring-neutral-500"
                    />
                    <div>
                      <span className="text-xs font-black text-neutral-800">
                        특수건강진단 대상
                      </span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        지정 의료기관에서 정기 건강검진을 정기 수검해야 하는 유해인자 대상입니다.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.detailedSafetyDiagnostic}
                      onChange={(e) => setFormData({ ...formData, detailedSafetyDiagnostic: e.target.checked })}
                      className="w-4 h-4 rounded border-neutral-300 text-neutral-800 focus:ring-neutral-500"
                    />
                    <div>
                      <span className="text-xs font-black text-neutral-800">
                        정밀안전진단 대상
                      </span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        정기 정밀 점검 및 법령에 따른 안전진단 대상 유해공정 물질입니다.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.workEnvMeasurement}
                      onChange={(e) => setFormData({ ...formData, workEnvMeasurement: e.target.checked })}
                      className="w-4 h-4 rounded border-neutral-300 text-neutral-800 focus:ring-neutral-500"
                    />
                    <div>
                      <span className="text-xs font-black text-neutral-800">
                        작업환경측정 대상
                      </span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        산업위생 기준에 의거하여 노출 실태(농도/소음 강도) 측정이 정기 수반되는 유해인자 대상입니다.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Chemical MSDS GHS Pictograms selection */}
              {formData.category === HazardCategory.CHEMICAL && (
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-2">
                    MSDS GHS 경고 그림문자 선택 (화학물질 해당)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 bg-neutral-50 p-4 border border-neutral-300 rounded-lg">
                    {Object.keys(GHS_PICTOGRAMS).map((key) => {
                      const isSelected = formData.ghsPictograms.includes(key);
                      const item = GHS_PICTOGRAMS[key];
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => handleGhsToggle(key)}
                          className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all ${
                            isSelected
                              ? "bg-red-50 border-red-500 ring-2 ring-red-200"
                              : "bg-white border-neutral-300 hover:bg-neutral-50"
                          }`}
                        >
                          <GhsIcon type={key} size="sm" />
                          <span className="text-[9px] font-bold text-neutral-600 mt-1 text-center">
                            {item.nameKo}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Health effects */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">
                  인체 유해성 및 중독 건강 영향
                </label>
                <textarea
                  placeholder="예: 발암성, 중추신경계 손상, 급성 신장 유해성, 어지럼증 및 피부염 유발."
                  value={formData.healthEffects}
                  onChange={(e) => setFormData({ ...formData, healthEffects: e.target.value })}
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2.5 rounded h-16 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                />
              </div>

              {/* Quick PPE Required checkboxes */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-2">
                  작업 취급 시 필수 지급/착용 개인보호구
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-neutral-50 p-3.5 border border-neutral-300 rounded-lg max-h-44 overflow-y-auto text-xs">
                  {COMMON_PPE_LIST.map((ppe) => {
                    const isSelected = formData.ppeRequired.includes(ppe);
                    return (
                      <button
                        type="button"
                        key={ppe}
                        onClick={() => handlePpeToggle(ppe)}
                        className={`py-1.5 px-3 rounded border text-left flex items-center justify-between font-semibold transition-colors ${
                          isSelected
                            ? "bg-blue-50 border-blue-500 text-blue-900"
                            : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        <span>{ppe}</span>
                        {isSelected && <Check size={12} className="text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Safety guidelines text fields */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">
                  안전취급 작업수칙
                </label>
                <textarea
                  placeholder="1. 작업 전 배기장치를 점검하십시오.&#10;2. 안전보호구를 확실히 고정하십시오.&#10;3. 취급 구역 내 취식 및 흡연을 철저히 금지합니다."
                  value={formData.safetyRules}
                  onChange={(e) => setFormData({ ...formData, safetyRules: e.target.value })}
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2.5 rounded h-24 font-mono focus:outline-none focus:ring-1 focus:ring-neutral-500"
                />
              </div>

              {/* Emergency instructions */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">
                  비상 대응 및 응급 처치 요령
                </label>
                <textarea
                  placeholder="1. 흡입 시 신선한 공기가 있는 야외로 대피시키십시오.&#10;2. 누출 시 소독흡착포로 오염 부위를 차단하십시오."
                  value={formData.emergencyRules}
                  onChange={(e) => setFormData({ ...formData, emergencyRules: e.target.value })}
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 p-2.5 rounded h-24 font-mono focus:outline-none focus:ring-1 focus:ring-neutral-500"
                />
              </div>
            </form>

            {/* Form actions */}
            <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-all"
                id="btn-cancel-submit"
              >
                취소
              </button>
              <button
                onClick={handleFormSubmit}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-all shadow-sm"
                id="btn-confirm-submit"
              >
                {editingId ? "대장 수정 저장" : "새 유해인자 추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE SAFETY POSTER / BOARD (작업장 부착용 물질안전 작업수칙) */}
      {showPosterFactor && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl border border-neutral-300 overflow-hidden my-6">
            {/* Control banner */}
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between no-print border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-red-400" />
                <span className="font-bold text-sm">
                  작업장 부착용 경고 표지 / 물질안전보건 게시판 (A4 규격 인쇄 대응)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-red-600 hover:bg-red-700 text-white font-black text-xs px-4 py-2 rounded shadow-sm flex items-center gap-1.5 transition-colors"
                  id="btn-print-exec"
                >
                  <Printer size={14} />
                  <span>경고 표지 인쇄 (Print)</span>
                </button>
                <button
                  onClick={() => setShowPosterFactor(null)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs px-3 py-2 rounded transition-colors"
                  id="btn-print-close"
                >
                  닫기
                </button>
              </div>
            </div>

            {/* Printable Area - Formatted with high industrial standards */}
            <div className="p-8 bg-white text-neutral-900 border-8 border-red-600 m-4 rounded shadow-inner" id="printable-board">
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #printable-board, #printable-board * {
                    visibility: visible;
                  }
                  #printable-board {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    border: 12px solid #dc2626 !important;
                    padding: 24px !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}</style>

              {/* Poster Header */}
              <div className="text-center pb-5 border-b-4 border-red-600">
                <span className="text-xs font-black uppercase text-red-600 tracking-widest block bg-red-50 py-1.5 px-3 border border-red-200 inline-block mb-2">
                  경고 • 작업장 필수 부착 (산업안전보건법 제114조)
                </span>
                <h1 className="text-4xl font-extrabold text-neutral-950 tracking-tighter mt-1">
                  유해화학물질 안전 보건 작업 수칙
                </h1>
                <p className="text-sm font-semibold text-neutral-500 mt-1 uppercase tracking-wider">
                  Material Safety Handling Precautions & Workplace warning board
                </p>
              </div>

              {/* Substance Identification Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b-2 border-neutral-300 bg-neutral-50 p-4 mt-4">
                <div className="md:col-span-2">
                  <span className="text-[11px] font-bold text-neutral-400 block uppercase">
                    유해인자 표준 국문/영문 명칭
                  </span>
                  <h2 className="text-3xl font-black text-neutral-950 tracking-tight mt-0.5">
                    {showPosterFactor.nameKo}
                  </h2>
                  <span className="text-sm font-bold text-neutral-600 block mt-0.5 font-mono">
                    {showPosterFactor.nameEn}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 block">
                    CAS REGISTRY NUMBER
                  </span>
                  <span className="text-xl font-bold font-mono text-neutral-900 block mt-1">
                    {showPosterFactor.casNo || "N/A (물리적 인자)"}
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
                    <span>OEL TWA: {showPosterFactor.exposureLimitTwa || "없음"}</span>
                  </div>
                </div>
              </div>

              {/* Legal Classifications on printed Board */}
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold justify-center border-b border-neutral-200 pb-4 no-print">
                <span className={`px-2.5 py-1 rounded border ${showPosterFactor.specialExam ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-neutral-100 text-neutral-400 border-neutral-200"}`}>
                  특수건강진단: {showPosterFactor.specialExam ? "■ 대상 (정기수검)" : "□ 해당없음"}
                </span>
                <span className={`px-2.5 py-1 rounded border ${showPosterFactor.detailedSafetyDiagnostic ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-neutral-100 text-neutral-400 border-neutral-200"}`}>
                  정밀안전진단: {showPosterFactor.detailedSafetyDiagnostic ? "■ 대상 (정밀점검)" : "□ 해당없음"}
                </span>
                <span className={`px-2.5 py-1 rounded border ${showPosterFactor.workEnvMeasurement ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-neutral-100 text-neutral-400 border-neutral-200"}`}>
                  작업환경측정: {showPosterFactor.workEnvMeasurement ? "■ 대상 (반기측정)" : "□ 해당없음"}
                </span>
              </div>

              {/* Dynamic GHS Pictograms Block (Wide display) */}
              {showPosterFactor.ghsPictograms && showPosterFactor.ghsPictograms.length > 0 && (
                <div className="py-6 border-b-2 border-neutral-300">
                  <span className="text-[11px] font-bold text-neutral-400 block uppercase mb-4 text-center">
                    GHS 유해•위험 분류 기준에 의한 그림문자 (GHS Hazard Symbols)
                  </span>
                  <div className="flex justify-center items-center gap-10 py-2">
                    {showPosterFactor.ghsPictograms.map((pic) => (
                      <div key={pic} className="transform scale-125">
                        <GhsIcon type={pic} size="lg" showLabel={true} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Split Content layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                {/* Left Column: Health effects & PPE */}
                <div className="flex flex-col gap-5 border-r border-neutral-200 pr-6">
                  <div>
                    <h3 className="text-sm font-black text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle size={14} /> 주요 건강 영향 및 급성 위해성
                    </h3>
                    <p className="text-xs font-bold text-neutral-800 leading-relaxed bg-red-50 p-4 border border-red-200 rounded">
                      {showPosterFactor.healthEffects}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Shield size={14} /> 취급 시 의무 착용 보호구 (Mandatory PPE)
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-neutral-800">
                      {showPosterFactor.ppeRequired.map((ppe) => (
                        <div key={ppe} className="bg-neutral-50 p-2 border.5 border-neutral-200 rounded flex items-center gap-1">
                          <span>🛡️</span>
                          <span>{ppe}</span>
                        </div>
                      ))}
                      {showPosterFactor.ppeRequired.length === 0 && (
                        <span className="text-xs text-neutral-400 italic">없음</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Safe practices */}
                <div className="flex flex-col gap-5">
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Check size={14} /> 필수 현장 취급 및 작업 수칙
                    </h3>
                    <pre className="bg-neutral-950 text-neutral-100 p-4 rounded text-xs font-mono leading-relaxed whitespace-pre-wrap">
                      {showPosterFactor.safetyRules}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Emergency response section */}
              <div className="py-5 border-t-2 border-neutral-300 mt-2">
                <h3 className="text-sm font-black text-red-700 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                  <ShieldAlert size={15} /> 비상 접촉 및 응급 조치 요령 (Emergency Response)
                </h3>
                <pre className="bg-neutral-950 text-neutral-100 p-4 rounded text-xs font-mono leading-relaxed whitespace-pre-wrap">
                  {showPosterFactor.emergencyRules}
                </pre>
              </div>

              {/* Poster Footer */}
              <div className="border-t-4 border-red-600 pt-5 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-extrabold text-neutral-900 block">
                    보건 안전 관리 부서: 생산보건관리팀
                  </span>
                  <span className="text-neutral-400 block mt-0.5">
                    연락처: 사내 내선 3004 또는 119 (의무실)
                  </span>
                </div>
                <div className="text-right sm:text-right font-black text-neutral-900 tracking-tight">
                  <span className="bg-red-600 text-white px-3 py-1 font-extrabold rounded">
                    안전보건 관리 책임자 승인필
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-neutral-200 overflow-hidden">
            <div className="bg-red-600 text-white px-5 py-3.5 flex items-center gap-2">
              <Trash2 size={16} />
              <h4 className="font-bold text-sm">대장 기록 삭제 확인</h4>
            </div>
            <div className="p-5">
              <div className="flex gap-3 items-start">
                <div className="bg-red-50 text-red-600 p-2.5 rounded-full shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 leading-normal">
                    정말로 이 유해인자 대장 기록을 영구 삭제하시겠습니까?
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed font-semibold">
                    선택한 유해인자의 모든 MSDS 노출기준, 수칙, 보건내용 및 부착용 표지 데이터가 안전 시스템에서 완전히 제거되며 복구할 수 없습니다.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 px-5 py-3 border-t border-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs px-3 py-2 rounded"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDeleteFactor}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 rounded shadow-sm"
              >
                영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
