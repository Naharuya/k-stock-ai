const POSITIVE = [
  "호실적", "최대 실적", "실적 개선", "흑자전환", "증익", "수주", "계약", "승인", "허가",
  "신제품", "점유율 확대", "증설", "투자 확대", "배당", "자사주 매입", "자사주 소각", "목표가 상향",
  "상향", "반등", "회복", "급등", "상승", "돌파", "성장", "기대", "강세", "수혜"
];

const NEGATIVE = [
  "실적 부진", "적자전환", "적자", "감익", "하향", "목표가 하향", "급락", "하락", "약세", "쇼크",
  "리콜", "소송", "제재", "과징금", "압수수색", "수사", "횡령", "배임", "유상증자", "감자",
  "부도", "회생", "상장폐지", "거래정지", "해킹", "화재", "파업", "불확실성", "우려", "리스크"
];

const HIGH_RISK = [
  "상장폐지", "거래정지", "부도", "회생", "횡령", "배임", "압수수색", "대규모 리콜", "유상증자"
];

export function classifyNewsRisk(title) {
  const text = String(title || "");
  const matches = [...text.matchAll(new RegExp(HIGH_RISK.join("|"), "g"))];
  return matches.map((match, index) => {
    // Stop at the next event: resolving one event must not suppress another.
    const clause = text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length).split(/[,;.!?…]/u)[0];
    const uncertain = /(?:해제|해소|취소|철회|종결)\s*(검토|추진|신청|가능|예정|기대|전망)|부인.*(불구|하지만)|(?:해제|해소|취소|철회|종결).*(불발|실패|보류|아니|않)/u.test(clause);
    let status = "REVIEW_REQUIRED";
    if (!uncertain && /(?:혐의\s*)?(?:사실\s*(무근|아니)|부인|무혐의|무죄)/u.test(clause)) status = "DENIED";
    else if (!uncertain && /^\s*(?:조치\s*|결정\s*|신청\s*|위험\s*|위기\s*|우려\s*|절차\s*)?(?:해제|해소|철회|종결|취소)(?:\s|$|[되됐된돼,·])/u.test(clause)) status = "RESOLVED";
    return { keyword: match[0], status };
  });
}

function countMatches(text, words) {
  const lower = String(text || "").toLowerCase();
  return words.reduce((sum, word) => sum + (lower.includes(word.toLowerCase()) ? 1 : 0), 0);
}

function ageDays(iso) {
  if (!iso) return 99;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, ms / 86400000);
}

function recencyWeight(iso) {
  const days = ageDays(iso);
  if (days <= 1) return 1.0;
  if (days <= 3) return 0.8;
  if (days <= 7) return 0.6;
  return 0.4;
}

export function analyzeNewsItems(news) {
  const items = Array.isArray(news?.items) ? news.items : [];
  if (items.length === 0) {
    return {
      status: "INSUFFICIENT_DATA",
      score: null,
      max: 20,
      sentiment: "UNKNOWN",
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      highRiskEvents: [],
      contextualRiskEvents: [],
      topEvents: [],
      notes: ["분석 가능한 최근 뉴스가 없음"],
      caveat: news?.caveat || "뉴스 데이터 부족"
    };
  }

  let weightedPositive = 0;
  let weightedNegative = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  const highRiskEvents = [];
  const contextualRiskEvents = [];
  const scored = [];

  for (const item of items) {
    const pos = countMatches(item.title, POSITIVE);
    const contexts = classifyNewsRisk(item.title);
    const resolvedKeywords = new Set(contexts.filter((event) => event.status !== "REVIEW_REQUIRED" && !contexts.some((other) => other.keyword === event.keyword && other.status === "REVIEW_REQUIRED")).map((event) => event.keyword));
    const neg = countMatches(item.title, NEGATIVE.filter((word) => !resolvedKeywords.has(word)));
    const weight = recencyWeight(item.publishedAt);
    const raw = pos - neg;

    if (raw > 0) positiveCount += 1;
    else if (raw < 0) negativeCount += 1;
    else neutralCount += 1;

    weightedPositive += pos * weight;
    weightedNegative += neg * weight;

    const high = [...new Set(contexts.filter((event) => event.status === "REVIEW_REQUIRED").map((event) => event.keyword))];
    contextualRiskEvents.push(...contexts.filter((event) => event.status !== "REVIEW_REQUIRED").map((event) => ({ ...event, title: item.title, publishedAt: item.publishedAt, source: item.source })));
    if (high.length) {
      highRiskEvents.push({ title: item.title, keywords: high, status: "REVIEW_REQUIRED", publishedAt: item.publishedAt, source: item.source, link: item.link });
    }

    scored.push({ ...item, signal: raw > 0 ? "POSITIVE" : raw < 0 ? "NEGATIVE" : "NEUTRAL", impact: Math.abs(raw) * weight });
  }

  const balance = weightedPositive - weightedNegative;
  let score = 10 + Math.round(balance * 1.5);
  if (highRiskEvents.length > 0) score -= Math.min(6, highRiskEvents.length * 2);
  score = Math.max(0, Math.min(20, score));

  const sentiment = score >= 14 ? "POSITIVE" : score <= 7 ? "NEGATIVE" : "NEUTRAL_MIXED";
  const topEvents = scored
    .sort((a, b) => b.impact - a.impact || String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .slice(0, 5)
    .map(({ title, source, publishedAt, signal, link }) => ({ title, source, publishedAt, signal, link }));

  const notes = [
    `최근 뉴스 ${items.length}건 분석`,
    `긍정 ${positiveCount} / 부정 ${negativeCount} / 중립 ${neutralCount}`
  ];
  if (highRiskEvents.length) notes.push(`고위험 키워드 포함 뉴스 ${highRiskEvents.length}건`);

  return {
    status: "READY",
    score,
    max: 20,
    sentiment,
    positiveCount,
    negativeCount,
    neutralCount,
    highRiskEvents,
    contextualRiskEvents,
    topEvents,
    notes,
    caveat: `${news?.caveat || ""} News Score는 기사 제목의 키워드·최신성을 이용한 1차 휴리스틱이며, 기사 원문 사실확인·맥락판단은 v1.x에서 보강합니다.`.trim()
  };
}
