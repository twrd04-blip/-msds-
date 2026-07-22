import React, { useState, useEffect } from 'react';
import { Chemical, GhsHazards } from './types';
import DetailModal from './components/DetailModal';
import {
  Beaker,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Shield,
  Users,
  Activity,
  FileSpreadsheet,
  AlertTriangle,
  Trash2,
  Edit2,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  FileText,
  MapPin,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  Info
} from 'lucide-react';

const UNIT_OPTIONS = ['L', 'mL', 'kg', 'g', '개'];

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

export default function App() {
  // Main Data States
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [managers, setManagers] = useState<Record<string, string>>({});
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [selectedLab, setSelectedLab] = useState<string>('전체 연구실'); // '전체 연구실', specific lab name, or '폐기 목록'

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('전체');
  const [filterSafety, setFilterSafety] = useState<string>('전체');
  const [filterWorkEnv, setFilterWorkEnv] = useState<string>('전체');
  const [filterSpecialCheck, setFilterSpecialCheck] = useState<string>('전체');
  const [selectedHazards, setSelectedHazards] = useState<Record<keyof GhsHazards, boolean>>({
    explosive: false, flammable: false, oxidizing: false, gasUnderPressure: false,
    corrosive: false, acuteToxicity: false, healthHazard: false, irritant: false, environmentalHazard: false
  });

  // Selected Chemical for Detail Modal
  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null);

  // Active form view state: 'list' | 'manual' | 'ai'
  const [currentFormView, setCurrentFormView] = useState<'list' | 'manual' | 'ai'>('list');

  // Manual Form States
  const [manualName, setManualName] = useState('');
  const [manualCas, setManualCas] = useState('');
  const [manualManufacturer, setManualManufacturer] = useState('');
  const [manualQty, setManualQty] = useState<number>(1);
  const [manualUnit, setManualUnit] = useState('개');
  const [manualLocation, setManualLocation] = useState('');
  const [manualLab, setManualLab] = useState('');
  const [manualGhs, setManualGhs] = useState<GhsHazards>({
    explosive: false, flammable: false, oxidizing: false, gasUnderPressure: false,
    corrosive: false, acuteToxicity: false, healthHazard: false, irritant: false, environmentalHazard: false
  });
  const [manualSafety, setManualSafety] = useState<'대상' | '비대상' | '검토 필요'>('검토 필요');
  const [manualWorkEnv, setManualWorkEnv] = useState<'대상' | '비대상' | '검토 필요'>('검토 필요');
  const [manualSpecial, setManualSpecial] = useState<'대상' | '비대상' | '검토 필요'>('검토 필요');
  const [manualUnNo, setManualUnNo] = useState('');
  const [manualFormula, setManualFormula] = useState('');
  const [manualUsage, setManualUsage] = useState('');
  const [manualFirstAid, setManualFirstAid] = useState('');
  const [manualStorage, setManualStorage] = useState('');
  const [manualReason, setManualReason] = useState('');

  // AI OCR Parser Drag and Drop States
  const [aiLab, setAiLab] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [aiParsedResult, setAiParsedResult] = useState<any | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'parsing' | 'reviewed' | 'error'>('idle');

  // Excel Bulk Upload State
  const [excelStatus, setExcelStatus] = useState<string | null>(null);

  // Inline Manager Edits State
  const [editingManagers, setEditingManagers] = useState<boolean>(false);
  const [tempManagers, setTempManagers] = useState<Record<string, string>>({});
  const [tempLabs, setTempLabs] = useState<{ keyId: string; labName: string; manager: string; originalName?: string }[]>([]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resChems, resManagers, resLogs] = await Promise.all([
        fetch('/api/chemicals'),
        fetch('/api/managers'),
        fetch('/api/logs')
      ]);

      if (resChems.ok && resManagers.ok && resLogs.ok) {
        const chems = await resChems.json();
        const mngs = await resManagers.json();
        const logs = await resLogs.json();

        setChemicals(chems);
        setManagers(mngs);
        setTempManagers(mngs);
        setGlobalLogs(logs);

        const firstLab = Object.keys(mngs)[0] || '';
        setManualLab(firstLab);
        setAiLab(firstLab);
      }
    } catch (err) {
      console.error('Failed to retrieve server database data:', err);
      showFeedback('error', '서버 데이터 연결 실패. 네트워크 상태를 확인하세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // Switch Lab tab
  const handleLabTabChange = (tab: string) => {
    setSelectedLab(tab);
    // Reset specific states
    if (tab !== '폐기 목록') {
      const firstLab = Object.keys(managers)[0] || '미지정';
      setAiLab(tab === '전체 연구실' ? firstLab : tab);
      setManualLab(tab === '전체 연구실' ? firstLab : tab);
    }
  };

  // Toggle dynamic hazards filters
  const toggleHazardFilter = (key: keyof GhsHazards) => {
    setSelectedHazards(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterLocation('전체');
    setFilterSafety('전체');
    setFilterWorkEnv('전체');
    setFilterSpecialCheck('전체');
    setSelectedHazards({
      explosive: false, flammable: false, oxidizing: false, gasUnderPressure: false,
      corrosive: false, acuteToxicity: false, healthHazard: false, irritant: false, environmentalHazard: false
    });
  };

  // Dynamically compute unique locations from active chemicals
  const uniqueLocations = Array.from(
    new Set(chemicals.map(c => c.location).filter(Boolean))
  ).sort();

  // Filter chemicals list according to query and filters
  const filteredChemicals = chemicals.filter(chem => {
    // 1. Filter by soft delete / waste tab
    if (selectedLab === '폐기 목록') {
      if (chem.status !== '폐기') return false;
    } else {
      if (chem.status === '폐기') return false;
      // Filter by designated laboratory
      if (selectedLab !== '전체 연구실' && chem.labName !== selectedLab) return false;
    }

    // 2. Filter by search query (Fuzzy text search name, cas, manufacturer, location)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = chem.name?.toLowerCase().includes(q);
      const matchCas = chem.casNo?.toLowerCase().includes(q);
      const matchMfr = chem.manufacturer?.toLowerCase().includes(q);
      const matchLoc = chem.location?.toLowerCase().includes(q);
      if (!matchName && !matchCas && !matchMfr && !matchLoc) return false;
    }

    // 3. Filter by location option
    if (filterLocation !== '전체' && chem.location !== filterLocation) return false;

    // 4. Filter by legal targeting
    if (filterSafety !== '전체' && chem.isSafetyDiagnosis !== filterSafety) return false;
    if (filterWorkEnv !== '전체' && chem.isWorkEnvMeasure !== filterWorkEnv) return false;
    if (filterSpecialCheck !== '전체' && chem.isSpecialHealthCheck !== filterSpecialCheck) return false;

    // 5. Filter by GHS multi-select checklist (And matching)
    const activeHazardKeys = Object.entries(selectedHazards)
      .filter(([_, active]) => active)
      .map(([key, _]) => key as keyof GhsHazards);

    for (const hk of activeHazardKeys) {
      if (!chem.ghsHazards[hk]) return false;
    }

    return true;
  });

  // Calculate statistics among current view chemicals (excluding deleted status unless in deleted tab)
  const statsChemicals = chemicals.filter(c => c.status !== '폐기');
  const statTotalCount = statsChemicals.length;
  const statSafetyCount = statsChemicals.filter(c => c.isSafetyDiagnosis === '대상').length;
  const statWorkEnvCount = statsChemicals.filter(c => c.isWorkEnvMeasure === '대상').length;
  const statSpecialCount = statsChemicals.filter(c => c.isSpecialHealthCheck === '대상').length;

  // Manual Register Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      showFeedback('error', '물질명(제품명)은 필수 항목입니다.');
      return;
    }

    setSubmitting(true);
    const registrar = managers[manualLab] || '안전 담당자';

    try {
      const payload: Partial<Chemical> = {
        name: manualName.trim(),
        casNo: manualCas.trim(),
        manufacturer: manualManufacturer.trim(),
        quantity: Number(manualQty),
        unit: manualUnit,
        location: manualLocation,
        labName: manualLab,
        ghsHazards: manualGhs,
        isSafetyDiagnosis: manualSafety,
        isWorkEnvMeasure: manualWorkEnv,
        isSpecialHealthCheck: manualSpecial,
        unNo: manualUnNo.trim(),
        formula: manualFormula.trim(),
        usage: manualUsage.trim(),
        firstAid: manualFirstAid.trim(),
        storageMethod: manualStorage.trim(),
        logs: [{
          id: '',
          date: '',
          author: registrar,
          action: manualReason.trim() || '신규 수동 자산 입고 등록'
        }]
      };

      const res = await fetch('/api/chemicals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || '수동 저장 오류');
      }

      const resData = await res.json();
      showFeedback('success', resData.merged 
        ? `동일 화학물질 매칭 발견으로 [${manualLab}] 보유량이 합산 갱신되었습니다.` 
        : `[${manualLab}] 유해인자관리대장에 신규 물질이 안전 등록되었습니다.`
      );

      // Clean form fields
      setManualName('');
      setManualCas('');
      setManualManufacturer('');
      setManualQty(1);
      setManualReason('');
      setManualUnNo('');
      setManualFormula('');
      setManualUsage('');
      setManualFirstAid('');
      setManualStorage('');
      setManualGhs({
        explosive: false, flammable: false, oxidizing: false, gasUnderPressure: false,
        corrosive: false, acuteToxicity: false, healthHazard: false, irritant: false, environmentalHazard: false
      });
      setManualSafety('검토 필요');
      setManualWorkEnv('검토 필요');
      setManualSpecial('검토 필요');

      setCurrentFormView('list');
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit / Update Chemical from Detail Modal
  const handleChemicalUpdateFromModal = async (id: string, updatedFields: Partial<Chemical>, author: string, changeSummary: string) => {
    try {
      const res = await fetch(`/api/chemicals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedFields, author, changeSummary })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '수정 도중 오류 발생');
      }

      const data = await res.json();
      // Update local state smoothly
      setChemicals(prev => prev.map(c => c.id === id ? data.chemical : c));
      setSelectedChemical(data.chemical);
      showFeedback('success', '화학물질 개별 이력과 상세 안전 정보가 정상 수정 저장되었습니다.');
      
      // Refresh global logs as well
      const logsRes = await fetch('/api/logs');
      if (logsRes.ok) {
        setGlobalLogs(await logsRes.json());
      }
    } catch (err: any) {
      showFeedback('error', err.message);
      throw err;
    }
  };

  // Soft Delete Chemical (Trash discard)
  const handleChemicalDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/chemicals/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '폐기 처리 실패');
      }

      setChemicals(prev => prev.map(c => c.id === id ? { ...c, status: '폐기' } : c));
      showFeedback('success', '해당 유해화학인자 항목을 폐기 상태로 처리 완료했습니다.');
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
      throw err;
    }
  };

  // Add file attachment to chemical
  const handleAddAttachment = async (chemicalId: string, fileName: string, fileData: string, type: 'test_report' | 'purchase_history' | 'other') => {
    try {
      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chemicalId, fileName, fileData, type })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '첨부 파일 전송 실패');
      }

      const data = await res.json();
      setChemicals(prev => prev.map(c => c.id === chemicalId ? data.chemical : c));
      setSelectedChemical(data.chemical);
      showFeedback('success', `추가 증빙 서류 [${fileName}]가 대장에 정상 연결되었습니다.`);
      
      // Refresh global logs
      const logsRes = await fetch('/api/logs');
      if (logsRes.ok) {
        setGlobalLogs(await logsRes.json());
      }
    } catch (err: any) {
      showFeedback('error', err.message);
      throw err;
    }
  };

  // AI OCR File Drop/Change Handler
  const handleAiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFileWithGemini(file);
  };

  // Drag over handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileWithGemini(file);
    }
  };

  // Fire Gemini OCR parser via REST
  const processFileWithGemini = async (file: File) => {
    setAiStatus('parsing');
    setAiParsedResult(null);
    showFeedback('success', `MSDS [${file.name}] 파일 분석을 시작합니다. (약 3~8초 소요)`);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/gemini/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: base64,
              fileName: file.name,
              mimeType: file.type
            })
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '서버 Gemini 파싱 에러');
          }

          const parsed = await res.json();
          // Prepopulate and enter review mode
          setAiParsedResult(parsed);
          setAiStatus('reviewed');
          showFeedback('success', 'AI 분석 완료! 신뢰도 및 법규 대상 여부를 검토한 뒤 대장 등록을 마무리하세요.');
        } catch (err: any) {
          console.error(err);
          setAiStatus('error');
          showFeedback('error', err.message || 'MSDS OCR 분석 도중 오류가 발생했습니다.');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setAiStatus('error');
      showFeedback('error', err.message || '파일 전송 준비 실패');
    }
  };

  // Fire Gemini Text parser via Paste
  const processPastedTextWithGemini = async () => {
    if (!pastedText.trim()) {
      showFeedback('error', '텍스트 영역에 MSDS 주요 정보를 붙여넣어 주세요.');
      return;
    }

    setAiStatus('parsing');
    setAiParsedResult(null);
    showFeedback('success', '붙여넣은 MSDS 텍스트 데이터 분석을 요청합니다...');

    try {
      const res = await fetch('/api/gemini/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pastedText: pastedText.trim() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '서버 Gemini 텍스트 분석 오류');
      }

      const parsed = await res.json();
      setAiParsedResult(parsed);
      setAiStatus('reviewed');
      showFeedback('success', 'AI 텍스트 구조화 분석 성공!');
    } catch (err: any) {
      console.error(err);
      setAiStatus('error');
      showFeedback('error', err.message || '텍스트 MSDS 분석 도중 오류 발생.');
    }
  };

  // Submit Reviewed AI OCR results to active chemical registry
  const handleSaveReviewedAiResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiParsedResult) return;

    setSubmitting(true);
    const registrar = managers[aiLab] || '안전 담당자';

    try {
      const payload: Partial<Chemical> = {
        name: aiParsedResult.name || '미제 물질',
        casNo: aiParsedResult.casNo || '',
        manufacturer: aiParsedResult.manufacturer || '알 수 없음',
        quantity: Number(aiParsedResult.quantity || 1), // users set quantity in review form
        unit: aiParsedResult.unit || '개',
        location: aiParsedResult.location || '시약장-1',
        labName: aiLab,
        ghsHazards: aiParsedResult.ghsHazards,
        isSafetyDiagnosis: aiParsedResult.isSafetyDiagnosis,
        isWorkEnvMeasure: aiParsedResult.isWorkEnvMeasure,
        isSpecialHealthCheck: aiParsedResult.isSpecialHealthCheck,
        unNo: aiParsedResult.unNo,
        formula: aiParsedResult.formula,
        usage: aiParsedResult.usage,
        firstAid: aiParsedResult.firstAid,
        storageMethod: aiParsedResult.storageMethod,
        confidenceName: aiParsedResult.confidenceName,
        confidenceCasNo: aiParsedResult.confidenceCasNo,
        confidenceManufacturer: aiParsedResult.confidenceManufacturer,
        safetyDiagnosisReason: aiParsedResult.safetyDiagnosisReason,
        workEnvMeasureReason: aiParsedResult.workEnvMeasureReason,
        specialHealthCheckReason: aiParsedResult.specialHealthCheckReason,
        msdsFileId: aiParsedResult.msdsFileId,
        msdsFileName: aiParsedResult.msdsFileName,
        logs: [{
          id: '',
          date: '',
          author: registrar,
          action: 'MSDS AI 자동 분석 및 사용자 검토 후 대장 정식 편입'
        }]
      };

      const res = await fetch('/api/chemicals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('자산 합산 및 등록 실패');
      }

      const resData = await res.json();
      showFeedback('success', resData.merged
        ? `[병합 합산 완료] 동일 CAS No. 발견으로 [${aiLab}] ${payload.name} 대장에 신규 시약 보유 수량이 안전 병합되었습니다.`
        : `[등록 완료] AI MSDS 분석을 거쳐 [${aiLab}] 유해인자 대장에 제품이 정식 등록되었습니다.`
      );

      // Clean AI States
      setAiParsedResult(null);
      setAiStatus('idle');
      setPastedText('');
      setCurrentFormView('list');
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Excel Bulk Import handler
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelStatus('읽는 중...');
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        setExcelStatus('서버 일괄 인코딩 분석 중...');
        const res = await fetch('/api/excel/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64,
            author: '엑셀 벌크 시스템 매니저'
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '엑셀 파서 실패');
        }

        const data = await res.json();
        showFeedback('success', `기존 엑셀 대장 일괄 반입 완료! (신규 등록: ${data.importedCount}건, 보유량 병합: ${data.mergedCount}건)`);
        fetchData();
      } catch (err: any) {
        showFeedback('error', err.message || '엑셀 양식을 해석하지 못했습니다.');
      } finally {
        setExcelStatus(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Inline Laboratory managers mapping (propagating name changes and deletions)
  const handleSaveManagers = async () => {
    try {
      // 1. Validate inputs
      const invalidLab = tempLabs.some(item => !item.labName.trim());
      if (invalidLab) {
        showFeedback('error', '연구실 명칭은 비워둘 수 없습니다.');
        return;
      }
      
      const invalidManager = tempLabs.some(item => !item.manager.trim());
      if (invalidManager) {
        showFeedback('error', '담당 안전관리자 성명을 지정해주세요.');
        return;
      }

      // Check duplicate lab names
      const labNames = tempLabs.map(item => item.labName.trim());
      const duplicateLabs = labNames.filter((name, idx) => labNames.indexOf(name) !== idx);
      if (duplicateLabs.length > 0) {
        showFeedback('error', `중복된 연구실 이름이 존재합니다: ${duplicateLabs.join(', ')}`);
        return;
      }

      // 2. Calculate renamed and deleted labs
      const renamed: { from: string; to: string }[] = [];
      const deleted: string[] = [];

      // Find renamed
      tempLabs.forEach(item => {
        if (item.originalName && item.originalName !== item.labName) {
          renamed.push({ from: item.originalName, to: item.labName });
        }
      });

      // Find deleted
      const currentLabNames = tempLabs.map(item => item.labName);
      Object.keys(managers).forEach(oldLab => {
        // If an old lab's name is not present in the new lab names, and also none of the tempLabs are renamings of it
        const wasRenamed = tempLabs.some(item => item.originalName === oldLab);
        if (!wasRenamed) {
          deleted.push(oldLab);
        }
      });

      // 3. Build new managers object
      const newManagers: Record<string, string> = {};
      tempLabs.forEach(item => {
        newManagers[item.labName] = item.manager;
      });

      // 4. Send to backend
      const res = await fetch('/api/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managers: newManagers,
          renamed,
          deleted
        })
      });

      if (res.ok) {
        setManagers(newManagers);
        setEditingManagers(false);
        showFeedback('success', '연구실 및 안전 관리자 구성 정보 변경 사항이 정상적으로 반영 및 저장되었습니다.');
        
        // If the selected tab has been renamed or deleted, handle gracefully
        const activeTabExists = Object.keys(newManagers).includes(selectedLab);
        if (selectedLab !== '전체 연구실' && selectedLab !== '폐기 목록' && !activeTabExists) {
          const renameOp = renamed.find(r => r.from === selectedLab);
          if (renameOp) {
            setSelectedLab(renameOp.to);
          } else {
            setSelectedLab('전체 연구실');
          }
        }
        
        fetchData();
      } else {
        throw new Error('연구실 정보 저장 중 오류 발생');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Quick hazard helper array
  const ghsKeys = Object.keys(selectedHazards) as Array<keyof GhsHazards>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="app-root-container">
      {/* 1. Global Navigation Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
            <Beaker className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">연구실 유해인자 취급 및 안전관리대장 자동화 시스템</h1>
            <p className="text-xs text-slate-400 font-medium">AI MSDS OCR 분석 및 다차원 통합 안전 이력 관리 대시보드</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            안전망 실시간 연결됨
          </span>
        </div>
      </header>

      {/* 2. Feedback Notification Toast */}
      {feedbackMessage && (
        <div
          className={`fixed top-20 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center space-x-3 max-w-md animate-slide-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
          id="toast-notification"
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="text-xs font-semibold leading-relaxed">{feedbackMessage.text}</span>
        </div>
      )}

      {/* 3. Metrics Dashboard row */}
      <div className="px-6 pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/60 p-4 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-400 font-bold block mb-0.5">총 활성 유해인자 수</span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {loading ? '-' : statTotalCount} <span className="text-xs font-normal text-slate-400">품목</span>
              </span>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Beaker className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 p-4 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-400 font-bold block mb-0.5">정밀안전진단 대상</span>
              <span className="text-2xl font-black text-red-600 font-mono">
                {loading ? '-' : statSafetyCount} <span className="text-xs font-normal text-slate-400">품목</span>
              </span>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 p-4 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-400 font-bold block mb-0.5">작업환경측정 대상</span>
              <span className="text-2xl font-black text-amber-600 font-mono">
                {loading ? '-' : statWorkEnvCount} <span className="text-xs font-normal text-slate-400">품목</span>
              </span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 p-4 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-400 font-bold block mb-0.5">특수건강검진 대상</span>
              <span className="text-2xl font-black text-emerald-600 font-mono">
                {loading ? '-' : statSpecialCount} <span className="text-xs font-normal text-slate-400">품목</span>
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Grid Container */}
      <main className="p-6 flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left column (Sidebar tabs & manager setting & recent logs) */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* 1. 소속 연구실 단위 대장 조회 */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs space-y-1">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5 px-1.5 flex items-center gap-1.5">
              <span>🗂️ 소속 연구실 단위 대장 조회</span>
            </h2>
            
            <button
              onClick={() => handleLabTabChange('전체 연구실')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                selectedLab === '전체 연구실'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🌐 전체 통합 관리대장</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedLab === '전체 연구실' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {chemicals.filter(c => c.status !== '폐기').length}
              </span>
            </button>

            {Object.keys(managers).map((lab) => {
              const isActive = selectedLab === lab;
              const count = chemicals.filter(c => c.labName === lab && c.status !== '폐기').length;
              return (
                <button
                  key={lab}
                  onClick={() => handleLabTabChange(lab)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{lab}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <div className="border-t border-slate-100 my-2 pt-2">
              <button
                onClick={() => handleLabTabChange('폐기 목록')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  selectedLab === '폐기 목록'
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/25'
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <span>🗑️ 대장 폐기 물질 목록</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedLab === '폐기 목록' ? 'bg-red-700 text-white' : 'bg-red-50 text-red-600'}`}>
                  {chemicals.filter(c => c.status === '폐기').length}
                </span>
              </button>
            </div>
          </div>

          {/* 2. MSDS 등록 및 물질 추가 */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs">
            <h2 className="text-xs font-black text-slate-700 flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" /> 🧪 유해인자 및 MSDS 등록
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (selectedLab === '폐기 목록') {
                    showFeedback('error', '폐기 목록 조회 중에는 신규 등록을 할 수 없습니다. 연구실을 먼저 선택해 주세요.');
                    return;
                  }
                  setCurrentFormView(currentFormView === 'ai' ? 'list' : 'ai');
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  currentFormView === 'ai'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI MSDS OCR 자동 분석 등록</span>
              </button>

              <button
                onClick={() => {
                  if (selectedLab === '폐기 목록') {
                    showFeedback('error', '폐기 목록 조회 중에는 신규 등록을 할 수 없습니다. 연구실을 먼저 선택해 주세요.');
                    return;
                  }
                  setCurrentFormView(currentFormView === 'manual' ? 'list' : 'manual');
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  currentFormView === 'manual'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>수동 물질 직접 등록</span>
              </button>
            </div>
          </div>



          {/* 4. 변경 이력 */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs">
            <h2 className="text-xs font-black text-slate-700 flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-100">
              <Activity className="w-4 h-4 text-blue-500" /> 🕒 실시간 통합 작업 변경 이력
            </h2>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {globalLogs.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-xs italic">기록된 이력이 없습니다.</p>
              ) : (
                [...globalLogs].reverse().map((log) => (
                  <div key={log.id} className="text-[10px] border-b border-slate-50 pb-2 last:border-0">
                    <div className="flex items-center justify-between text-slate-400 mb-0.5 font-medium">
                      <span>{log.author}</span>
                      <span className="font-mono text-[9px] flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {log.date?.substr(5, 11)}
                      </span>
                    </div>
                    <p className="text-slate-800 font-semibold leading-normal">{log.action}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 5. 환경 설정 */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h2 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" /> ⚙️ 연구실 및 안전관리자 구성
              </h2>
              {!editingManagers ? (
                <button
                  onClick={() => {
                    const initTempLabs = Object.entries(managers).map(([lab, mgr], idx) => ({
                      keyId: `lab_${idx}_${Date.now()}`,
                      labName: lab,
                      manager: mgr,
                      originalName: lab
                    }));
                    setTempLabs(initTempLabs);
                    setEditingManagers(true);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  수정
                </button>
              ) : (
                <div className="flex space-x-1.5">
                  <button
                    onClick={handleSaveManagers}
                    className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setEditingManagers(false);
                      setTempLabs([]);
                    }}
                    className="text-[11px] font-bold text-gray-400 hover:underline cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <p className="text-[10px] text-slate-400 leading-relaxed mb-1">
                ※ 연구실을 추가, 수정, 삭제하고 지정된 안전관리자 정보를 실시간 전파합니다.
              </p>
              
              {editingManagers ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {tempLabs.map((item) => (
                    <div key={item.keyId} className="flex items-center gap-1.5 py-1 border-b border-slate-50 last:border-0">
                      <input
                        type="text"
                        placeholder="연구실 명칭"
                        value={item.labName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTempLabs(prev => prev.map(t => t.keyId === item.keyId ? { ...t, labName: val } : t));
                        }}
                        className="w-1/2 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="담당자명"
                        value={item.manager}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTempLabs(prev => prev.map(t => t.keyId === item.keyId ? { ...t, manager: val } : t));
                        }}
                        className="w-[35%] px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setTempLabs(prev => prev.filter(t => t.keyId !== item.keyId));
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="연구실 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setTempLabs(prev => [...prev, {
                        keyId: `lab_new_${Date.now()}_${Math.random()}`,
                        labName: '',
                        manager: ''
                      }]);
                    }}
                    className="w-full py-1.5 border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 text-[11px] font-bold text-slate-500 hover:text-blue-600 rounded-lg transition-all flex items-center justify-center gap-1 mt-1 cursor-pointer"
                  >
                    <span>➕ 연구실 추가</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {Object.keys(managers).length === 0 ? (
                    <p className="text-center text-slate-400 py-4 italic text-[11px]">지정된 연구실이 없습니다. 우측 수정을 눌러 등록해 주세요.</p>
                  ) : (
                    Object.entries(managers).map(([lab, mgr]) => (
                      <div key={lab} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                        <span className="font-semibold text-slate-600 truncate mr-2">{lab}</span>
                        <span className="font-bold text-slate-800 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded shrink-0">
                          👤 {mgr || '미지정'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right columns (Main actions & table view) */}
        <div className="xl:col-span-3 space-y-6 flex flex-col">
          
          {/* Laboratory info banner */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 text-xs font-black text-slate-700">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] font-bold">선택된 관리 영역</span>
                <span>{selectedLab}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
              {selectedLab !== '전체 연구실' && selectedLab !== '폐기 목록' && (
                <div className="text-[11px] bg-slate-50 border border-slate-200/50 px-3 py-1.5 rounded-lg font-bold text-slate-600 flex items-center gap-1.5 h-8">
                  <span>👤 책임 안전관리자:</span>
                  <span className="text-slate-900 font-extrabold">{managers[selectedLab] || '미지정'}</span>
                </div>
              )}

              {/* Excel Export Downloader */}
              <a
                href="/api/excel/export"
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-500/10 text-center whitespace-nowrap h-8"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>대장 Excel 양식 내려받기</span>
              </a>

              {/* Excel Bulk Import Uploader */}
              <label className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border-dashed border-slate-300 whitespace-nowrap h-8">
                {excelStatus ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>{excelStatus}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>기존 Excel 대장 반입하기</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleExcelImport}
                  disabled={excelStatus !== null}
                />
              </label>
            </div>
          </div>

          {/* 5. FORM VIEWS CONTAINER (MANUAL OR AI REVIEW) */}
          {currentFormView === 'manual' && selectedLab !== '폐기 목록' && (
            <form onSubmit={handleManualSubmit} className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-md space-y-5 animate-slide-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-5 h-5 text-blue-600" /> 유해인자 수동 등록 등록폼
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentFormView('list')}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">물질명(제품명) *</label>
                  <input
                    type="text"
                    required
                    placeholder="예) Ethanol, Hydrochloric Acid 등"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">CAS Registry Number</label>
                  <input
                    type="text"
                    placeholder="예) 64-17-5"
                    value={manualCas}
                    onChange={(e) => setManualCas(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">제조사 또는 공급원</label>
                  <input
                    type="text"
                    placeholder="예) Sigma-Aldrich, 대정화금"
                    value={manualManufacturer}
                    onChange={(e) => setManualManufacturer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">현재 총 입고량 및 단위</label>
                  <div className="flex space-x-1.5">
                    <input
                      type="number"
                      step="any"
                      required
                      min="0.001"
                      value={manualQty}
                      onChange={(e) => setManualQty(Number(e.target.value))}
                      className="w-2/3 px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                    />
                    <select
                      value={manualUnit}
                      onChange={(e) => setManualUnit(e.target.value)}
                      className="w-1/3 px-2 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                    >
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">보관장소 지정</label>
                  <input
                    type="text"
                    required
                    placeholder="예) 시약장-1, 냉장고 등"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">소속 대상 연구실</label>
                  <select
                    value={manualLab}
                    onChange={(e) => setManualLab(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  >
                    {Object.keys(managers).length > 0 ? (
                      Object.keys(managers).map((lab) => (
                        <option key={lab} value={lab}>{lab}</option>
                      ))
                    ) : (
                      <option value="">연구실을 먼저 추가해 주세요</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Optional chemical metadata */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                <span className="block text-xs font-bold text-slate-700">추가 법적 규정 상세정보 (선택사항)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1">유엔 번호 (UN Number)</span>
                    <input
                      type="text"
                      placeholder="예) UN 1170"
                      value={manualUnNo}
                      onChange={(e) => setManualUnNo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">분자식 (Chemical Formula)</span>
                    <input
                      type="text"
                      placeholder="예) C2H5OH"
                      value={manualFormula}
                      onChange={(e) => setManualFormula(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block mb-1">권장 용도</span>
                    <input
                      type="text"
                      placeholder="예) 실험 기기 세척용 용매"
                      value={manualUsage}
                      onChange={(e) => setManualUsage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* GHS checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">GHS 유해위험 분류 (해당사항 체크)</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(Object.keys(HAZARD_LABELS) as Array<keyof GhsHazards>).map((key) => {
                    const isChecked = manualGhs[key];
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setManualGhs(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`py-1.5 px-3 border rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span>{HAZARD_LABELS[key]}</span>
                        <div className={`w-2.5 h-2.5 rounded ${isChecked ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legal Targeting */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">정밀안전진단 대상 여부</label>
                  <select
                    value={manualSafety}
                    onChange={(e) => setManualSafety(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  >
                    <option value="대상">대상</option>
                    <option value="비대상">비대상</option>
                    <option value="검토 필요">검토 필요</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">작업환경측정 대상 여부</label>
                  <select
                    value={manualWorkEnv}
                    onChange={(e) => setManualWorkEnv(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  >
                    <option value="대상">대상</option>
                    <option value="비대상">비대상</option>
                    <option value="검토 필요">검토 필요</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">특수건강검진 대상 여부</label>
                  <select
                    value={manualSpecial}
                    onChange={(e) => setManualSpecial(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  >
                    <option value="대상">대상</option>
                    <option value="비대상">비대상</option>
                    <option value="검토 필요">검토 필요</option>
                  </select>
                </div>
              </div>

              {/* Audit fields */}
              <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-xl text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">대장 등록 승인자 서명</span>
                  <span className="font-bold text-blue-800">👤 {managers[manualLab] || '안전 담당자'} (자동서명)</span>
                </div>
                <div>
                  <label className="block font-bold text-blue-900 mb-1">등록 목적 및 사유 (대장 이력 필수 기입)</label>
                  <input
                    type="text"
                    required
                    placeholder="예) 실험용 시약 신규 발주 입고"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 bg-white rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentFormView('list')}
                  className="px-4.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {submitting ? '저장 중...' : '확인 대장 등록'}
                </button>
              </div>
            </form>
          )}

          {currentFormView === 'ai' && selectedLab !== '폐기 목록' && (
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-md space-y-6 animate-slide-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-purple-600" /> AI 기반 MSDS 자동 OCR 분석 등록 엔진
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentFormView('list');
                    setAiParsedResult(null);
                    setAiStatus('idle');
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                💡 MSDS PDF 파일이나 이미지 스캔본을 아래 영역에 끌어놓거나 클릭하여 올리시면, Gemini AI가 화학물질 핵심 속성을 분석하고 법적 대상 검토 및 판단 근거까지 생성하여 보여줍니다.
              </div>

              {/* Upload Workspace Drag & Drop and paste box */}
              {aiStatus === 'idle' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* File Upload Box */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 transition-all cursor-pointer ${
                      isDragging
                        ? 'border-purple-600 bg-purple-50/50'
                        : 'border-slate-300 hover:border-purple-400 bg-slate-50/30'
                    }`}
                  >
                    <div className="p-4 bg-purple-50 rounded-2xl text-purple-600">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">MSDS PDF 또는 이미지 스캔본 올리기</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">드래그 앤 드롭하거나 영역 클릭</p>
                    </div>
                    <label className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded-xl transition-all cursor-pointer shadow-sm">
                      파일 탐색기 열기
                      <input
                        type="file"
                        accept=".pdf, image/*"
                        className="hidden"
                        onChange={handleAiFileSelect}
                      />
                    </label>
                  </div>

                  {/* Text Paste Box */}
                  <div className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/20 flex flex-col space-y-2.5">
                    <span className="text-xs font-bold text-slate-700 block">또는 MSDS 텍스트 복사하여 붙여넣기</span>
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      rows={5}
                      placeholder="예) 화학물질 분류 및 경고표지 문구를 직접 붙여넣고 분석할 수도 있습니다."
                      className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/10 flex-1 resize-none bg-white"
                    />
                    <button
                      onClick={processPastedTextWithGemini}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" /> 복사된 텍스트 AI 분석 시작
                    </button>
                  </div>
                </div>
              )}

              {/* Parsing Loading State */}
              {aiStatus === 'parsing' && (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-700">Gemini 3.5 Flash OCR 안전 전문가 작동 중</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      한국 화학안전기준 및 산업안전보건법에 의거하여 화학구조, GHS 위험물질 분류, <br />
                      정밀안전진단, 작업측정 및 특수건강검진 규정 적합 여부를 다각도 분석 중입니다...
                    </p>
                  </div>
                </div>
              )}

              {/* AI Parser Error State */}
              {aiStatus === 'error' && (
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="p-3 bg-red-100 text-red-700 rounded-full">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">MSDS 분석에 실패했습니다.</h3>
                    <p className="text-[11px] text-red-600 mt-1">파일의 글씨 품질이나 텍스트 크기를 확인하시거나 유효한 MSDS 내용인지 확인하세요.</p>
                  </div>
                  <button
                    onClick={() => setAiStatus('idle')}
                    className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    다시 시도하기
                  </button>
                </div>
              )}

              {/* human-in-the-loop review interface showing confidence scores */}
              {aiStatus === 'reviewed' && aiParsedResult && (
                <form onSubmit={handleSaveReviewedAiResult} className="space-y-5 border border-purple-100 p-5 rounded-2xl bg-purple-50/10">
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">AI 분석 결과 검토</span>
                      <p className="text-xs font-bold text-slate-800 mt-1">
                        ※ AI가 데이터 시트를 완벽히 판독했는지 확인 후 수정할 필드를 검토한 다음 정식 등록해 주세요.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAiParsedResult(null);
                        setAiStatus('idle');
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>물질명(제품명) *</span>
                        {aiParsedResult.confidenceName !== undefined && (
                          <span className={`text-[10px] font-bold ${aiParsedResult.confidenceName < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            신뢰도 {aiParsedResult.confidenceName}%
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        required
                        value={aiParsedResult.name}
                        onChange={(e) => setAiParsedResult({ ...aiParsedResult, name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none bg-white ${
                          aiParsedResult.confidenceName !== undefined && aiParsedResult.confidenceName < 80 ? 'border-amber-300 ring-2 ring-amber-500/10' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>CAS Registry Number</span>
                        {aiParsedResult.confidenceCasNo !== undefined && (
                          <span className={`text-[10px] font-bold ${aiParsedResult.confidenceCasNo < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            신뢰도 {aiParsedResult.confidenceCasNo}%
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={aiParsedResult.casNo}
                        onChange={(e) => setAiParsedResult({ ...aiParsedResult, casNo: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none bg-white ${
                          aiParsedResult.confidenceCasNo !== undefined && aiParsedResult.confidenceCasNo < 80 ? 'border-amber-300 ring-2 ring-amber-500/10' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>제조사 / 공급업체</span>
                        {aiParsedResult.confidenceManufacturer !== undefined && (
                          <span className={`text-[10px] font-bold ${aiParsedResult.confidenceManufacturer < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            신뢰도 {aiParsedResult.confidenceManufacturer}%
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={aiParsedResult.manufacturer}
                        onChange={(e) => setAiParsedResult({ ...aiParsedResult, manufacturer: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none bg-white ${
                          aiParsedResult.confidenceManufacturer !== undefined && aiParsedResult.confidenceManufacturer < 80 ? 'border-amber-300 ring-2 ring-amber-500/10' : 'border-slate-200'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs bg-purple-50/50 p-4 rounded-xl border border-purple-100/50">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">입고량 및 단위 설정</label>
                      <div className="flex space-x-1">
                        <input
                          type="number"
                          step="any"
                          required
                          min="0.001"
                          value={aiParsedResult.quantity || 1}
                          onChange={(e) => setAiParsedResult({ ...aiParsedResult, quantity: Number(e.target.value) })}
                          className="w-2/3 px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                        />
                        <select
                          value={aiParsedResult.unit || 'L'}
                          onChange={(e) => setAiParsedResult({ ...aiParsedResult, unit: e.target.value })}
                          className="w-1/3 px-1.5 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                        >
                          {UNIT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">보관장소 지정</label>
                      <input
                        type="text"
                        required
                        placeholder="예) 시약장-1, 냉장고 등"
                        value={aiParsedResult.location || ''}
                        onChange={(e) => setAiParsedResult({ ...aiParsedResult, location: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">편입 소속 연구실</label>
                      <select
                        value={aiLab}
                        onChange={(e) => setAiLab(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                      >
                        {Object.keys(managers).length > 0 ? (
                          Object.keys(managers).map((lab) => (
                            <option key={lab} value={lab}>{lab}</option>
                          ))
                        ) : (
                          <option value="">연구실을 먼저 추가해 주세요</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">연결 원본 서류</label>
                      <div className="px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg flex items-center justify-between text-[11px] truncate" title={aiParsedResult.msdsFileName}>
                        <span className="truncate max-w-[130px] font-semibold">{aiParsedResult.msdsFileName || '붙여넣은 텍스트'}</span>
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-bold">연결</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Legal targets and reasons Review */}
                  <div className="bg-slate-50 p-4 border border-slate-200/55 rounded-xl space-y-4 text-xs">
                    <span className="block font-bold text-slate-800">법적 대상 여부 판정 및 근거 검토</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">정밀안전진단 대상</label>
                        <select
                          value={aiParsedResult.isSafetyDiagnosis}
                          onChange={(e) => setAiParsedResult({ ...aiParsedResult, isSafetyDiagnosis: e.target.value as any })}
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none mb-2"
                        >
                          <option value="대상">대상</option>
                          <option value="비대상">비대상</option>
                          <option value="검토 필요">검토 필요</option>
                        </select>
                        <textarea
                          value={aiParsedResult.safetyDiagnosisReason || ''}
                          onChange={(e) => setAiParsedResult({ ...aiParsedResult, safetyDiagnosisReason: e.target.value })}
                          rows={3}
                          className="w-full p-2 border border-slate-200 bg-white rounded-lg focus:outline-none text-[10px] leading-relaxed"
                          title="정밀안전진단 판단 근거"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">작업환경측정 대상</label>
                        <select
                          value={aiParsedResult.isWorkEnvMeasure}
                          onChange={(e) => setAiParsedResult({ ...aiParsedResult, isWorkEnvMeasure: e.target.value as any })}
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none mb-2"
                        >
                          <option value="대상">대상</option>
                          <option value="비대상">비대상</option>
                          <option value="검토 필요">검토 필요</option>
                        </select>
                        <textarea
                          value={aiParsedResult.workEnvMeasureReason || ''}
                          onChange={(e) => setAiParsedResult({ ...aiParsedResult, workEnvMeasureReason: e.target.value })}
                          rows={3}
                          className="w-full p-2 border border-slate-200 bg-white rounded-lg focus:outline-none text-[10px] leading-relaxed"
                          title="작업환경측정 판단 근거"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">특수건강검진 대상</label>
                        <select
                          value={aiParsedResult.isSpecialHealthCheck}
                          onChange={(e) => setAiParsedResult({ ...aiParsedResult, isSpecialHealthCheck: e.target.value as any })}
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none mb-2"
                        >
                          <option value="대상">대상</option>
                          <option value="비대상">비대상</option>
                          <option value="검토 필요">검토 필요</option>
                        </select>
                        <textarea
                          value={aiParsedResult.specialHealthCheckReason || ''}
                          onChange={(e) => setAiParsedResult({ ...aiParsedResult, specialHealthCheckReason: e.target.value })}
                          rows={3}
                          className="w-full p-2 border border-slate-200 bg-white rounded-lg focus:outline-none text-[10px] leading-relaxed"
                          title="특수건강검진 판단 근거"
                        />
                      </div>
                    </div>
                  </div>

                  {/* GHS Hazards Review */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">GHS 위험성 체크 항목 검토 (AI 자동 판정 결과)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {(Object.keys(HAZARD_LABELS) as Array<keyof GhsHazards>).map((key) => {
                        const isChecked = aiParsedResult.ghsHazards?.[key];
                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => {
                              const updatedGhs = { ...aiParsedResult.ghsHazards, [key]: !isChecked };
                              setAiParsedResult({ ...aiParsedResult, ghsHazards: updatedGhs });
                            }}
                            className={`py-1.5 px-3 border rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                            }`}
                          >
                            <span>{HAZARD_LABELS[key]}</span>
                            <div className={`w-2.5 h-2.5 rounded ${isChecked ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="bg-purple-50/50 p-4 border border-purple-100 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-900">대장 관리 책임 승인자 서명</span>
                    <span className="font-bold text-purple-800">👤 {managers[aiLab] || '안전 담당자'} (자동서명)</span>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAiParsedResult(null);
                        setAiStatus('idle');
                      }}
                      className="px-4.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {submitting ? '등록 처리 중...' : '검토 완료 및 대장 등록 확정'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 6. SEARCH AND FILTERS GRID CONTAINER */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-blue-500" /> 관리대장 세부 필터링 및 시약 검색
              </h2>
              <button
                onClick={clearAllFilters}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                필터 조건 초기화
              </button>
            </div>

            {/* Core query, location and legal status filter selectors */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
              {/* Query bar */}
              <div className="col-span-1 md:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="물질명, CAS 번호, 제조사, 보관장소 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/10 focus:outline-none bg-slate-50/50"
                />
              </div>

              {/* Location Select */}
              <div>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none bg-slate-50/50"
                  title="보관장소 필터"
                >
                  <option value="전체">보관장소: 전체</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Legal diagnosis */}
              <div>
                <select
                  value={filterSafety}
                  onChange={(e) => setFilterSafety(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none bg-slate-50/50"
                  title="정밀안전진단 필터"
                >
                  <option value="전체">정밀안전진단: 전체</option>
                  <option value="대상">대상</option>
                  <option value="비대상">비대상</option>
                  <option value="검토 필요">검토 필요</option>
                </select>
              </div>

              {/* Measuring target */}
              <div>
                <select
                  value={filterWorkEnv}
                  onChange={(e) => setFilterWorkEnv(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none bg-slate-50/50"
                  title="작업환경측정 필터"
                >
                  <option value="전체">작업환경측정: 전체</option>
                  <option value="대상">대상</option>
                  <option value="비대상">비대상</option>
                  <option value="검토 필요">검토 필요</option>
                </select>
              </div>
            </div>

            {/* GHS Checkboxes filters */}
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                GHS 유해성 단독/다중 매칭 (체크 시 해당 속성 모두 포함 물질 필터):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ghsKeys.map((key) => {
                  const active = selectedHazards[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleHazardFilter(key)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                        active
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      {HAZARD_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 7. CHEMICAL REGISTRY DATA TABLE VIEW */}
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xs overflow-hidden flex-1 flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                📂 [현재 분류: {selectedLab}] 대장 목록
                <span className="bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                  {filteredChemicals.length}건
                </span>
              </span>
              <button
                onClick={fetchData}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                title="데이터베이스 새로고침"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/40">
                    <th className="py-3 px-4 w-12 text-center">순번</th>
                    <th className="py-3 px-4 w-32">소속 연구실</th>
                    <th className="py-3 px-4">물질명 (제품명)</th>
                    <th className="py-3 px-4 w-32 font-mono">CAS No.</th>
                    <th className="py-3 px-4">제조처</th>
                    <th className="py-3 px-4 text-right w-24">현재 보유량</th>
                    <th className="py-3 px-4 w-28">보관 장소</th>
                    <th className="py-3 px-4 w-24 text-center">GHS 유해인자</th>
                    <th className="py-3 px-4 w-24 text-center">법적대상</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                          <span>중앙 안전 데이터베이스 적재 중...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredChemicals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        필터 조건이나 선택된 소속 연구실에 부합하는 활성 시약이 존재하지 않습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredChemicals.map((chem) => {
                      // Compile hazard counts or icons
                      const hazardCount = Object.values(chem.ghsHazards).filter(Boolean).length;
                      
                      // Targets compile
                      const isDiag = chem.isSafetyDiagnosis === '대상';
                      const isMeas = chem.isWorkEnvMeasure === '대상';
                      const isCheck = chem.isSpecialHealthCheck === '대상';

                      return (
                        <tr
                          key={chem.id}
                          onClick={() => setSelectedChemical(chem)}
                          className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 text-center font-mono text-slate-400 font-medium">
                            {chem.num}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                              {chem.labName || '미지정'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 truncate max-w-[200px]" title={chem.name}>
                            {chem.name}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-600">
                            {chem.casNo || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-500 truncate max-w-[120px]" title={chem.manufacturer}>
                            {chem.manufacturer || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-800 font-mono">
                            {chem.quantity.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{chem.unit}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[100px]" title={chem.location}>{chem.location}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {hazardCount > 0 ? (
                              <span className="inline-block bg-red-50 text-red-700 border border-red-100 font-black px-1.5 py-0.5 rounded text-[10px]">
                                GHS {hazardCount}종
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {isDiag && <span className="w-4 h-4 rounded bg-red-100 text-red-800 font-extrabold flex items-center justify-center text-[8px]" title="정밀안전진단 대상">진</span>}
                              {isMeas && <span className="w-4 h-4 rounded bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-[8px]" title="작업환경측정 대상">측</span>}
                              {isCheck && <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-[8px]" title="특수건강검진 대상">검</span>}
                              {!isDiag && !isMeas && !isCheck && <span className="text-slate-300 font-bold">-</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* 8. DETAILED MODAL VIEWER */}
      {selectedChemical && (
        <DetailModal
          chemical={selectedChemical}
          onClose={() => setSelectedChemical(null)}
          onUpdate={handleChemicalUpdateFromModal}
          onDelete={handleChemicalDelete}
          onAddAttachment={handleAddAttachment}
          managers={managers}
        />
      )}
    </div>
  );
}
