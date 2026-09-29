# K-Stock AI 2.0 Agent Architecture

## Top-level flow

```text
D-2 public data
  -> Data Collectors
  -> Capital Tracker + Media & Mention
  -> Investor Psychology
  -> Fundamental / Valuation / Flow / Macro
  -> Evidence / Fact Check
  -> Risk + Bear
  -> Ranking
  -> Investment Committee
  -> KR 15 / Global 20
```

## Core agents

### 1. Orchestrator / Master Router
Controls daily workflow, dispatches work, blocks unsafe actions, and makes sure all project boundaries are respected.

### 2. Capital Tracker Agent
Tracks actual capital movement:
- 13F
- Form 4
- OpenDART executive and major shareholder ownership
- significant holding reports
- buybacks
- strategic investments

Output:
- actor
- company
- ticker
- action type
- transaction date if known
- filing date
- publication date
- confidence
- source

### 3. Influential Person Agent
Maintains actor profiles:
- investment style
- historical preferences
- time horizon
- risk tolerance
- sector preference
- historical success/failure notes

### 4. Media & Mention Agent
Collects and classifies public mentions:
- news
- YouTube
- Instagram
- X
- podcasts
- interviews
- conferences

Classification:
- positive capital intent
- positive strategic view
- neutral mention
- risk warning
- negative capital intent

### 5. Investor Psychology Agent
Interprets behavior using actor profile and market context:
- fear buying
- conviction accumulation
- cycle rotation
- defensive positioning
- momentum chase
- strategic optionality

### 6. Company Fundamental Agent
Scores business quality:
- revenue growth
- margin trend
- cash flow
- debt
- ROE
- operating moat
- earnings revision

### 7. Valuation Agent
Checks price discipline:
- PER
- PBR
- EV/EBITDA
- FCF yield
- historical valuation band
- peer comparison

### 8. Market & Flow Agent
Checks market behavior:
- volume
- institutional/foreign flow
- ETF flow
- short interest
- volatility
- trend position

### 9. Macro Agent
Checks macro compatibility:
- rates
- FX
- oil/commodities
- liquidity
- cycle stage
- policy direction

### 10. Sentiment Agent
Checks crowd psychology:
- news tone
- social tone
- attention spike
- fear/greed
- hype risk

### 11. Evidence / Fact Check Agent
Mandatory gate for every claim:
- source exists
- date exists
- actor identity is clear
- company/ticker mapping is valid
- D-2 eligibility is valid
- fact vs inference separated
- duplicate and rumor filtering

### 12. Risk Agent
Identifies risk:
- financial risk
- regulatory risk
- litigation risk
- accounting risk
- governance risk
- liquidity risk
- valuation risk
- data-staleness risk

### 13. Bear Agent
Always writes the opposing case:
- why not this stock?
- what could be wrong?
- what would invalidate the thesis?
- what is already priced in?

### 14. Correlation / Consensus Agent
Detects cross-actor convergence:
- multiple actors on same stock
- multiple actors on same sector
- different investment styles converging
- action + statement alignment

### 15. Ranking Agent
Combines all scores and selects:
- KR top 15
- Global top 20

### 16. Investment Committee Agent
Final review:
- checks evidence quality
- checks bear thesis
- blocks overconfident claims
- approves daily app output

### 17. Data Freshness Agent
Labels all data:
- D-2
- D-7
- monthly
- quarterly
- 45-day delay possible
- stale

### 18. Compliance / Safety Agent
Prevents unsafe product behavior:
- no live trading
- no order generation
- no guaranteed profit
- no definitive buy command
- no hidden evidence

## MVP agents
Build these first:
1. Orchestrator
2. Capital Tracker
3. Influential Person
4. Media & Mention
5. Investor Psychology
6. Evidence / Fact Check
7. Risk + Bear
8. Ranking + Investment Committee

## Data model concept

```text
EvidenceItem
- id
- sourceType
- sourceUrl
- sourceName
- observedAt
- eventDate
- filingDate
- publicationDate
- actorId
- actorType
- companyId
- ticker
- market
- signalType
- direction
- confidence
- freshnessLabel
- rawSummary
- factSummary
- inferenceSummary
```

## Scoring contract

```text
finalScore =
  capitalAction * 0.25
+ actorCredibility * 0.15
+ consensus * 0.10
+ mediaSignal * 0.10
+ fundamental * 0.15
+ valuation * 0.08
+ marketFlow * 0.07
+ sentiment * 0.05
+ dataFreshness * 0.05
- riskPenalty
```

## Safety invariant
The system must refuse to start or publish a ranking if live trading or broker order execution is enabled.
