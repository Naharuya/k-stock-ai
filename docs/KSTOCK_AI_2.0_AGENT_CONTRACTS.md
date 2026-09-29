# K-Stock AI 2.0 Agent Contracts

## Build order
1. Evidence
2. Capital Tracker
3. Influential Person profile
4. Media & Mention
5. Investor Psychology
6. Fundamental / Valuation / Flow / Macro / Sentiment
7. Risk
8. Bear
9. Consensus
10. Ranking
11. Investment Committee
12. Orchestrator

## Rule
Every agent consumes structured facts and emits a structured result. No agent may invent a transaction, filing date, actor identity, or source.

## Mandatory evidence fields
- id
- sourceType
- sourceUrl or sourceName
- observedAt
- actorId
- actorType
- companyId
- ticker
- market
- signalType
- confidence
- factSummary
- inferenceSummary

## Evidence gate
Only information publicly observable by the D-2 cutoff is eligible for the daily ranking. Transaction date and publication date remain separate fields when available.

## Safety gates
- broker execution disabled
- live trading disabled
- no guaranteed-return wording
- no order generation
- no ranking without evidence
- Bear and Risk review required before Investment Committee approval
