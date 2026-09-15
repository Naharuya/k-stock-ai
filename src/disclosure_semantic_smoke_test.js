import { classifyDisclosures } from "./services/disclosure_classifier.js";

function classify(reportNames) {
  return classifyDisclosures({
    list: reportNames.map((report_nm, i) => ({
      report_nm,
      rcept_no: String(i + 1),
      rcept_dt: "20260909"
    }))
  });
}

const auditSubmission = classify(["감사보고서제출"]);
const technicalStop = classify(["주권매매거래정지 (무상증자)"]);
const adverseAudit = classify(["감사의견 거절 관련 안내"]);
const ordinaryStop = classify(["주권매매거래정지"]);

const ok =
  auditSubmission.critical === false &&
  auditSubmission.negativeEvents.length === 0 &&
  auditSubmission.events[0]?.type === "AUDIT_REPORT_SUBMITTED" &&
  technicalStop.critical === false &&
  technicalStop.events[0]?.type === "TEMP_TRADING_SUSPENSION" &&
  adverseAudit.critical === true &&
  adverseAudit.events[0]?.type === "AUDIT_RISK" &&
  ordinaryStop.critical === true &&
  ordinaryStop.events[0]?.type === "TRADING_SUSPENSION";

console.log(JSON.stringify({
  ok,
  cases: {
    auditSubmission: auditSubmission.events[0],
    technicalStop: technicalStop.events[0],
    adverseAudit: adverseAudit.events[0],
    ordinaryStop: ordinaryStop.events[0]
  }
}, null, 2));

if (!ok) process.exit(1);
