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


    console.log("FILE CHECK:", {
      exists: !!fileData,
      mimeType
    });


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

      model:"gemini-2.0-flash",

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
                "이 MSDS 문서를 분석해서 물질명, CAS 번호, 제조사를 JSON으로 추출해주세요."
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

          }

        }

      }

    });


    console.log(
      "GEMINI TEXT:",
      response.text
    );


    return res.status(200).json({

      name: response.text

    });


  } catch(error:any) {


    console.error(
      "PARSE ERROR:",
      error
    );


    return res.status(500).json({

      error:error.message

    });

  }

}