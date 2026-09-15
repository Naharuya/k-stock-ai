function n(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function sum(rows, key) {
  return rows.reduce((acc, row) => acc + n(row[key]), 0);
}

function countPositive(rows, key) {
  return rows.reduce((acc, row) => acc + (n(row[key]) > 0 ? 1 : 0), 0);
}

function participant(rows, prefix) {
  const qtyKey = `${prefix}NetBuyQty`;
  const valueKey = `${prefix}NetBuyValue`;
  const five = rows.slice(0, 5);
  const twenty = rows.slice(0, 20);

  return {
    latestQty: rows[0] ? n(rows[0][qtyKey]) : null,
    latestValue: rows[0] ? n(rows[0][valueKey]) : null,
    netBuyQty5d: sum(five, qtyKey),
    netBuyQty20d: sum(twenty, qtyKey),
    netBuyValue5d: sum(five, valueKey),
    netBuyValue20d: sum(twenty, valueKey),
    positiveDays5d: countPositive(five, qtyKey),
    positiveDays20d: countPositive(twenty, qtyKey)
  };
}

export function buildFlowMetrics(flow) {
  const rows = Array.isArray(flow?.rows) ? flow.rows : [];
  if (!rows.length) {
    return {
      rows: 0,
      latestDate: null,
      foreign: participant([], "foreign"),
      institution: participant([], "institution"),
      personal: participant([], "personal"),
      combinedSmartMoneyQty5d: 0,
      combinedSmartMoneyQty20d: 0,
      combinedSmartMoneyValue5d: 0,
      combinedSmartMoneyValue20d: 0
    };
  }

  const foreign = participant(rows, "foreign");
  const institution = participant(rows, "institution");
  const personal = participant(rows, "personal");

  return {
    rows: rows.length,
    latestDate: rows[0].date,
    foreign,
    institution,
    personal,
    combinedSmartMoneyQty5d: foreign.netBuyQty5d + institution.netBuyQty5d,
    combinedSmartMoneyQty20d: foreign.netBuyQty20d + institution.netBuyQty20d,
    combinedSmartMoneyValue5d: foreign.netBuyValue5d + institution.netBuyValue5d,
    combinedSmartMoneyValue20d: foreign.netBuyValue20d + institution.netBuyValue20d
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function scoreFlow(metrics) {
  if (!metrics || metrics.rows < 5) {
    return {
      score: 10,
      max: 20,
      status: "INSUFFICIENT_HISTORY",
      notes: ["수급 이력이 5영업일 미만이라 중립점수 적용"],
      caveat: "수급점수는 외국인·기관의 5일/20일 순매수 방향을 단순 규칙으로 평가합니다."
    };
  }

  let score = 10;
  const notes = [];
  const f = metrics.foreign;
  const i = metrics.institution;

  if (f.netBuyQty20d > 0) {
    score += 3;
    notes.push("외국인 20일 누적 순매수");
  } else if (f.netBuyQty20d < 0) {
    score -= 3;
    notes.push("외국인 20일 누적 순매도");
  }

  if (i.netBuyQty20d > 0) {
    score += 3;
    notes.push("기관 20일 누적 순매수");
  } else if (i.netBuyQty20d < 0) {
    score -= 3;
    notes.push("기관 20일 누적 순매도");
  }

  if (metrics.combinedSmartMoneyQty5d > 0) {
    score += 2;
    notes.push("외국인+기관 최근 5일 합산 순매수");
  } else if (metrics.combinedSmartMoneyQty5d < 0) {
    score -= 2;
    notes.push("외국인+기관 최근 5일 합산 순매도");
  }

  const bothPositive = f.netBuyQty5d > 0 && i.netBuyQty5d > 0 &&
    f.netBuyQty20d > 0 && i.netBuyQty20d > 0;
  const bothNegative = f.netBuyQty5d < 0 && i.netBuyQty5d < 0 &&
    f.netBuyQty20d < 0 && i.netBuyQty20d < 0;

  if (bothPositive) {
    score += 2;
    notes.push("외국인·기관 5일/20일 동반 순매수");
  } else if (bothNegative) {
    score -= 2;
    notes.push("외국인·기관 5일/20일 동반 순매도");
  }

  return {
    score: clamp(score, 0, 20),
    max: 20,
    status: metrics.rows >= 20 ? "READY" : "PARTIAL_HISTORY",
    notes,
    caveat: "수급점수는 외국인·기관 순매수 수량의 방향성과 지속성을 보는 1차 휴리스틱이며, 시가총액·거래대금 정규화는 후속 보강 대상입니다."
  };
}
