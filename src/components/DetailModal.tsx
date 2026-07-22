import React, { useState } from 'react';
import { Chemical, GhsHazards, RevisionLog } from '../types';
import { X, Calendar, FileText, Edit2, Trash2, Shield, History, MapPin, Save, AlertTriangle, CheckSquare, Square, Beaker, HelpCircle, Download, Upload, Info } from 'lucide-react';

interface DetailModalProps {
  chemical: Chemical;
  onClose: () => void;
  onUpdate: (id: string, updatedFields: Partial<Chemical>, author: string, changeSummary: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddAttachment: (chemicalId: string, fileName: string, fileData: string, type: 'test_report' | 'purchase_history' | 'other') => Promise<void>;
  managers: Record<string, string>;
}

const HAZARD_LABELS: Record<keyof GhsHazards, string> = {
  explosive: '💥 폭발성',
  flammable: '🔥 인화성',
  oxidizing: '🧪 산화성',
  gasUnderPressure: '🎈 고압가스',
  corrosive: '⚠️ 부식성',
  acuteToxicity: '💀 급성독성',
  healthHazard: '☣️ 건강유해성',
  irritant: '❗ 자극성(경고)',
  environmentalHazard: '🐟 환경유해성'
};

const UNIT_OPTIONS = ['L', 'mL', 'kg', 'g', '개'];

export default function DetailModal({ chemical, onClose, onUpdate, onDelete, onAddAttachment, managers }: DetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit fields state
  const [name, setName] = useState(chemical.name);
  const [casNo, setCasNo] = useState(chemical.casNo);
  const [manufacturer, setManufacturer] = useState(chemical.manufacturer);
  const [quantity, setQuantity] = useState(chemical.quantity);
  const [unit, setUnit] = useState(chemical.unit);
  const [labName, setLabName] = useState(chemical.labName || Object.keys(managers)[0] || '미지정');
  const [locationOption, setLocationOption] = useState(chemical.location || '');

  const [ghsHazards, setGhsHazards] = useState<GhsHazards>({ ...chemical.ghsHazards });
  const [isSafetyDiagnosis, setIsSafetyDiagnosis] = useState(chemical.isSafetyDiagnosis);
  const [isWorkEnvMeasure, setIsWorkEnvMeasure] = useState(chemical.isWorkEnvMeasure);
  const [isSpecialHealthCheck, setIsSpecialHealthCheck] = useState(chemical.isSpecialHealthCheck);

  // Additional MSDS core fields
  const [unNo, setUnNo] = useState(chemical.unNo || '');
  const [formula, setFormula] = useState(chemical.formula || '');
  const [usage, setUsage] = useState(chemical.usage || '');
  const [firstAid, setFirstAid] = useState(chemical.firstAid || '');
  const [storageMethod, setStorageMethod] = useState(chemical.storageMethod || '');

  // Legal basis reasons
  const [safetyDiagnosisReason, setSafetyDiagnosisReason] = useState(chemical.safetyDiagnosisReason || '');
  const [workEnvMeasureReason, setWorkEnvMeasureReason] = useState(chemical.workEnvMeasureReason || '');
  const [specialHealthCheckReason, setSpecialHealthCheckReason] = useState(chemical.specialHealthCheckReason || '');

  // Audit Fields
  const [changeSummary, setChangeSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Attachment upload state
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentType, setAttachmentType] = useState<'test_report' | 'purchase_history' | 'other'>('test_report');

  const handleToggleHazard = (key: keyof GhsHazards) => {
    setGhsHazards((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!changeSummary.trim()) {
      setError('변경 내용 요약을 작성해주세요.');
      return;
    }

    setIsSaving(true);
    const finalLocation = locationOption.trim();
    const authorStr = managers[labName] || '연구실 담당자';

    try {
      const updatedFields: Partial<Chemical> = {
        name,
        casNo,
        manufacturer,
        quantity: Number(quantity),
        unit,
        location: finalLocation,
        ghsHazards,
        isSafetyDiagnosis,
        isWorkEnvMeasure,
        isSpecialHealthCheck,
        labName,
        unNo,
        formula,
        usage,
        firstAid,
        storageMethod,
        safetyDiagnosisReason,
        workEnvMeasureReason,
        specialHealthCheckReason
      };

      await onUpdate(chemical.id, updatedFields, authorStr, changeSummary);
      setIsEditing(false);
      setChangeSummary('');
    } catch (err: any) {
      setError(err.message || '수정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await onDelete(chemical.id);
      onClose();
    } catch (err: any) {
      setError(err.message || '삭제에 실패했습니다.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          await onAddAttachment(chemical.id, file.name, base64, attachmentType);
        } catch (err: any) {
          setError(err.message || '파일 첨부에 실패했습니다.');
        } finally {
          setUploadingAttachment(false);
        }
      };
      reader.onerror = () => {
        setError('파일을 읽지 못했습니다.');
        setUploadingAttachment(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message);
      setUploadingAttachment(false);
    }
  };

  const renderLogDiff = (log: RevisionLog) => {
    if (!log.beforeValue || !log.afterValue) return null;
    try {
      const before = JSON.parse(log.beforeValue);
      const after = JSON.parse(log.afterValue);
      
      const renderVal = (v: any) => {
        if (typeof v === 'boolean') return v ? '참' : '거짓';
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
      };

      return (
        <div className="mt-2 p-2 bg-slate-100 rounded-lg border border-slate-200/50 space-y-1 text-[10px]">
          <p className="font-semibold text-slate-500 mb-1">상세 변경 정보 (Diff):</p>
          {Object.keys(after).map((key) => {
            const beforeVal = before[key];
            const afterVal = after[key];
            return (
              <div key={key} className="flex flex-wrap items-center gap-1">
                <span className="font-bold bg-slate-200 px-1 py-0.5 rounded text-slate-700">{key}</span>
                <span className="text-red-600 line-through truncate max-w-[120px]">{renderVal(beforeVal) || '없음'}</span>
                <span className="text-gray-400">➔</span>
                <span className="text-emerald-700 font-semibold truncate max-w-[120px]">{renderVal(afterVal) || '없음'}</span>
              </div>
            );
          })}
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  const getConfidenceBadge = (score?: number) => {
    if (score === undefined) return null;
    let colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (score < 50) colorClass = 'bg-red-100 text-red-800 border-red-200';
    else if (score < 80) colorClass = 'bg-amber-100 text-amber-800 border-amber-200';

    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${colorClass}`}>
        AI 신뢰도 {score}%
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in" id="detail-modal-container">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Colorful top accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600"></div>

        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-gray-400 font-mono">순번 {chemical.num}</span>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">{chemical.labName || '미지정 연구실'}</span>
            <h2 className="text-base font-bold text-gray-900 truncate max-w-[320px]">
              {isEditing ? '화학물질 정보 수정 및 이력 기록' : chemical.name}
            </h2>
            {!isEditing && getConfidenceBadge(chemical.confidenceName)}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isEditing ? (
            /* VIEW MODE */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Details block */}
              <div className="lg:col-span-2 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">CAS Registry Number</span>
                    <span className="font-bold font-mono text-gray-900 text-sm flex items-center gap-1">
                      {chemical.casNo || '미지정'}
                      {getConfidenceBadge(chemical.confidenceCasNo)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">제조 및 공급처</span>
                    <span className="font-bold text-gray-900 text-sm block">
                      {chemical.manufacturer || '미기재'}
                      {getConfidenceBadge(chemical.confidenceManufacturer)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">소속 연구실</span>
                    <span className="font-bold text-gray-900 text-sm block">{chemical.labName || '미지정'}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-400 block mb-0.5">현재 보관 장소</span>
                    <span className="font-bold text-gray-900 text-sm inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" /> {chemical.location}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-400 block mb-0.5">현재 총 보유량</span>
                    <span className="font-bold text-blue-600 text-sm block">
                      {chemical.quantity.toLocaleString()} {chemical.unit}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-400 block mb-0.5">대장 보관/취급 상태</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                      chemical.status === '폐기'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : chemical.status === '비활성'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {chemical.status || '사용중'}
                    </span>
                  </div>
                </div>

                {/* Additional MSDS core information */}
                <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200/50">
                    <Beaker className="w-4 h-4 text-blue-600" /> MSDS 핵심 상세 정보 (AI OCR 추출 결과)
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">유엔 번호 (UN Number)</span>
                      <span className="font-bold text-slate-800 font-mono">{chemical.unNo || '미기재'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">분자식 (Chemical Formula)</span>
                      <span className="font-bold text-slate-800 font-mono">{chemical.formula || '미기재'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block mb-0.5">권장 용도 (Recommended Usage)</span>
                      <span className="font-semibold text-slate-800">{chemical.usage || '실험실 연구용 시약'}</span>
                    </div>
                    <div className="col-span-2 bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block mb-1 font-semibold">🚑 응급조치 요령 (First-Aid Measures)</span>
                      <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{chemical.firstAid || '특이사항 없음. 노출 시 물로 충분히 세척할 것.'}</p>
                    </div>
                    <div className="col-span-2 bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block mb-1 font-semibold">🔒 보관 및 취급방법 (Handling & Storage)</span>
                      <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{chemical.storageMethod || '밀폐하여 서늘하고 통풍이 잘 되는 곳에 보관할 것.'}</p>
                    </div>
                  </div>
                </div>

                {/* GHS Hazards checklist */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                    <Shield className="w-4 h-4 text-blue-500" /> GHS 유해위험물 분류 체크
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(HAZARD_LABELS) as Array<keyof GhsHazards>).map((key) => {
                      const isChecked = chemical.ghsHazards[key];
                      return (
                        <div
                          key={key}
                          className={`p-2 rounded-lg border text-xs font-semibold flex items-center space-x-2 ${
                            isChecked
                              ? 'bg-blue-50/50 border-blue-200 text-blue-700'
                              : 'bg-white border-gray-100 text-gray-300'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${isChecked ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                          <span>{HAZARD_LABELS[key]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legal compliance target statuses with Reasons */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                    법적 대상 여부 판단 현황 및 근거
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white border border-gray-100 rounded-xl flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold text-center">정밀안전진단</p>
                        <div className="text-center mt-1">
                          <span
                            className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                              chemical.isSafetyDiagnosis === '대상'
                                ? 'bg-red-50 text-red-700 border border-red-100'
                                : chemical.isSafetyDiagnosis === '비대상'
                                ? 'bg-gray-50 text-gray-600'
                                : 'bg-purple-50 text-purple-700 border border-purple-100'
                            }`}
                          >
                            {chemical.isSafetyDiagnosis}
                          </span>
                        </div>
                      </div>
                      {chemical.safetyDiagnosisReason && (
                        <div className="mt-2 p-1.5 bg-slate-50 rounded text-[9px] text-slate-500 text-left border border-slate-100 flex items-start gap-1">
                          <Info className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{chemical.safetyDiagnosisReason}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white border border-gray-100 rounded-xl flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold text-center">작업환경측정</p>
                        <div className="text-center mt-1">
                          <span
                            className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                              chemical.isWorkEnvMeasure === '대상'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : chemical.isWorkEnvMeasure === '비대상'
                                ? 'bg-gray-50 text-gray-600'
                                : 'bg-purple-50 text-purple-700 border border-purple-100'
                            }`}
                          >
                            {chemical.isWorkEnvMeasure}
                          </span>
                        </div>
                      </div>
                      {chemical.workEnvMeasureReason && (
                        <div className="mt-2 p-1.5 bg-slate-50 rounded text-[9px] text-slate-500 text-left border border-slate-100 flex items-start gap-1">
                          <Info className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{chemical.workEnvMeasureReason}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white border border-gray-100 rounded-xl flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold text-center">특수건강검진</p>
                        <div className="text-center mt-1">
                          <span
                            className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                              chemical.isSpecialHealthCheck === '대상'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : chemical.isSpecialHealthCheck === '비대상'
                                ? 'bg-gray-50 text-gray-600'
                                : 'bg-purple-50 text-purple-700 border border-purple-100'
                            }`}
                          >
                            {chemical.isSpecialHealthCheck}
                          </span>
                        </div>
                      </div>
                      {chemical.specialHealthCheckReason && (
                        <div className="mt-2 p-1.5 bg-slate-50 rounded text-[9px] text-slate-500 text-left border border-slate-100 flex items-start gap-1">
                          <Info className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{chemical.specialHealthCheckReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* File links and Attachments Section */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-500" /> 관리 대장 연결 서류 및 추가 첨부파일 ({1 + (chemical.attachments?.length || 0)}건)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* MSDS File */}
                    {chemical.msdsFileId ? (
                      <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 truncate mr-2">
                          <span className="p-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">MSDS</span>
                          <span className="text-gray-800 font-semibold truncate block max-w-[140px] md:max-w-[180px]">{chemical.msdsFileName}</span>
                        </div>
                        <a
                          href={`/api/msds/${chemical.msdsFileId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded shadow-xs transition-colors cursor-pointer text-center whitespace-nowrap"
                        >
                          보기
                        </a>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-[11px] text-gray-400 text-center">
                        연결된 MSDS 원본 파일이 없습니다.
                      </div>
                    )}

                    {/* Render extra attachments */}
                    {chemical.attachments?.map((att) => {
                      const typeLabel = att.type === 'test_report' ? '시험성적서' : att.type === 'purchase_history' ? '구매내역' : '관련문서';
                      const typeColor = att.type === 'test_report' ? 'bg-purple-100 text-purple-700' : att.type === 'purchase_history' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';
                      return (
                        <div key={att.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 truncate mr-2">
                            <span className={`p-1 rounded text-[10px] font-bold ${typeColor}`}>{typeLabel}</span>
                            <span className="text-gray-800 font-semibold truncate block max-w-[140px] md:max-w-[180px]" title={att.name}>{att.name}</span>
                          </div>
                          <a
                            href={`/api/msds/${att.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white font-bold text-[10px] rounded transition-colors cursor-pointer text-center whitespace-nowrap flex items-center gap-0.5"
                          >
                            <Download className="w-3 h-3" /> 다운
                          </a>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Attachment Inline UI */}
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">추가 서류 첨부:</span>
                      <select
                        value={attachmentType}
                        onChange={(e) => setAttachmentType(e.target.value as any)}
                        className="px-2 py-1 border border-slate-200 bg-white rounded text-xs focus:outline-none"
                      >
                        <option value="test_report">시험성적서 (.pdf/.jpg)</option>
                        <option value="purchase_history">구매 영수증 / 내역서</option>
                        <option value="other">기타 관련 행정 안전서류</option>
                      </select>
                    </div>

                    <label className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                      {uploadingAttachment ? (
                        <>
                          <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                          <span>업로드 중...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-slate-500" />
                          <span>추가 서류 업로드</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,image/*,.docx,.xlsx"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={uploadingAttachment}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Right panel: Revision logs list */}
              <div className="border-t lg:border-t-0 lg:border-l border-gray-100 pt-5 lg:pt-0 lg:pl-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-500" /> 대장 수정 이력 관리 로그 ({chemical.logs.length}건)
                </h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {[...chemical.logs].reverse().map((log) => (
                    <div key={log.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-[11px] relative">
                      <div className="flex items-center justify-between text-gray-400 mb-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-600">
                          👤 {log.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {log.date}
                        </span>
                      </div>
                      <p className="text-gray-800 font-bold leading-relaxed">{log.action}</p>
                      {/* Render Visual Diff representation */}
                      {renderLogDiff(log)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE */
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">물질명 (제품명)</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">CAS Registry Number</label>
                  <input
                    type="text"
                    required
                    value={casNo}
                    onChange={(e) => setCasNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">제조사</label>
                  <input
                    type="text"
                    required
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">보유량 및 단위</label>
                  <div className="flex space-x-1">
                    <input
                      type="number"
                      step="any"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-2/3 px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none"
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-1/3 px-2 py-2 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none"
                    >
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">보관장소</label>
                  <input
                    type="text"
                    required
                    placeholder="예) 시약장-1, 냉장고 등"
                    value={locationOption}
                    onChange={(e) => setLocationOption(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">소속 연구실 지정</label>
                  <select
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none"
                  >
                    {Object.keys(managers).length > 0 ? (
                      Object.keys(managers).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))
                    ) : (
                      <option value="미지정">등록된 연구실 없음</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Editable MSDS Additional fields */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-800">MSDS 핵심 상세 정보 편집 (선택사항)</label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1">유엔 번호 (UN Number)</span>
                    <input
                      type="text"
                      value={unNo}
                      onChange={(e) => setUnNo(e.target.value)}
                      placeholder="UN 번호 입력"
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">분자식 (Chemical Formula)</span>
                    <input
                      type="text"
                      value={formula}
                      onChange={(e) => setFormula(e.target.value)}
                      placeholder="분자식 입력"
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block mb-1">권장 용도</span>
                    <input
                      type="text"
                      value={usage}
                      onChange={(e) => setUsage(e.target.value)}
                      placeholder="용도 입력"
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block mb-1">🚑 응급조치 요령 요약</span>
                    <textarea
                      value={firstAid}
                      onChange={(e) => setFirstAid(e.target.value)}
                      rows={2}
                      placeholder="피부 접촉, 흡입 시 대처법..."
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block mb-1">🔒 보관 및 취급방법 요약</span>
                    <textarea
                      value={storageMethod}
                      onChange={(e) => setStorageMethod(e.target.value)}
                      rows={2}
                      placeholder="보관 시 주의사항..."
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive GHS Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">GHS 위험성 체크 항목 수정</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(Object.keys(HAZARD_LABELS) as Array<keyof GhsHazards>).map((key) => {
                    const isChecked = ghsHazards[key];
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => handleToggleHazard(key)}
                        className={`py-2 px-3 border rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span>{HAZARD_LABELS[key]}</span>
                        {isChecked ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-200" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Targets Selectors and Reasons */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-4">
                <label className="block text-xs font-bold text-slate-800">법적 대상 현황 및 판단 근거 수정</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">정밀안전진단 대상</label>
                    <select
                      value={isSafetyDiagnosis}
                      onChange={(e) => setIsSafetyDiagnosis(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none mb-2"
                    >
                      <option value="대상">대상</option>
                      <option value="비대상">비대상</option>
                      <option value="검토 필요">검토 필요</option>
                    </select>
                    <textarea
                      value={safetyDiagnosisReason}
                      onChange={(e) => setSafetyDiagnosisReason(e.target.value)}
                      rows={2}
                      placeholder="진단 대상 판단 근거/법 규정 기재"
                      className="w-full px-2 py-1 text-[11px] border border-gray-200 bg-white rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">작업환경측정 대상</label>
                    <select
                      value={isWorkEnvMeasure}
                      onChange={(e) => setIsWorkEnvMeasure(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none mb-2"
                    >
                      <option value="대상">대상</option>
                      <option value="비대상">비대상</option>
                      <option value="검토 필요">검토 필요</option>
                    </select>
                    <textarea
                      value={workEnvMeasureReason}
                      onChange={(e) => setWorkEnvMeasureReason(e.target.value)}
                      rows={2}
                      placeholder="측정 대상 판단 근거/법 규정 기재"
                      className="w-full px-2 py-1 text-[11px] border border-gray-200 bg-white rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">특수건강검진 대상</label>
                    <select
                      value={isSpecialHealthCheck}
                      onChange={(e) => setIsSpecialHealthCheck(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none mb-2"
                    >
                      <option value="대상">대상</option>
                      <option value="비대상">비대상</option>
                      <option value="검토 필요">검토 필요</option>
                    </select>
                    <textarea
                      value={specialHealthCheckReason}
                      onChange={(e) => setSpecialHealthCheckReason(e.target.value)}
                      rows={2}
                      placeholder="검진 대상 판단 근거/법 규정 기재"
                      className="w-full px-2 py-1 text-[11px] border border-gray-200 bg-white rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Required Audit Log Input Fields */}
              <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-blue-900">수정 작업자 정보</span>
                  <span className="font-semibold text-blue-800 flex items-center gap-1">
                    👤 {managers[labName] || '미지정'}
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">자동 서명</span>
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1">수정 내용 요약 설명 (수정이력 기록 필수)</label>
                  <input
                    type="text"
                    required
                    placeholder="예) 시약 변경으로 보관함 이동 및 보유량 실측값 수정"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-blue-200 bg-white rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Save actions */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg cursor-pointer"
                >
                  편집 취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> 저장 및 수정이력 기록
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer actions */}
        {!isEditing && (
          <div className="p-5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-red-100"
                >
                  <Trash2 className="w-4 h-4" /> 대장 항목 폐기
                </button>
              ) : (
                <div className="flex items-center space-x-2 animate-fade-in text-xs">
                  <span className="font-bold text-red-600">이 유해인자 대장 항목을 진짜 폐기하시겠습니까? (이력 유지되고 폐기 목록으로 이동)</span>
                  <button
                    onClick={handleDeleteConfirm}
                    type="button"
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer text-xs"
                  >
                    예, 폐기 처리
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    type="button"
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg cursor-pointer text-xs"
                  >
                    아니오
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setIsEditing(true);
                setName(chemical.name);
                setCasNo(chemical.casNo);
                setManufacturer(chemical.manufacturer);
                setQuantity(chemical.quantity);
                setUnit(chemical.unit);
                setLocationOption(chemical.location || '');
                setGhsHazards({ ...chemical.ghsHazards });
                setIsSafetyDiagnosis(chemical.isSafetyDiagnosis);
                setIsWorkEnvMeasure(chemical.isWorkEnvMeasure);
                setIsSpecialHealthCheck(chemical.isSpecialHealthCheck);
                setUnNo(chemical.unNo || '');
                setFormula(chemical.formula || '');
                setUsage(chemical.usage || '');
                setFirstAid(chemical.firstAid || '');
                setStorageMethod(chemical.storageMethod || '');
                setLabName(chemical.labName || '생명공학실험실');
                setSafetyDiagnosisReason(chemical.safetyDiagnosisReason || '');
                setWorkEnvMeasureReason(chemical.workEnvMeasureReason || '');
                setSpecialHealthCheckReason(chemical.specialHealthCheckReason || '');
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-4 h-4" /> 화학물질 정보 수정 / 이력 기록
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
