export function applyRiskHardStop({ committee, risk, dart }) {
  const criticalDart =
    dart?.impact === "VERY_NEGATIVE" &&
    dart?.important === true;

  if (
    risk?.criticalRisk === true ||
    risk?.riskLevel === "VERY_HIGH" ||
    risk?.excludeSuggested === true ||
    criticalDart
  ) {
    return {
      ...committee,
      status: "EXCLUDE",
      riskOverride: true,
      riskOverrideReason: criticalDart
        ? "CRITICAL_DART_EVENT"
        : "CRITICAL_RISK",
    };
  }

  return {
    ...committee,
    riskOverride: false,
  };
}
