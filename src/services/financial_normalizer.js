function cleanNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const normalized = String(value)
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();

  if (!normalized || normalized === "-") return null;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function normalizeName(name = "") {
  return String(name)
    .replace(/\s+/g, "")
    .replace(/[()（）]/g, "")
    .toLowerCase();
}

function normalizeId(id = "") {
  return String(id).trim().toLowerCase();
}

const ACCOUNT_SPECS = {
  revenue: {
    statementDivs: ["IS", "CIS"],
    accountIds: [
      "ifrs-full_Revenue",
      "dart_Revenue"
    ],
    exactNames: [
      "매출액",
      "매출",
      "수익(매출액)",
      "영업수익"
    ]
  },
  operatingProfit: {
    statementDivs: ["IS", "CIS"],
    accountIds: [
      "dart_OperatingIncomeLoss",
      "ifrs-full_ProfitLossFromOperatingActivities"
    ],
    exactNames: [
      "영업이익",
      "영업이익(손실)",
      "영업이익손실"
    ]
  },
  netIncome: {
    statementDivs: ["IS", "CIS"],
    accountIds: [
      "ifrs-full_ProfitLoss",
      "ifrs-full_ProfitLossAttributableToOwnersOfParent"
    ],
    exactNames: [
      "당기순이익",
      "당기순이익(손실)",
      "당기순이익손실",
      "연결당기순이익"
    ]
  },
  assets: {
    statementDivs: ["BS"],
    accountIds: [
      "ifrs-full_Assets"
    ],
    exactNames: ["자산총계"]
  },
  liabilities: {
    statementDivs: ["BS"],
    accountIds: [
      "ifrs-full_Liabilities"
    ],
    exactNames: ["부채총계"]
  },
  equity: {
    statementDivs: ["BS"],
    accountIds: [
      "ifrs-full_Equity"
    ],
    exactNames: ["자본총계"]
  },
  cashAndEquivalents: {
    statementDivs: ["BS"],
    accountIds: [
      "ifrs-full_CashAndCashEquivalents"
    ],
    exactNames: [
      "현금및현금성자산",
      "현금및현금성자산"
    ]
  },
  intangibleAssets: {
    statementDivs: ["BS"],
    accountIds: [
      "ifrs-full_IntangibleAssetsOtherThanGoodwill",
      "dart_IntangibleAssets"
    ],
    exactNames: [
      "무형자산",
      "영업권이외의무형자산"
    ]
  },
  goodwill: {
    statementDivs: ["BS"],
    accountIds: [
      "ifrs-full_Goodwill"
    ],
    exactNames: [
      "영업권"
    ]
  }
};

function rankCandidate(row, spec) {
  const sjDiv = String(row.sj_div || "").trim().toUpperCase();
  const accountId = normalizeId(row.account_id);
  const accountName = normalizeName(row.account_nm);

  const statementRank = spec.statementDivs.includes(sjDiv) ? 1000 : -1000;

  let idRank = 0;
  const idIndex = spec.accountIds
    .map(normalizeId)
    .findIndex((id) => id === accountId);

  if (idIndex >= 0) {
    idRank = 500 - idIndex * 10;
  }

  let nameRank = 0;
  const nameIndex = spec.exactNames
    .map(normalizeName)
    .findIndex((name) => name === accountName);

  if (nameIndex >= 0) {
    nameRank = 300 - nameIndex * 10;
  }

  // Reject loose substring matches entirely for core accounts.
  if (idRank === 0 && nameRank === 0) return null;

  const consolidatedBonus =
    String(row.fs_div || "").toUpperCase() === "CFS" ? 20 : 0;

  const hasCurrentAmount =
    cleanNumber(row.thstrm_amount) !== null ? 10 : 0;

  return statementRank + idRank + nameRank + consolidatedBonus + hasCurrentAmount;
}

function pickAccount(rows, spec) {
  const candidates = rows
    .map((row) => ({ row, rank: rankCandidate(row, spec) }))
    .filter((item) => item.rank !== null && item.rank > 0)
    .sort((a, b) => b.rank - a.rank);

  if (!candidates.length) return null;

  const preferred = candidates[0].row;

  return {
    accountName: preferred.account_nm,
    accountId: preferred.account_id || null,
    current: cleanNumber(preferred.thstrm_amount),
    previous: cleanNumber(preferred.frmtrm_amount),
    previous2: cleanNumber(preferred.bfefrmtrm_amount),
    statementDiv: preferred.sj_div || null,
    statement: preferred.sj_nm || null,
    currency: preferred.currency || null
  };
}

function growth(current, previous) {
  if (
    current === null ||
    previous === null ||
    previous === 0
  ) return null;

  return ((current - previous) / Math.abs(previous)) * 100;
}

function ratio(numerator, denominator) {
  if (
    numerator === null ||
    denominator === null ||
    denominator === 0
  ) return null;

  return (numerator / denominator) * 100;
}

function validateFinancials(current, accounts) {
  const errors = [];
  const warnings = [];

  const required = ["revenue", "operatingProfit", "netIncome", "assets", "liabilities", "equity"];

  for (const key of required) {
    if (current[key] === null) {
      errors.push(`MISSING_${key.toUpperCase()}`);
    }
  }

  if (current.revenue !== null && current.revenue <= 0) {
    errors.push("REVENUE_NON_POSITIVE");
  }

  if (
    current.revenue !== null &&
    current.operatingProfit !== null &&
    Math.abs(current.operatingProfit) > Math.abs(current.revenue)
  ) {
    errors.push("OPERATING_PROFIT_EXCEEDS_REVENUE");
  }

  if (
    current.revenue !== null &&
    current.netIncome !== null &&
    Math.abs(current.netIncome) > Math.abs(current.revenue) * 1.5
  ) {
    warnings.push("NET_INCOME_UNUSUALLY_LARGE_VS_REVENUE");
  }

  if (
    current.assets !== null &&
    current.liabilities !== null &&
    current.equity !== null
  ) {
    const balanceGap = Math.abs(current.assets - (current.liabilities + current.equity));
    const tolerance = Math.max(Math.abs(current.assets) * 0.02, 1);

    if (balanceGap > tolerance) {
      warnings.push("BALANCE_SHEET_EQUATION_GAP_GT_2PCT");
    }
  }

  for (const [key, account] of Object.entries(accounts)) {
    if (!account) continue;

    if (
      ["revenue", "operatingProfit", "netIncome"].includes(key) &&
      !["IS", "CIS"].includes(String(account.statementDiv || "").toUpperCase())
    ) {
      errors.push(`WRONG_STATEMENT_DIV_${key.toUpperCase()}`);
    }

    if (
      ["assets", "liabilities", "equity"].includes(key) &&
      String(account.statementDiv || "").toUpperCase() !== "BS"
    ) {
      errors.push(`WRONG_STATEMENT_DIV_${key.toUpperCase()}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

export function normalizeFinancialStatements(financialResponse) {
  const rows = Array.isArray(financialResponse?.list)
    ? financialResponse.list
    : [];

  const accounts = {};

  for (const [key, spec] of Object.entries(ACCOUNT_SPECS)) {
    accounts[key] = pickAccount(rows, spec);
  }

  const current = Object.fromEntries(
    Object.entries(accounts).map(([key, value]) => [key, value?.current ?? null])
  );

  const previous = Object.fromEntries(
    Object.entries(accounts).map(([key, value]) => [key, value?.previous ?? null])
  );

  const metrics = {
    revenueGrowthPct: growth(current.revenue, previous.revenue),
    operatingProfitGrowthPct: growth(current.operatingProfit, previous.operatingProfit),
    netIncomeGrowthPct: growth(current.netIncome, previous.netIncome),
    operatingMarginPct: ratio(current.operatingProfit, current.revenue),
    netMarginPct: ratio(current.netIncome, current.revenue),
    debtRatioPct: ratio(current.liabilities, current.equity),
    roeApproxPct: ratio(current.netIncome, current.equity),
    equityRatioPct: ratio(current.equity, current.assets),
    roaApproxPct: ratio(current.netIncome, current.assets)
  };

  const validation = validateFinancials(current, accounts);

  return {
    status: financialResponse?.status || null,
    message: financialResponse?.message || null,
    rawRowCount: rows.length,
    accounts,
    current,
    previous,
    metrics,
    validation
  };
}

export function formatKrw(value) {
  if (value === null || value === undefined) return null;

  const abs = Math.abs(value);

  if (abs >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}조원`;
  }

  if (abs >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(0)}억원`;
  }

  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}
