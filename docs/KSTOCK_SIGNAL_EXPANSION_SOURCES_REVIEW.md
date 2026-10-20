# Official signal expansion source review — 2026-10-13 KST

Scope: `/Users/ari/ARI/projects/k-stock-ai`, existing dirty branch `auto/kstock-development-20260930`, baseline HEAD `ea406852610c00bef0dbe469de95c42fca662c30`. No other project, credentials, existing source files, accounts, orders or production changed.

## Actual official additions

- [Powell May 15 opening remarks](https://www.federalreserve.gov/newsevents/speech/powell20250515a.htm): official Chair identity/date/title verified. DAY precision; `spokenAt=null`, conservative end-of-day publication boundary; exact first public time unverified. This is separate from the preserved August 22 speech, but the same actor.
- [Waller July 17 speech](https://www.federalreserve.gov/newsevents/speech/waller20250717a.htm): official Governor identity/date/title verified. DAY precision; policy preference of the speaker, not an adopted FOMC action or Apple trading instruction. New actor `christopher-waller`; no role assumption outside the speech date.
- [Apple May 1 results](https://www.apple.com/newsroom/2025/05/apple-reports-second-quarter-results/): additional USD100bn authorization is `ANNOUNCED_INTENTION`, not execution.
- [Apple official consolidated financial statements](https://www.apple.com/newsroom/pdfs/fy2025-q2/FY25_Q2_Consolidated_Financial_Statements.pdf#page=3): financing cash flow for six months ended March 29, 2025 reports common-stock repurchases USD49,504 million = USD49,504,000,000 cash outflow. Financial period begins September 29, 2024. This confirms executed aggregate cash expenditure, not individual transaction dates, shares acquired, average price, or a CEO personal trade. `REPORTED_EXECUTION_AGGREGATE`, transactionDate/quantity/price null; no market reaction sample promoted.

Only editorial summaries and minimal numeric/provenance fields retained; originals referenced, not copied into Git/UI. SHA-256 and checkedAt stored per source. Official PDF table reviewed through browser extraction, not inferred from authorization. The existing single-transaction validator must treat aggregate execution separately and keep missing exact dates/quantity explicit.

## Collection evidence

Explicit bounded collector: `node scripts/collect-influence-expansion.mjs --read-only`.
Successful final collection: 4 official GET200; 2 statement sources + 2 capital events. Cache replay: 0 requests. All direct network reads this workstream: 10 (initial official probes3; first collector3; final successful collector4). Initial DNS-denied attempt produced no server response and is not counted as a successful external read. First PDF exceeded the2MB body cap; expanded bounded PDF cap10MB, did not bypass authentication or alter data. No infinite retries; final source cache is24h.

Private `data/v2/influence/expansion-sources.json`: mode0600, fullOriginalsStored=false. Shared existing `sources.json` and `capital-sec.json` preserved. No secret/user-agent/contact stored. No order endpoint or credential operation used.

## Integration contract

`schemaVersion:1`, `sources` compatible with existing statement-source normalizer; `capitalEvents` canonical company events; `actors` company:AAPL; `aggregatePeriodStart/End`, `amount/amountUnit`, `aggregateExecutionEvidenceVerified` on actual aggregate. Root integrates official host apple.com and distinct aggregate validation. Source collection complete; API, UI, full regression and Galaxy checks owned by root and not claimed here.

New statement market returns: HOLD pending exact/conservative publication, appropriate market price/benchmark and event-specific alignment. Institution or company actions are never attributed to Powell/Waller by timing alone. Two months of actual Apple holdings are preserved separately from aggregate corporate repurchases.

February SEC daily-index Last-Modified cause: UNRESOLVED. No historical generation log or independent official explanation acquired; current metadata alone cannot establish why it was revised.

Checks: `git diff --check` PASS; cache replay PASS0 requests; no new fixture tests in this source-only task. Root integration tests pending. Recommendation/Samsung performance/Apple ranking HOLD; live trading OFF; this workstream real order calls0 (collector only fixed public GETs).
