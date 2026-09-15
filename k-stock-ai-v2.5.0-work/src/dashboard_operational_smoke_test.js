import fs from "fs";

const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const checks = {
  trustSummary: html.includes('id="candidateTrustSummary"'),
  rejectedTable: html.includes('id="candidateRejectedBody"'),
  reasonColumn: html.includes('핵심 이유'),
  riskColumn: html.includes('주요 위험'),
  trustLogic: js.includes('function verifyLabel') && js.includes("'A'"),
  rejectedRender: js.includes("candidateRejectedBody"),
  verificationSummary: js.includes("verificationSummary"),
  styles: css.includes('.trust-summary') && css.includes('.hardstop-chip'),
  dynamicVersion: html.includes('id="appVersion"') && js.includes('loadAppVersion'),
  selectedDeepSummary: js.includes('selectedDeepVerified'),
  koreanRiskLabels: js.includes('현재가·정밀 리스크 미검증'),
  analyzeUsesCode: js.includes("$('stockCode').value=b.dataset.code"),
  entryExitUi: html.includes('id="portfolioList"') && html.includes('id="saveEntry"'),
  entryExitLogic: js.includes('evaluatePosition') && js.includes('compactEntryAnalysis'),
  entryExitStyles: css.includes('.position-card') && css.includes('.entry-form')
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, version: "2.5.0", checks }, null, 2));
if (!ok) process.exitCode = 1;
