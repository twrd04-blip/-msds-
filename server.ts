/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured in environment variables or Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API: Analyze Hazardous Factor using Gemini 3.6 Flash
app.post("/api/gemini/analyze-factor", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, casNo, category } = req.body;

    if (!name) {
      res.status(400).json({ error: "유해인자 명칭은 필수 입력값입니다." });
      return;
    }

    const ai = getAiClient();

    const systemInstruction = `
      당신은 대한민국 산업안전보건법 및 고용노동부 고시(화학물질 및 물리적 인자의 노출기준)에 정통한 산업위생관리기사 및 안전관리자입니다.
      입력된 유해인자(화학 물질, 물리적 인자, 생물학적 인자, 인간공학적 요인 등)를 분석하여 해당 법령에 적합한 신뢰도 높은 유해성 정보를 제공하십시오.
      
      특히 다음 수치를 대한민국 노출기준에 부합하도록 제시하십시오:
      - 화학물질의 경우 가능하면 TWA(시간가중평균), STEL(단시간노출), 또는 Ceiling(최고노출) 기준값을 제시하십시오.
      - 물리적 인자(예: 소음, 진동 등)의 경우 노출 한계 기준(예: 90 dBA)을 제시하십시오.
      
      GHS 그림문자(ghsPictograms) 분류 규칙:
      - 입력된 인자가 화학물질이고 해당하는 유해성이 있다면 아래 9가지 키 중 매칭되는 것들을 배열로 반환하십시오:
        'explosive' (폭발성), 'flammable' (인화성), 'oxidizing' (산화성), 'gases_under_pressure' (고압가스), 'corrosive' (부식성), 'toxic' (급성 독성), 'irritant' (자극성/피부 과민성), 'health_hazard' (흡인 유해성/전신 유해성/발암성), 'environmental' (수생환경 유해성)
      - 물리적, 인간공학적 인자는 빈 배열 []을 반환해야 합니다.

      위험성 수준(riskLevel) 분류 규칙:
      - 인자의 독성, 전신 위해성, 발암성, 또는 중대한 사고 가능성이 높은 경우 '고위험', 일반 유독물이나 반복 소음 등은 '중위험', 비교적 단순 자극이나 저농도 유기용제, 가벼운 중량물 취급 등은 '저위험'으로 평가하십시오.
    `;

    const prompt = `
      [유해인자 정보]
      - 국문/영문 명칭: ${name}
      - CAS 번호: ${casNo || "없음"}
      - 분류: ${category || "화학적 인자"}

      위 유해인자에 대한 정확한 산업안전보건 기준 데이터를 조사하여 한국어로 작성해 주세요.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nameKo: { type: Type.STRING, description: "유해인자의 올바른 한글 표준 명칭" },
            nameEn: { type: Type.STRING, description: "유해인자의 올바른 영문 공식 명칭" },
            casNo: { type: Type.STRING, description: "CAS 번호가 있다면 정규 형식(예: 71-43-2), 없거나 물리적 인자면 'N/A' 또는 공백" },
            exposureLimitTwa: { type: Type.STRING, description: "OEL TWA 노출 기준 수치 및 단위 (예: '0.5 ppm', '90 dBA', '10 mg/m3')" },
            exposureLimitStel: { type: Type.STRING, description: "OEL STEL 노출 기준 또는 최고노출기준(Ceiling) 수치, 없으면 'N/A'" },
            healthEffects: { type: Type.STRING, description: "주요 인체 유해성, 흡입/접촉 시 주요 건강 증상을 1~2문장으로 명확히 요약" },
            ppeRequired: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "필수 지급 및 착용해야 할 개인보호구 목록 (예: ['유기화합물용 방독마스크', '내화학성 장갑(니트릴)', '화학물질용 보호안경'])"
            },
            safetyRules: { type: Type.STRING, description: "구체적이고 현실적인 안전 작업 수칙 (줄바꿈 문자를 포함해 1., 2., 3. 형태로 작성)" },
            emergencyRules: { type: Type.STRING, description: "누출 또는 인체 접촉 시 비상 조치 및 응급처치 요령 (줄바꿈 문자를 포함해 1., 2., 3. 형태로 작성)" },
            ghsPictograms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "매칭되는 GHS 그림문자 고유 키 목록 ('explosive', 'flammable', 'oxidizing', 'gases_under_pressure', 'corrosive', 'toxic', 'irritant', 'health_hazard', 'environmental' 중에서만 선택)"
            },
            riskLevel: { type: Type.STRING, description: "종합 위험 수준 평가 결과 ('저위험', '중위험', '고위험' 중 하나만 정확히 선택)" },
            measurementInterval: { type: Type.STRING, description: "작업환경측정 주기 대상 여부 및 주기 (예: '6개월 1회', '대상 아님')" },
            specialExam: { type: Type.BOOLEAN, description: "특수건강진단 대상 유해인자 여부 (대상인 경우 true, 아니면 false)" },
            detailedSafetyDiagnostic: { type: Type.BOOLEAN, description: "정밀안전진단 대상 유해인자 여부 (대상인 경우 true, 아니면 false)" },
            workEnvMeasurement: { type: Type.BOOLEAN, description: "작업환경측정 대상 유해인자 여부 (대상인 경우 true, 아니면 false)" }
          },
          required: [
            "nameKo", "nameEn", "exposureLimitTwa", "healthEffects", "ppeRequired", "safetyRules", "emergencyRules", "ghsPictograms", "riskLevel", "measurementInterval", "specialExam", "detailedSafetyDiagnostic", "workEnvMeasurement"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini AI로부터 빈 응답을 받았습니다.");
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Gemini Analyze Error:", error);
    res.status(500).json({
      error: "유해인자 AI 분석 중 오류가 발생했습니다.",
      details: error.message || error
    });
  }
});

// Setup Vite Dev server or Serve Static files in Production
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite server in development
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite middleware so it handles frontend files, CSS, TS compiling
    app.use(vite.middlewares);
  } else {
    // Serve production static files from /dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Hazardous Factors System] Server running on http://localhost:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || "development"}`);
  });
}

setupServer();
