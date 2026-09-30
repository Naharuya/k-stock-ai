const CRITICAL_DART_TITLE_RULES = [
  { eventType: "EMBEZZLEMENT_OR_BREACH", pattern: /횡령|배임/ },
  { eventType: "REHABILITATION", pattern: /회생절차/ },
  { eventType: "BANKRUPTCY", pattern: /파산(?:신청|선고|절차)/ },
  { eventType: "INSOLVENCY", pattern: /부도(?:발생)?|당좌거래정지/ },
  { eventType: "ADVERSE_AUDIT_OPINION", pattern: /(?:감사의견|감사보고서).{0,20}(?:의견\s*거절|거절|부적정)|(?:의견\s*거절|거절|부적정).{0,20}(?:감사의견|감사보고서)/ },
  {
    eventType: "DELISTING",
    pattern: /상장폐지\s*(?:사유 발생|결정)|상장폐지에 따른 정리매매 개시|형식적상장폐지/,
    excludePattern: /해외증권시장.*주권등상장폐지|이의신청|추가 우려|상장폐지 관련|효력정지.*가처분 신청/,
  },
];

export function detectCriticalDartDisclosures(disclosures) {
  const items = Array.isArray(disclosures) ? disclosures : [];
  const reasons = [];
  const seenReasons = new Set();
  const reviewReasons = [];
  const seenReviewReasons = new Set();
  let matchCount = 0;
  let reviewMatchCount = 0;

  for (const item of items) {
    const reportName = typeof item?.report_nm === "string" ? item.report_nm.trim() : "";
    if (!reportName) continue;

    for (const rule of CRITICAL_DART_TITLE_RULES) {
      if (rule.excludePattern?.test(reportName)) continue;
      if (rule.pattern.test(reportName)) {
        const isSubsidiary = /종속회사의주요경영사항/.test(reportName);
        const targetReasons = isSubsidiary ? reviewReasons : reasons;
        const targetSeen = isSubsidiary ? seenReviewReasons : seenReasons;
        if (isSubsidiary) reviewMatchCount += 1;
        else matchCount += 1;

        const reason = {
          eventType: rule.eventType,
          reportName,
          ...(isSubsidiary ? { scope: 'SUBSIDIARY' } : {}),
        };
        const reasonKey = `${rule.eventType}\u0000${reportName}`;
        if (!targetSeen.has(reasonKey)) {
          targetSeen.add(reasonKey);
          if (targetReasons.length < 10) targetReasons.push(reason);
        }
        break;
      }
    }
  }

  return {
    criticalDisclosure: matchCount > 0,
    matchCount,
    reasons,
    reviewMatchCount,
    reviewReasons,
    inspectedCount: items.length,
  };
}

export function applyRiskHardStop({ committee, risk, dart }) {
  const criticalDart =
    dart?.impact === "VERY_NEGATIVE" &&
    dart?.important === true;
  const criticalTitle = dart?.riskSignals?.criticalDisclosure === true;

  if (
    risk?.criticalRisk === true ||
    risk?.riskLevel === "VERY_HIGH" ||
    risk?.excludeSuggested === true ||
    criticalDart ||
    criticalTitle
  ) {
    return {
      ...committee,
      status: "EXCLUDE",
      riskOverride: true,
      riskOverrideReason: criticalDart
        ? "CRITICAL_DART_EVENT"
        : criticalTitle
          ? "CRITICAL_DART_TITLE_RULE"
        : "CRITICAL_RISK",
    };
  }

  return {
    ...committee,
    riskOverride: false,
  };
}
