export default function handler(req: any, res: any) {
  const managers = {
    "생명공학실험실": "홍길동",
    "분석실": "김철수",
    "기기실": "이영희",
    "화학실험실": "박민수",
    "공동연구실": "최준호"
  };

  if (req.method === "GET") {
    return res.status(200).json(managers);
  }

  if (req.method === "POST") {
    return res.status(200).json({
      success: true,
      managers: req.body?.managers || {}
    });
  }

  return res.status(405).json({
    error: "Method Not Allowed"
  });
}