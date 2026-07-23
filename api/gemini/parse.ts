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
                `
이 MSDS 문서를 분석해주세요.

반드시 JSON 형식으로만 반환하세요.

추출 항목:
- 물질명(name)
- CAS 번호(casNo)
- 제조사(manufacturer)

정보가 없으면 빈 문자열("")로 입력하세요.
`
            }
          ]
        }
      ],

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          properties: {
            name: {
              type: Type.STRING
            },

            casNo: {
              type: Type.STRING
            },

            manufacturer: {
              type: Type.STRING
            }
          },

          required: [
            "name"
          ]
        }
      }
    });


    // Gemini 응답 확인용 로그
    console.log(
      "GEMINI RESPONSE:",
      JSON.stringify(response)
    );


    const text = response.text || "{}";


    console.log(
      "GEMINI TEXT:",
      text
    );


    let parsed;

    try {

      parsed = JSON.parse(text);

    } catch (jsonError) {

      console.error(
        "JSON PARSE ERROR:",
        jsonError
      );

      parsed = {
        name: "",
        casNo: "",
        manufacturer: "",
        raw: text
      };
    }


    return res.status(200).json(parsed);


  } catch (error: any) {

    console.error(
      "GEMINI ERROR:",
      error
    );


    return res.status(500).json({
      error: error.message
    });
  }
}