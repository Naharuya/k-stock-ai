import assert from 'node:assert/strict';
import test from 'node:test';
import { runEvidenceAgent } from '../src/v2/agents/evidence_agent.js';
import { runKStockV2Pipeline } from '../src/v2/orchestrator.js';

const evidence = [
  { id:'e1', sourceType:'filing', sourceUrl:'https://example.test/e1', observedAt:'2026-09-27T10:00:00Z', actorId:'a1', actorType:'institution', companyId:'c1', ticker:'005930', market:'KR', signalType:'capital_action', actionType:'increase', confidence:1 },
  { id:'e2', sourceType:'interview', sourceUrl:'https://example.test/e2', observedAt:'2026-09-27T11:00:00Z', actorId:'a1', actorType:'institution', companyId:'c1', ticker:'005930', market:'KR', signalType:'public_mention', direction:'positive_strategic_view', confidence:.8 },
  { id:'late', sourceType:'news', sourceUrl:'https://example.test/late', observedAt:'2026-09-28T12:00:00Z', actorId:'a2', actorType:'media', companyId:'c1', ticker:'005930', market:'KR', signalType:'public_mention', direction:'neutral_mention', confidence:.5 },
];

test('evidence agent rejects observations newer than D-2 cutoff', () => {
  const r=runEvidenceAgent(evidence,'2026-09-29T00:00:00Z');
  assert.equal(r.accepted.length,2);
  assert.equal(r.rejected.some(x=>x.id==='late'),true);
});

test('pipeline produces approved KR candidate with traceable evidence', () => {
  const out=runKStockV2Pipeline({
    analysisDate:'2026-09-29T00:00:00Z',
    evidence,
    companies:[{
      ticker:'005930', market:'KR', companyName:'fixture',
      actorProfile:{timeHorizon:'long',style:'value'},
      actorSignals:[{ticker:'005930',actorType:'institution',score:85},{ticker:'005930',actorType:'insider',score:75}],
      fundamentals:{revenueGrowth:80,cashFlow:85,roe:75,balanceSheet:90,moat:80},
      valuationScore:70,marketFlowScore:70,sentimentScore:60,dataFreshness:90,
      risk:{financial:20,regulatory:10,governance:10,valuation:25,dataStaleness:10},
    }]
  }, {KSTOCK_LIVE_TRADING_ENABLED:'false',KSTOCK_BROKER_ENABLED:'false'});
  assert.equal(out.KR.length,1);
  assert.equal(out.KR[0].ticker,'005930');
  assert.equal(out.GLOBAL.length,0);
});

test('pipeline refuses to run when live trading is enabled', () => {
  assert.throws(()=>runKStockV2Pipeline({companies:[],evidence:[]},{KSTOCK_LIVE_TRADING_ENABLED:'true',KSTOCK_BROKER_ENABLED:'false'}),/live trading/);
});
