# K-Stock AI 2.0 Product Plan

## Working name
K-Stock AI 2.0 — Capital Behavior Intelligence

## Product definition
K-Stock AI 2.0 is an investment intelligence app that tracks influential investors, institutions, insiders, major shareholders and global business leaders. It combines their capital actions, public statements, media mentions, company fundamentals, market flow, risk and opposing evidence to produce a daily research candidate list:

- Korea: 15 candidates
- Global: 20 candidates

This is not an automatic trading system and not a guaranteed buy recommendation system. It is a research and decision-support product.

## Core belief
Money is not only numbers. Money moves through people, psychology, authority, incentives, fear, conviction and capital allocation. The product therefore begins with people and capital behavior, then checks companies and markets.

## D-2 principle
Daily analysis uses only information publicly available up to D-2 23:59.

Important distinction:
- D-2 does not mean the person definitely bought the stock two days ago.
- D-2 means the system only uses information that was publicly observable by D-2.
- Actual trade date, filing date, publication date and analysis date must be stored separately.

Examples:
- SEC 13F can be delayed and must not be presented as yesterday's trade.
- Form 4 and domestic ownership reports may provide faster signals.
- Media and public comments are weaker than actual capital action.

## Tracked actor groups

### 1. Global investors
- Warren Buffett / Berkshire Hathaway
- Value investors
- Growth investors
- Macro investors
- Hedge funds and large asset managers

### 2. Global entrepreneurs and capital allocators
- Founders and CEOs of AI, semiconductor, energy, finance and consumer platforms
- Executives making large capital allocation, capex, partnership or acquisition decisions

### 3. Institutions, insiders and major shareholders
- SEC 13F institutions
- SEC Form 4 insiders
- OpenDART executives and major shareholders
- Significant holding reports
- Major shareholder changes

### 4. Industry influencers
- Analysts
- Industry experts
- Supply-chain leaders
- Conference speakers
- Official IR and investor day sources

## Evidence classes

### Highest weight: capital action
- New position
- Increased stake
- Reduced stake
- Exit
- Insider purchase
- Insider sale
- Buyback
- Strategic acquisition or investment

### Medium weight: verified public statements
- Investor letters
- Official interviews
- Earnings calls
- Shareholder meetings
- Conference talks
- Official social posts

### Supporting signal: media and online mentions
- YouTube
- Instagram
- X
- Reddit
- podcasts
- news
- blogs

All media mentions must be classified as one of:
- positive capital intent
- positive strategic view
- neutral mention
- risk warning
- negative capital intent

## Candidate output
Each candidate must include:
- ticker and company name
- market: KR or Global
- capital behavior score
- influential actor signal
- media mention signal
- fundamental score
- valuation score
- flow/momentum score
- sentiment score
- risk score
- evidence confidence
- data freshness label
- positive thesis
- bear thesis
- source list
- final committee opinion

## User experience principle
The user should not see only a score. The user should see why the candidate was selected, who or what created the signal, how fresh the evidence is, and what could be wrong.

## Safety and compliance
- No live trading.
- No broker orders.
- No guaranteed return language.
- No “must buy” language.
- Show data delay and source confidence.
- Separate fact from inference.
- Present candidates as research watchlist, not investment advice.

## MVP scope
MVP should implement:
1. Evidence registry
2. D-2 data freshness model
3. Actor profile model
4. Capital tracker skeleton
5. Media mention skeleton
6. Psychology interpretation skeleton
7. Fundamental scoring placeholder
8. Evidence/fact-check gate
9. Risk/Bear gate
10. Ranking output: KR 15 / Global 20

## Non-goals for MVP
- No automatic order execution
- No KIS order placement
- No real-money trading
- No unverified social-rumor recommendations
- No hidden black-box score without evidence
