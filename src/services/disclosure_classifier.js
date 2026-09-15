const BASE_RULES = [
  { type: "DELISTING_RISK", severity: "VERY_HIGH", scoreImpact: -45, keywords: ["상장폐지"] },
  { type: "MAJOR_FINANCING", severity: "HIGH", scoreImpact: -15, keywords: ["단기차입금증가결정", "장기차입금증가결정", "대규모자금조달"] },
  { type: "CAPITAL_INCREASE", severity: "HIGH", scoreImpact: -22, keywords: ["유상증자", "주주배정", "제3자배정"] },
  { type: "CAPITAL_REDUCTION", severity: "VERY_HIGH", scoreImpact: -32, keywords: ["감자결정", "무상감자"] },
  { type: "CONVERTIBLE_BOND", severity: "HIGH", scoreImpact: -18, keywords: ["전환사채", "전환청구권"] },
  { type: "BW", severity: "HIGH", scoreImpact: -18, keywords: ["신주인수권부사채", "신주인수권행사"] },
  { type: "EXCHANGEABLE_BOND", severity: "MEDIUM", scoreImpact: -10, keywords: ["교환사채"] },
  { type: "MAJOR_SHAREHOLDER_CHANGE", severity: "HIGH", scoreImpact: -20, keywords: ["최대주주변경", "최대주주 변경"] },
  { type: "EMBEZZLEMENT_BREACH_OF_TRUST", severity: "VERY_HIGH", scoreImpact: -40, keywords: ["횡령", "배임"] },
  { type: "INSOLVENCY", severity: "VERY_HIGH", scoreImpact: -50, keywords: ["부도발생", "회생절차", "파산"] },
  { type: "TREASURY_SHARE_BUYBACK", severity: "POSITIVE", scoreImpact: 8, keywords: ["자기주식취득", "자사주취득"] },
  { type: "TREASURY_SHARE_DISPOSAL", severity: "MEDIUM", scoreImpact: -6, keywords: ["자기주식처분", "자사주처분"] },
  { type: "MERGER_SPLIT", severity: "MEDIUM", scoreImpact: 0, keywords: ["합병결정", "분할결정", "회사분할"] }
];

const AUDIT_CRITICAL_KEYWORDS = ["의견거절", "감사의견거절", "부적정의견", "감사의견부적정"];
const AUDIT_WARNING_KEYWORDS = ["한정의견", "감사의견한정", "계속기업불확실성", "계속기업존속불확실성"];
const AUDIT_NEUTRAL_KEYWORDS = ["감사보고서제출"];

const TRADING_SUSPENSION_KEYWORDS = ["매매거래정지", "거래정지"];
const TRADING_RELEASE_KEYWORDS = ["매매거래정지해제", "거래정지해제"];
const TECHNICAL_SUSPENSION_REASONS = [
  "무상증자", "주식분할", "액면분할", "주식병합", "액면병합", "권리락"
];

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, "");
}

function includesAny(normalized, keywords) {
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function semanticEventForReport(reportName) {
  const normalized = normalizeText(reportName);

  // 감사보고서는 '제출' 자체가 위험이 아니다. 제목에 실제 감사위험 표현이 있는 경우만 위험으로 분류한다.
  if (includesAny(normalized, AUDIT_CRITICAL_KEYWORDS)) {
    return {
      type: "AUDIT_RISK",
      severity: "VERY_HIGH",
      scoreImpact: -45,
      semanticReason: "AUDIT_OPINION_CRITICAL"
    };
  }

  if (includesAny(normalized, AUDIT_WARNING_KEYWORDS)) {
    return {
      type: "AUDIT_WARNING",
      severity: "HIGH",
      scoreImpact: -20,
      semanticReason: "AUDIT_OPINION_WARNING"
    };
  }

  if (includesAny(normalized, AUDIT_NEUTRAL_KEYWORDS)) {
    return {
      type: "AUDIT_REPORT_SUBMITTED",
      severity: "INFO",
      scoreImpact: 0,
      semanticReason: "AUDIT_REPORT_SUBMISSION_ONLY"
    };
  }

  // 거래정지 해제는 현재의 위험 거래정지가 아니다.
  if (includesAny(normalized, TRADING_RELEASE_KEYWORDS)) {
    return {
      type: "TRADING_SUSPENSION_RELEASED",
      severity: "INFO",
      scoreImpact: 0,
      semanticReason: "TRADING_SUSPENSION_RELEASED"
    };
  }

  // 무상증자/분할 등 기술적 사유의 일시 거래정지는 자동 Hard Stop으로 보지 않는다.
  if (includesAny(normalized, TRADING_SUSPENSION_KEYWORDS)) {
    if (includesAny(normalized, TECHNICAL_SUSPENSION_REASONS)) {
      return {
        type: "TEMP_TRADING_SUSPENSION",
        severity: "INFO",
        scoreImpact: 0,
        semanticReason: "TECHNICAL_CORPORATE_ACTION"
      };
    }

    return {
      type: "TRADING_SUSPENSION",
      severity: "VERY_HIGH",
      scoreImpact: -45,
      semanticReason: "NON_TECHNICAL_TRADING_SUSPENSION"
    };
  }

  return null;
}

export function classifyDisclosures(disclosureResponse) {
  const rows = Array.isArray(disclosureResponse?.list) ? disclosureResponse.list : [];
  const events = [];

  for (const row of rows) {
    const reportName = row.report_nm || "";
    const normalized = normalizeText(reportName);

    const semantic = semanticEventForReport(reportName);
    if (semantic) {
      events.push({
        ...semantic,
        reportName,
        receiptNo: row.rcept_no || null,
        receiptDate: row.rcept_dt || null,
        filerName: row.flr_nm || null
      });
      continue;
    }

    for (const rule of BASE_RULES) {
      const matched = rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
      if (matched) {
        events.push({
          type: rule.type,
          severity: rule.severity,
          scoreImpact: rule.scoreImpact,
          reportName,
          receiptNo: row.rcept_no || null,
          receiptDate: row.rcept_dt || null,
          filerName: row.flr_nm || null,
          semanticReason: "KEYWORD_RULE"
        });
        break;
      }
    }
  }

  const negativeEvents = events.filter((e) => e.scoreImpact < 0);
  const positiveEvents = events.filter((e) => e.scoreImpact > 0);
  const informationalEvents = events.filter((e) => e.scoreImpact === 0);
  const critical = negativeEvents.some((e) => e.severity === "VERY_HIGH");
  const totalImpact = events.reduce((sum, e) => sum + e.scoreImpact, 0);

  return {
    rawCount: rows.length,
    eventCount: events.length,
    critical,
    totalImpact,
    negativeEvents,
    positiveEvents,
    informationalEvents,
    events,
    semanticGateVersion: "V2"
  };
}
