import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method Not Allowed"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY가 없습니다."
      });
    }

    const { fileData, mimeType } = req.body;

    if (!fileData || !mimeType) {
      return res.status(400).json({
        error: "파일 데이터가 없습니다."
      });
    }

    const ai = new GoogleGenAI({
      apiKey
    });

    const base64Data = fileData.replace(
      /^data:.*?;base64,/,
      ""
    );

    const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [
    {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        },
        {
          text:
            "이 MSDS 파일에서 물질명, CAS 번호, 제조사를 추출해서 JSON으로 반환해주세요."
        }
      ]
    }
  ],

  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        casNo: { type: Type.STRING },
        manufacturer: { type: Type.STRING }
      },
      required: [
        "name",
        "casNo",
        "manufacturer"
      ]
    }
  }
});

   const text = response.text || "{}";

const parsed = JSON.parse(text);

return res.status(200).json(parsed); 

  } catch (error: any) {

    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}