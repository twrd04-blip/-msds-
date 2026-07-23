import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "db.json");

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    return {
      chemicals: []
    };
  }

  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function saveDB(db: any) {
  fs.writeFileSync(
    DB_PATH,
    JSON.stringify(db, null, 2),
    "utf8"
  );
}

export default function handler(req: any, res: any) {

  const db = loadDB();

  if (req.method === "GET") {
    return res.status(200).json(db.chemicals || []);
  }

  if (req.method === "POST") {

    const incoming = req.body;


    // 필수값 확인
    if (!incoming.name || !incoming.casNo) {
      return res.status(400).json({
        error: "물질명과 CAS No.는 필수입니다."
      });
    }


    // 같은 CAS No. 기존 물질 확인
    const existing = db.chemicals.find(
      (item: any) =>
        item.casNo === incoming.casNo
    );


    // 기존 물질이면 보유량 합산
    if (existing) {

      existing.amount =
        Number(existing.amount || 0) +
        Number(incoming.amount || 0);


      saveDB(db);

      return res.status(200).json({
        message: "기존 물질 보유량 합산 완료",
        data: existing
      });

    }


    // 신규 등록
    const newChemical = {
      id: Date.now(),
      ...incoming,
      createdAt: new Date().toISOString()
    };


    db.chemicals.push(newChemical);

    saveDB(db);


    return res.status(200).json({
      message: "신규 물질 등록 완료",
      data: newChemical
    });

  }
  }