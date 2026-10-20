# K-Stock AI 2.0 Implementation Backlog

## Phase 0 — foundation
- [ ] Confirm terminology: candidate, signal, evidence, actor, D-2.
- [ ] Keep live trading and broker order execution disabled.
- [ ] Add v2 module boundary under `src/v2`.
- [ ] Add evidence schema and validation tests.
- [ ] Add ranking score contract tests.

## Phase 1 — evidence registry
- [ ] Define `EvidenceItem` model.
- [ ] Define freshness labels.
- [ ] Define source confidence labels.
- [ ] Add duplicate detection contract.
- [ ] Add fact vs inference separation.

## Phase 2 — actor intelligence
- [ ] Define actor profile model.
- [ ] Seed investor profile examples.
- [ ] Seed entrepreneur profile examples.
- [ ] Add style matching function.
- [ ] Add actor credibility scoring.

## Phase 3 — capital tracker MVP
- [x] Add OpenDART ownership collector and optional candidate API refresh (live provider verification pending).
- [x] Connect Berkshire SEC 13F holdings to GLOBAL evidence (explicit CUSIP mapping; live verification pending).
- [x] Add SEC Form 4 collection and candidate evidence (recent submissions only; live verification pending).
- [ ] Add transaction/publication date separation.
- [ ] Add D-2 eligibility filter.

## Phase 4 — media and mention MVP
- [ ] Add media mention model.
- [ ] Add mention classification.
- [ ] Add YouTube/Instagram/news source abstraction.
- [ ] Add neutral vs strategic vs capital intent classifier.
- [ ] Add source confidence scoring.

## Phase 5 — company and market analysis
- [ ] Add fundamental score placeholder.
- [ ] Add valuation score placeholder.
- [ ] Add market flow score placeholder.
- [ ] Add sentiment score placeholder.
- [ ] Add macro compatibility placeholder.

## Phase 6 — risk and bear gate
- [ ] Add Risk Agent contract.
- [ ] Add Bear Agent contract.
- [ ] Require bear thesis for every candidate.
- [ ] Add high-risk exclusion flags.

## Phase 7 — ranking and committee
- [ ] Implement weighted score.
- [ ] Select KR 15 and Global 20.
- [ ] Add missing evidence blocker.
- [ ] Add Investment Committee summary.
- [ ] Add daily report JSON format.

## Phase 8 — app/API
- [x] Add `/api/v2/candidates` endpoint (local input file; external collection not connected).
- [x] Add `/api/v2/candidates/:ticker` endpoint (evidence and risk detail).
- [x] Add web candidate cards (Android native view remains pending).
- [x] Add detailed evidence view (web).
- [x] Add risk/bear view (web).

## Phase 9 — automation
- [ ] Add daily scheduler design.
- [ ] Add 02:00 collection stage.
- [ ] Add 06:30 ranking stage.
- [ ] Add 08:00 report stage.
- [ ] Add operational logs.

## Definition of done for MVP
- [ ] No live trading path.
- [ ] No broker orders.
- [ ] Every candidate has at least one evidence item.
- [ ] Every evidence item has a date and source.
- [ ] Every candidate has a bear thesis.
- [ ] KR output max 15.
- [ ] Global output max 20.
- [ ] D-2 filter test passes.
- [ ] Safety tests pass.
