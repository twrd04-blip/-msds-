/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import * as xlsx from 'xlsx';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GhsHazards {
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

interface RevisionLog {
  id: string;
  date: string;
  author: string;
  action: string;
  beforeValue?: string; // JSON string
  afterValue?: string;  // JSON string
}

interface Chemical {
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

interface DBStructure {
  chemicals: Chemical[];
  labManagers: Record<string, string>;
  globalLogs: {
    id: string;
    date: string;
    author: string;
    action: string;
  }[];
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Set up JSON body parser with a generous limit for PDF/image uploads and attachments
  app.use(express.json({ limit: '20mb' }));

  // Ensure uploads directory exists
  const UPLOADS_DIR = path.join(__dirname, 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Ensure data directory exists
  const DATA_DIR = path.join(__dirname, 'data');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const DB_FILE = path.join(DATA_DIR, 'db.json');

  // In-memory file registry for MIME types
  const fileMetadataMap = new Map<string, { filename: string; mimeType: string }>();

  // Default database initialization
  let db: DBStructure = {
    chemicals: [],
    labManagers: {
      '생명공학실험실': '홍길동',
      '분석실': '김철수',
      '기기실': '이영희',
      '화학실험실': '박민수',
      '공동연구실': '최준호'
    },
    globalLogs: [
      {
        id: 'log_initial',
        date: new Date().toISOString().replace('T', ' ').substr(0, 19),
        author: '시스템 관리자',
        action: '유해인자관리대장 통합 안전 관리 대시보드 시스템 가동 완료'
      }
    ]
  };

  // Load database persistently
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      // Prepopulate fileMetadataMap with uploaded files from DB so they serve correctly upon server restart
      for (const chem of db.chemicals) {
        if (chem.msdsFileId && chem.msdsFileName) {
          fileMetadataMap.set(chem.msdsFileId, {
            filename: chem.msdsFileName,
            mimeType: chem.msdsFileName.endsWith('.pdf') ? 'application/pdf' : 'image/png'
          });
        }
        if (chem.attachments) {
          for (const att of chem.attachments) {
            fileMetadataMap.set(att.id, {
              filename: att.name,
              mimeType: att.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load database. Initializing default.', err);
    }
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }

  // Save helper
  const saveDB = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  };

  // Initialize Gemini SDK
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Log action helper
  const logGlobalAction = (author: string, action: string) => {
    db.globalLogs.push({
      id: `glog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString().replace('T', ' ').substr(0, 19),
      author,
      action
    });
    if (db.globalLogs.length > 200) {
      db.globalLogs.shift();
    }
    saveDB();
  };

  // Helper to compute deep diff
  const computeDiff = (before: Partial<Chemical>, after: Partial<Chemical>) => {
    const diffBefore: any = {};
    const diffAfter: any = {};
    let hasChanges = false;

    const trackKeys = [
      'name', 'casNo', 'manufacturer', 'quantity', 'unit', 'location', 'labName',
      'isSafetyDiagnosis', 'isWorkEnvMeasure', 'isSpecialHealthCheck', 'unNo', 'formula',
      'usage', 'firstAid', 'storageMethod', 'status'
    ];

    for (const key of trackKeys) {
      const bVal = (before as any)[key];
      const aVal = (after as any)[key];
      if (bVal !== aVal) {
        diffBefore[key] = bVal;
        diffAfter[key] = aVal;
        hasChanges = true;
      }
    }

    // Check GHS hazards nested equality
    if (before.ghsHazards && after.ghsHazards) {
      const ghsKeys = Object.keys(before.ghsHazards) as Array<keyof GhsHazards>;
      const gBefore: any = {};
      const gAfter: any = {};
      let ghsChanged = false;

      for (const gk of ghsKeys) {
        if (before.ghsHazards[gk] !== after.ghsHazards[gk]) {
          gBefore[gk] = before.ghsHazards[gk];
          gAfter[gk] = after.ghsHazards[gk];
          ghsChanged = true;
          hasChanges = true;
        }
      }

      if (ghsChanged) {
        diffBefore.ghsHazards = gBefore;
        diffAfter.ghsHazards = gAfter;
      }
    }

    return {
      hasChanges,
      beforeValue: JSON.stringify(diffBefore),
      afterValue: JSON.stringify(diffAfter)
    };
  };

  // --- API ROUTES ---

  // Get Chemicals
  app.get('/api/chemicals', (req, res) => {
    return res.json(db.chemicals);
  });

  // Get Lab Managers
  app.get('/api/managers', (req, res) => {
    return res.json(db.labManagers);
  });

  // Save Lab Managers
  app.post('/api/managers', (req, res) => {
    const body = req.body;
    let newManagers: Record<string, string> = {};
    let renamed: { from: string; to: string }[] = [];
    let deleted: string[] = [];

    if (body && body.managers) {
      newManagers = body.managers;
      renamed = body.renamed || [];
      deleted = body.deleted || [];
    } else {
      newManagers = body || {};
    }

    db.labManagers = newManagers;

    // Propagate renamed laboratories to chemicals
    if (Array.isArray(renamed)) {
      for (const op of renamed) {
        if (op.from && op.to) {
          db.chemicals.forEach(c => {
            if (c.labName === op.from) {
              c.labName = op.to;
            }
          });
        }
      }
    }

    // Propagate deleted laboratories to chemicals
    if (Array.isArray(deleted)) {
      for (const lab of deleted) {
        db.chemicals.forEach(c => {
          if (c.labName === lab) {
            c.labName = '미지정';
          }
        });
      }
    }

    logGlobalAction('시스템 관리자', '연구실 및 안전 담당자 구성 정보 변경 적용');
    saveDB();
    return res.json({ success: true, managers: db.labManagers });
  });

  // Get Global Logs
  app.get('/api/logs', (req, res) => {
    return res.json(db.globalLogs);
  });

  // AI Parser Endpoint with enhanced metadata
  app.post('/api/gemini/parse', async (req, res) => {
    try {
      const { fileData, fileName, mimeType, pastedText } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY가 서버에 설정되어 있지 않습니다. AI Studio Secrets 패널에서 키를 입력해주세요.',
        });
      }

      let fileId: string | undefined = undefined;

      if (fileData && fileName && mimeType) {
        fileId = `msds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const base64Data = fileData.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(UPLOADS_DIR, fileId);
        
        fs.writeFileSync(filePath, buffer);
        fileMetadataMap.set(fileId, { filename: fileName, mimeType });
      }

      let contents: any[] = [];
      if (fileData && mimeType) {
        const base64Data = fileData.replace(/^data:.*?;base64,/, '');
        contents.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
        contents.push({
          text: '이 MSDS 파일에서 화학물질명(제품명), CAS 번호, 제조자명, 유엔번호(UN No), 화학식(분자식), 권장 용도, 응급조치 요령 요약, 보관 및 취급방법 요약, GHS 위험 항목 분류, 그리고 한국 산업안전보건법 및 연구실 안전환경 조성법에 근거한 법적 규제 대상 여부(정밀안전진단, 작업환경측정, 특수건강검진) 및 해당 판정의 상세한 법적 구제 근거(판단근거), 그리고 추출 항목별 신뢰도 백분율을 추출해주세요.'
        });
      } else if (pastedText) {
        contents.push({
          text: `다음 MSDS 텍스트에서 주요 화학물질 정보를 추출하고 분석해주세요:\n\n${pastedText}`
        });
      } else {
        return res.status(400).json({ error: '분석할 파일 또는 텍스트를 제공해야 합니다.' });
      }

      const promptInstructions = `
        당신은 대한민국 산업안전보건법 및 연구실 안전환경 조성에 관한 법률에 정통한 화학물질 안전 진단 전문가입니다.
        MSDS 텍스트 혹은 파일을 정확히 스캔하여 아래 JSON Schema 규격에 맞게 정보를 추출하고 법적 규제 대상 여부를 판정해 주세요.

        [법적 규제 대상 판정 기준 및 가이드]
        1. 정밀안전진단 대상 (isSafetyDiagnosis)
           - 연구실 안전법에 의거, 폭발성(explosive), 인화성(flammable), 산화성(oxidizing) 유해화학물질이거나 극인화성 물질, 또는 강산/강염기 등 심각한 화학적 자극성을 지녀 정밀 진단이 필수적인 물질인 경우 '대상'으로 지정합니다.
           - 예: Methanol, Ethanol, Acetone, Hydrochloric acid, Nitric acid, Sulfuric acid, Sodium hydroxide, Toluene, Benzene, Hydrogen gas 등은 '대상'.
           - 안전하고 유해가 거의 없는 친환경 세제, 증류수, 전해질염 일부 등은 '비대상'. 애매한 경우 '검토 필요'.

        2. 작업환경측정 대상 (isWorkEnvMeasure)
           - 산업안전보건법 상 작업환경측정 대상 유해인자 190여종에 해당하는 경우 '대상'입니다.
           - 흔히 사용하는 유기용제(Ethanol, Methanol, Acetone, Isopropyl Alcohol, Hexane, Toluene, Xylene, THF), 산/알카리류(Hydrochloric, Sulfuric, Nitric acid, Sodium Hydroxide), 중금속류, 가스류 등은 대부분 '대상'입니다.
           - 단순 염류, 순수 물, 완충용액 등 측정할 대상이 아닌 경우 '비대상'.

        3. 특수건강검진 대상 (isSpecialHealthCheck)
           - 산업안전보건법 상 특수건강검진 대상 유해인자 170여종에 해당하는 경우 '대상'입니다.
           - 유기용제(Methanol, Acetone, Toluene, Xylene, Isopropyl alcohol, THF 등), 중금속류, 독성 가스, 특정 화학물질(Formaldehyde, Phenol 등), 그리고 대다수 강산류 노출 물질은 '대상'입니다.
           - 물, 단순 식품 첨가제 성분 등 검진 유해인자가 아닌 경우 '비대상'.

        각 법적 대상 판정에 대해 구체적인 산업안전보건법/연구실안전법 시행규칙 조항이나 유해인자 분류 명칭을 기반으로 한 판단근거(safetyDiagnosisReason, workEnvMeasureReason, specialHealthCheckReason)를 친절하게 작성해 주세요.
        또한, 각 핵심 추출 정보(이름, CAS 번호, 제조사)의 글자 시각 상태나 본문 일치 신뢰도 백분율(confidenceName, confidenceCasNo, confidenceManufacturer, 0~100 사이 정수값)도 평가하여 반환해 주세요.
        모든 텍스트 정보는 품위 있고 한국 법 규정에 알맞은 정확한 한국어로 작성해 주세요.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: promptInstructions,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: '화학물질명 또는 상표명 (한국어로 번역 또는 인지 가능한 명칭)' },
              casNo: { type: Type.STRING, description: 'CAS Registry Number (예: 64-17-5). 추출되지 않으면 빈칸' },
              manufacturer: { type: Type.STRING, description: '제조사 또는 공급업체명' },
              unNo: { type: Type.STRING, description: '유엔 번호 (UN Number) 네 자리 코드 (예: UN 1170). 없으면 빈 문자열' },
              formula: { type: Type.STRING, description: '화학식 또는 분자식 (예: C2H5OH). 없으면 빈 문자열' },
              usage: { type: Type.STRING, description: '권장 용도 및 제한 사항 요약' },
              firstAid: { type: Type.STRING, description: '응급조치 요령 요약 (눈, 피부, 흡입, 섭취 시 대응)' },
              storageMethod: { type: Type.STRING, description: '보관 및 취급방법 요약 (밀폐, 환기, 온도 조언 등)' },
              ghsHazards: {
                type: Type.OBJECT,
                properties: {
                  explosive: { type: Type.BOOLEAN, description: '폭발성 여부' },
                  flammable: { type: Type.BOOLEAN, description: '인화성 여부' },
                  oxidizing: { type: Type.BOOLEAN, description: '산화성 여부' },
                  gasUnderPressure: { type: Type.BOOLEAN, description: '고압가스 여부' },
                  corrosive: { type: Type.BOOLEAN, description: '피부 부식성 또는 금속 부식성 여부' },
                  acuteToxicity: { type: Type.BOOLEAN, description: '급성 독성 여부' },
                  healthHazard: { type: Type.BOOLEAN, description: '흡입 유해성, 발암성, 생식세포 변이원성 등 특정 표적장기 건강유해성 여부' },
                  irritant: { type: Type.BOOLEAN, description: '눈/피부 자극성, 경고 표지, 심한 가려움 등 자극성 여부' },
                  environmentalHazard: { type: Type.BOOLEAN, description: '수생 환경 유해성 여부' }
                },
                required: [
                  'explosive', 'flammable', 'oxidizing', 'gasUnderPressure', 'corrosive',
                  'acuteToxicity', 'healthHazard', 'irritant', 'environmentalHazard'
                ]
              },
              isSafetyDiagnosis: { type: Type.STRING, description: "정밀안전진단 대상 여부 ('대상', '비대상', '검토 필요' 중 하나로 정확히 일치)" },
              isWorkEnvMeasure: { type: Type.STRING, description: "작업환경측정 대상 여부 ('대상', '비대상', '검토 필요' 중 하나로 정확히 일치)" },
              isSpecialHealthCheck: { type: Type.STRING, description: "특수건강검진 대상 여부 ('대상', '비대상', '검토 필요' 중 하나로 정확히 일치)" },
              confidenceName: { type: Type.INTEGER, description: '물질명 추출 신뢰도 백분율 (0-100 사이 정수)' },
              confidenceCasNo: { type: Type.INTEGER, description: 'CAS 번호 추출 신뢰도 백분율 (0-100 사이 정수)' },
              confidenceManufacturer: { type: Type.INTEGER, description: '제조사 추출 신뢰도 백분율 (0-100 사이 정수)' },
              safetyDiagnosisReason: { type: Type.STRING, description: '정밀안전진단 대상 여부 판단의 구체적 법적 근거 또는 이유' },
              workEnvMeasureReason: { type: Type.STRING, description: '작업환경측정 대상 여부 판단의 구체적 법적 근거 또는 이유' },
              specialHealthCheckReason: { type: Type.STRING, description: '특수건강검진 대상 여부 판단의 구체적 법적 근거 또는 이유' }
            },
            required: [
              'name', 'casNo', 'manufacturer', 'unNo', 'formula', 'usage', 'firstAid', 'storageMethod', 'ghsHazards',
              'isSafetyDiagnosis', 'isWorkEnvMeasure', 'isSpecialHealthCheck',
              'confidenceName', 'confidenceCasNo', 'confidenceManufacturer',
              'safetyDiagnosisReason', 'workEnvMeasureReason', 'specialHealthCheckReason'
            ]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error('Gemini API로부터 응답을 추출하지 못했습니다.');
      }

      const parsedData = JSON.parse(resultText);

      // Attach file metadata if uploaded
      if (fileId) {
        parsedData.msdsFileId = fileId;
        parsedData.msdsFileName = fileName;
      }

      return res.json(parsedData);
    } catch (error: any) {
      console.error('OCR Parsing Error:', error);
      return res.status(500).json({ error: error.message || 'MSDS 정보를 자동으로 분석하지 못했습니다.' });
    }
  });

  // Serve uploaded MSDS file or attachment
  app.get('/api/msds/:fileId', (req, res) => {
    const { fileId } = req.params;
    const filePath = path.join(UPLOADS_DIR, fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('요청하신 파일을 찾을 수 없습니다.');
    }

    const meta = fileMetadataMap.get(fileId);
    if (meta) {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(meta.filename)}"`);
      res.setHeader('Content-Type', meta.mimeType);
    } else {
      res.setHeader('Content-Type', fileId.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    }

    fs.createReadStream(filePath).pipe(res);
  });

  // Create or Update Chemical (Handles Merging based on CAS or Name + Manufacturer)
  app.post('/api/chemicals', (req, res) => {
    try {
      const incoming: Partial<Chemical> = req.body;
      const author = incoming.logs?.[0]?.author || '안전 담당자';
      const changeSummary = incoming.logs?.[0]?.action || '화학물질 등록';

      if (!incoming.name || !incoming.labName) {
        return res.status(400).json({ error: '물질명(제품명) 및 소속 연구실 지정은 필수 항목입니다.' });
      }

      // Check Duplication: Same lab, non-waste state, same CAS or (Name + Manufacturer)
      const inputCas = incoming.casNo?.trim();
      const inputName = incoming.name?.trim();
      const inputManufacturer = incoming.manufacturer?.trim();

      let existingIndex = db.chemicals.findIndex(c => {
        if (c.labName !== incoming.labName || c.status === '폐기') return false;
        if (inputCas && c.casNo && inputCas === c.casNo.trim()) return true;
        if (!inputCas && !c.casNo && inputName === c.name.trim() && inputManufacturer === c.manufacturer?.trim()) return true;
        return false;
      });

      const todayStr = new Date().toISOString().replace('T', ' ').substr(0, 19);

      if (existingIndex !== -1) {
        // Merge Quantity & Log merging
        const existing = db.chemicals[existingIndex];
        const oldQty = existing.quantity;
        const incomingQty = Number(incoming.quantity || 0);
        existing.quantity += incomingQty;
        
        // Update locations or keep existing
        if (incoming.location && incoming.location !== '직접 입력' && incoming.location !== existing.location) {
          existing.location = incoming.location;
        }

        // Add revision log to the chemical
        const mergeLogId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const actionStr = `[기존 자산 매칭 합산] 동일 화학물질 입고에 따른 수량 추가 합산 (기존: ${oldQty}${existing.unit} ➔ 합산: ${existing.quantity}${existing.unit})`;
        
        existing.logs.push({
          id: mergeLogId,
          date: todayStr,
          author,
          action: actionStr,
          beforeValue: JSON.stringify({ quantity: oldQty }),
          afterValue: JSON.stringify({ quantity: existing.quantity })
        });

        logGlobalAction(author, `[${incoming.labName}] ${existing.name} 보유량 합산 추가 입고 처리 (+${incomingQty}${existing.unit})`);
        saveDB();

        return res.json({ success: true, chemical: existing, merged: true });
      } else {
        // Register New Chemical
        const newNum = db.chemicals.length > 0 ? Math.max(...db.chemicals.map(c => c.num)) + 1 : 1;
        const newId = `chem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newChemical: Chemical = {
          id: newId,
          num: newNum,
          name: incoming.name,
          casNo: incoming.casNo || '',
          manufacturer: incoming.manufacturer || '',
          quantity: Number(incoming.quantity || 0),
          unit: incoming.unit || '개',
          location: incoming.location || '미정',
          labName: incoming.labName,
          ghsHazards: incoming.ghsHazards || {
            explosive: false, flammable: false, oxidizing: false, gasUnderPressure: false,
            corrosive: false, acuteToxicity: false, healthHazard: false, irritant: false, environmentalHazard: false
          },
          isSafetyDiagnosis: incoming.isSafetyDiagnosis || '검토 필요',
          isWorkEnvMeasure: incoming.isWorkEnvMeasure || '검토 필요',
          isSpecialHealthCheck: incoming.isSpecialHealthCheck || '검토 필요',
          unNo: incoming.unNo || '',
          formula: incoming.formula || '',
          usage: incoming.usage || '',
          firstAid: incoming.firstAid || '',
          storageMethod: incoming.storageMethod || '',
          msdsFileId: incoming.msdsFileId || '',
          msdsFileName: incoming.msdsFileName || '',
          status: '사용중',
          confidenceName: incoming.confidenceName,
          confidenceCasNo: incoming.confidenceCasNo,
          confidenceManufacturer: incoming.confidenceManufacturer,
          safetyDiagnosisReason: incoming.safetyDiagnosisReason,
          workEnvMeasureReason: incoming.workEnvMeasureReason,
          specialHealthCheckReason: incoming.specialHealthCheckReason,
          attachments: incoming.attachments || [],
          logs: []
        };

        const creationLogId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        newChemical.logs.push({
          id: creationLogId,
          date: todayStr,
          author,
          action: `유해인자 대장 최초 신규 등록 완료 (사유: ${changeSummary})`,
          beforeValue: '',
          afterValue: JSON.stringify({
            name: newChemical.name,
            casNo: newChemical.casNo,
            quantity: newChemical.quantity,
            location: newChemical.location
          })
        });

        db.chemicals.push(newChemical);
        logGlobalAction(author, `[${newChemical.labName}] ${newChemical.name} 유해인자 대장 신규 등록`);
        saveDB();

        return res.json({ success: true, chemical: newChemical, merged: false });
      }
    } catch (err: any) {
      console.error('Error in POST /api/chemicals:', err);
      return res.status(500).json({ error: err.message || '저장 도중 서버 오류가 발생하였습니다.' });
    }
  });

  // Edit / Update Chemical & Track Diff History Log
  app.put('/api/chemicals/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { updatedFields, author, changeSummary } = req.body;

      const idx = db.chemicals.findIndex(c => c.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: '해당 대장 항목을 찾을 수 없습니다.' });
      }

      const existing = db.chemicals[idx];
      const diff = computeDiff(existing, updatedFields);

      if (!diff.hasChanges) {
        return res.json({ success: true, chemical: existing, message: '변경된 항목이 없습니다.' });
      }

      // Merge updatedFields with existing
      const todayStr = new Date().toISOString().replace('T', ' ').substr(0, 19);
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      // Append revision log
      existing.logs.push({
        id: logId,
        date: todayStr,
        author,
        action: `정보 수동 수정 이력 기록 (사유: ${changeSummary})`,
        beforeValue: diff.beforeValue,
        afterValue: diff.afterValue
      });

      // Apply modifications
      Object.assign(existing, updatedFields);

      logGlobalAction(author, `[${existing.labName}] ${existing.name} 정보 수정 및 변경 이력 기록`);
      saveDB();

      return res.json({ success: true, chemical: existing });
    } catch (err: any) {
      console.error('Error in PUT /api/chemicals:', err);
      return res.status(500).json({ error: err.message || '수정 도중 서버 오류가 발생하였습니다.' });
    }
  });

  // Soft Delete Chemical (Change state to '폐기')
  app.delete('/api/chemicals/:id', (req, res) => {
    try {
      const { id } = req.params;
      const idx = db.chemicals.findIndex(c => c.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: '해당 대장 항목을 찾을 수 없습니다.' });
      }

      const existing = db.chemicals[idx];
      const author = db.labManagers[existing.labName] || '안전 담당자';
      const todayStr = new Date().toISOString().replace('T', ' ').substr(0, 19);

      existing.status = '폐기';
      existing.logs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        date: todayStr,
        author,
        action: '대장 자산 폐기 처리 완료 (보관 장소 회수 및 유해 인자 목록 비활성화)'
      });

      logGlobalAction(author, `[${existing.labName}] ${existing.name} 유해인자 폐기 완료 (시약 상태 변경)`);
      saveDB();

      return res.json({ success: true, chemical: existing });
    } catch (err: any) {
      console.error('Error in DELETE /api/chemicals:', err);
      return res.status(500).json({ error: err.message || '폐기 처리 도중 서버 오류가 발생하였습니다.' });
    }
  });

  // Additional attachment upload
  app.post('/api/attachments', (req, res) => {
    try {
      const { chemicalId, fileData, fileName, type } = req.body;

      if (!chemicalId || !fileData || !fileName || !type) {
        return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
      }

      const chemIdx = db.chemicals.findIndex(c => c.id === chemicalId);
      if (chemIdx === -1) {
        return res.status(404).json({ error: '해당 화학물질을 찾을 수 없습니다.' });
      }

      const fileId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const base64Data = fileData.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filePath = path.join(UPLOADS_DIR, fileId);

      fs.writeFileSync(filePath, buffer);
      fileMetadataMap.set(fileId, {
        filename: fileName,
        mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
      });

      const chemical = db.chemicals[chemIdx];
      if (!chemical.attachments) {
        chemical.attachments = [];
      }

      chemical.attachments.push({
        id: fileId,
        name: fileName,
        type: type as any,
        uploadDate: new Date().toISOString().replace('T', ' ').substr(0, 10)
      });

      const author = db.labManagers[chemical.labName] || '안전 담당자';
      chemical.logs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        date: new Date().toISOString().replace('T', ' ').substr(0, 19),
        author,
        action: `추가 첨부 파일 등록 완료 (파일: ${fileName}, 유형: ${
          type === 'test_report' ? '시험성적서' : type === 'purchase_history' ? '구매내역' : '관련문서'
        })`
      });

      logGlobalAction(author, `[${chemical.labName}] ${chemical.name}에 추가 서류 첨부 (${fileName})`);
      saveDB();

      return res.json({ success: true, chemical });
    } catch (err: any) {
      console.error('Attachment Upload Error:', err);
      return res.status(500).json({ error: err.message || '첨부파일 등록에 실패했습니다.' });
    }
  });

  // Excel Bulk Import Parser
  app.post('/api/excel/import', (req, res) => {
    try {
      const { fileData, author } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: '업로드된 파일 데이터가 없습니다.' });
      }

      const base64Data = fileData.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows: any[] = xlsx.utils.sheet_to_json(worksheet);

      if (rawRows.length === 0) {
        return res.status(400).json({ error: '엑셀 시트에 데이터가 없거나 형식이 올바르지 않습니다.' });
      }

      // Fuzzy column finder
      const fuzzyGet = (row: any, keys: string[]) => {
        for (const k of Object.keys(row)) {
          const kClean = k.toLowerCase().replace(/[^a-zA-Z0-9가-힣]/g, '');
          for (const key of keys) {
            if (kClean.includes(key)) {
              return row[k];
            }
          }
        }
        return undefined;
      };

      let importedCount = 0;
      let mergedCount = 0;

      for (const row of rawRows) {
        const nameVal = fuzzyGet(row, ['물질명', '제품명', '화학물질', '물질', 'name', 'product']);
        if (!nameVal) continue; // Skip invalid rows without name

        const labVal = fuzzyGet(row, ['연구실', '실험실', '소속', 'lab']) || '생명공학실험실';
        const casVal = String(fuzzyGet(row, ['cas', '캐스', 'casno', 'cas번호']) || '').trim();
        const manufacturerVal = fuzzyGet(row, ['제조사', '공급사', '제조', 'manufacturer', 'supplier']) || '';
        const qtyVal = Number(fuzzyGet(row, ['보유량', '수량', '재고', 'quantity', 'amount']) || 0);
        const unitVal = String(fuzzyGet(row, ['단위', 'unit']) || '개').trim();
        const locationVal = fuzzyGet(row, ['보관장소', '보관', '위치', 'location', 'storage']) || '시약장-1';

        // Check for duplicates in same lab and merge
        let duplicateIdx = db.chemicals.findIndex(c => {
          if (c.labName !== labVal || c.status === '폐기') return false;
          if (casVal && c.casNo && casVal === c.casNo.trim()) return true;
          if (!casVal && !c.casNo && nameVal.trim() === c.name.trim() && manufacturerVal.trim() === c.manufacturer.trim()) return true;
          return false;
        });

        const todayStr = new Date().toISOString().replace('T', ' ').substr(0, 19);

        if (duplicateIdx !== -1) {
          const existing = db.chemicals[duplicateIdx];
          const oldQty = existing.quantity;
          existing.quantity += qtyVal;
          existing.logs.push({
            id: `log_excel_merge_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            date: todayStr,
            author,
            action: `[엑셀 대량 업로드 병합] 수량 추가 합산 (기존: ${oldQty}${existing.unit} ➔ 합산: ${existing.quantity}${existing.unit})`,
            beforeValue: JSON.stringify({ quantity: oldQty }),
            afterValue: JSON.stringify({ quantity: existing.quantity })
          });
          mergedCount++;
        } else {
          const newNum = db.chemicals.length > 0 ? Math.max(...db.chemicals.map(c => c.num)) + 1 : 1;
          const newId = `chem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const newChem: Chemical = {
            id: newId,
            num: newNum,
            name: String(nameVal),
            casNo: casVal,
            manufacturer: String(manufacturerVal),
            quantity: qtyVal,
            unit: unitVal,
            location: String(locationVal),
            labName: String(labVal),
            ghsHazards: {
              explosive: false, flammable: false, oxidizing: false, gasUnderPressure: false,
              corrosive: false, acuteToxicity: false, healthHazard: false, irritant: false, environmentalHazard: false
            },
            isSafetyDiagnosis: '검토 필요',
            isWorkEnvMeasure: '검토 필요',
            isSpecialHealthCheck: '검토 필요',
            status: '사용중',
            logs: [{
              id: `log_excel_import_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              date: todayStr,
              author,
              action: '엑셀 일괄 임포트로 대장 자산 최초 생성됨.'
            }]
          };

          db.chemicals.push(newChem);
          importedCount++;
        }
      }

      logGlobalAction(author, `엑셀 대량 업로드 진행 완료: ${importedCount}건 신규 등록, ${mergedCount}건 자동 합산`);
      saveDB();

      return res.json({ success: true, importedCount, mergedCount });
    } catch (err: any) {
      console.error('Excel Import Error:', err);
      return res.status(500).json({ error: err.message || '엑셀 파일을 가져오지 못했습니다.' });
    }
  });

  // Excel Registry Downloader
  app.get('/api/excel/export', (req, res) => {
    try {
      const activeChemicals = db.chemicals.filter(c => c.status !== '폐기');

      const dataToExport = activeChemicals.map(c => {
        const hazardsList = Object.entries(c.ghsHazards)
          .filter(([_, active]) => active)
          .map(([key, _]) => {
            const hazardMap: any = {
              explosive: '폭발성', flammable: '인화성', oxidizing: '산화성', gasUnderPressure: '고압가스',
              corrosive: '부식성', acuteToxicity: '급성독성', healthHazard: '건강유해성', irritant: '자극성',
              environmentalHazard: '환경유해성'
            };
            return hazardMap[key] || key;
          }).join(', ');

        return {
          '순번': c.num,
          '소속 연구실': c.labName,
          '물질명 (제품명)': c.name,
          'CAS 번호': c.casNo,
          '제조사 / 공급처': c.manufacturer,
          '현재 보유량': c.quantity,
          '단위': c.unit,
          '보관 장소': c.location,
          'GHS 유해인자 종류': hazardsList || '없음',
          '정밀안전진단 대상 여부': c.isSafetyDiagnosis,
          '작업환경측정 대상 여부': c.isWorkEnvMeasure,
          '특수건강검진 대상 여부': c.isSpecialHealthCheck,
          '유엔 번호 (UN No)': c.unNo || '',
          '분자식 (Formula)': c.formula || '',
          '권장 용도': c.usage || '',
          '응급조치 요령 요약': c.firstAid || '',
          '보관방법 요약': c.storageMethod || ''
        };
      });

      const worksheet = xlsx.utils.json_to_sheet(dataToExport);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, '유해인자관리대장');

      // Style adjustments for visibility
      const colWidths = [
        { wch: 6 }, { wch: 16 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 8 },
        { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 15 }
      ];
      worksheet['!cols'] = colWidths;

      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Hazardous_Chemical_Registry.xlsx"');
      return res.end(buffer);
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      return res.status(500).send('엑셀 내려받기를 진행하지 못했습니다.');
    }
  });

  // --- DEV / PRODUCTION MIDDLEWARE ---

  // Serve static assets or mount Vite dev server
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In development mode, mount Vite in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`[FULL-STACK SERVER] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start full-stack server:', err);
});
