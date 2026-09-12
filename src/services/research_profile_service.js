function finite(v){return Number.isFinite(Number(v));}
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,Math.round(Number(v)||0)));}
function uniq(xs){return [...new Set((xs||[]).filter(Boolean))];}

function indicatorView(code, value, tone, text){
  return { code, value: finite(value)?Number(value):null, tone, text };
}

export function buildResearchProfile({ indicators, committee, technical, flow, market, news, dart }) {
  const v=indicators?.values||{};
  const fundamentals=dart?.financials?.metrics||{};
  const indicatorInterpretations=[];

  indicatorInterpretations.push(indicatorView('PER',v.per,
    !finite(v.per)?'neutral':v.per>=30?'caution':v.per<=12?'positive':'neutral',
    !finite(v.per)?'데이터 부족':v.per>=30?'이익 대비 가격 부담이 높은 구간':v.per<=12?'절대 수준은 낮은 편':'절대 수준만으로는 중립'));
  indicatorInterpretations.push(indicatorView('PBR',v.pbr,
    !finite(v.pbr)?'neutral':v.pbr>=3?'caution':v.pbr<=1?'positive':'neutral',
    !finite(v.pbr)?'데이터 부족':v.pbr>=3?'순자산 대비 프리미엄이 높은 편':v.pbr<=1?'순자산 대비 낮은 편':'중간 구간'));
  indicatorInterpretations.push(indicatorView('PSR',v.psr,
    !finite(v.psr)?'neutral':v.psr>=4?'caution':v.psr<=1?'positive':'neutral',
    !finite(v.psr)?'데이터 부족':v.psr>=4?'매출 대비 가격 부담 점검 필요':v.psr<=1?'매출 대비 낮은 편':'중간 구간'));
  indicatorInterpretations.push(indicatorView('ROE',v.roePct,
    !finite(v.roePct)?'neutral':v.roePct>=15?'positive':v.roePct<5?'caution':'neutral',
    !finite(v.roePct)?'데이터 부족':v.roePct>=15?'자기자본 수익성이 양호':v.roePct<5?'자기자본 수익성이 낮은 편':'보통 수준'));
  indicatorInterpretations.push(indicatorView('EPS',v.eps,'neutral',finite(v.eps)?'주당 이익 규모 확인용':'데이터 부족'));
  indicatorInterpretations.push(indicatorView('ROA',v.roaPct,
    !finite(v.roaPct)?'neutral':v.roaPct>=8?'positive':v.roaPct<2?'caution':'neutral',
    !finite(v.roaPct)?'데이터 부족':v.roaPct>=8?'자산 활용 효율이 양호':v.roaPct<2?'자산 활용 효율이 낮은 편':'보통 수준'));
  indicatorInterpretations.push(indicatorView('PTBR',v.ptbr,
    !finite(v.ptbr)?'neutral':v.ptbr>=4?'caution':v.ptbr<=1?'positive':'neutral',
    !finite(v.ptbr)?'데이터 부족':v.ptbr>=4?'유형자본 대비 프리미엄이 높은 편':v.ptbr<=1?'유형자본 대비 낮은 편':'중간 구간'));
  indicatorInterpretations.push(indicatorView('RSI',v.rsi14,
    !finite(v.rsi14)?'neutral':v.rsi14>=70?'caution':v.rsi14<=30?'positive':'neutral',
    !finite(v.rsi14)?'데이터 부족':v.rsi14>=70?'단기 과열 가능성':v.rsi14<=30?'단기 과매도 가능성':'중립 범위'));
  indicatorInterpretations.push(indicatorView('BPS',v.bps,'neutral',finite(v.bps)?'주당 순자산 기준값':'데이터 부족'));
  indicatorInterpretations.push(indicatorView('APS',v.aps,'neutral',finite(v.aps)?'주당 총자산 기준값':'데이터 부족'));
  indicatorInterpretations.push(indicatorView('PEG',v.peg,
    !finite(v.peg)?'neutral':v.peg>2?'caution':v.peg>0&&v.peg<1?'positive':'neutral',
    !finite(v.peg)?'성장률이 0 이하이거나 비교 데이터 부족':v.peg>2?'성장 대비 밸류에이션 부담 가능성':v.peg<1?'성장 대비 가격 부담이 낮은 편':'중간 구간'));

  const positives=uniq([
    ...(committee?.positiveReasons||[]),
    finite(fundamentals?.operatingProfitGrowthPct)&&fundamentals.operatingProfitGrowthPct>15?'영업이익 성장률이 양호':null,
    finite(flow?.combinedSmartMoneyQty5d)&&flow.combinedSmartMoneyQty5d>0?'외국인+기관 최근 5일 합산 순매수':null,
    market?.regime==='RISK_ON'?'시장 환경이 우호적':null,
    news?.sentiment==='POSITIVE'?'최근 뉴스 흐름이 긍정적':null
  ]).slice(0,8);
  const negatives=uniq([
    ...(committee?.negativeReasons||[]),
    finite(v.per)&&v.per>=30?'PER 부담':null,
    finite(flow?.combinedSmartMoneyQty20d)&&flow.combinedSmartMoneyQty20d<0?'외국인+기관 20일 합산 순매도':null,
    market?.regime==='RISK_OFF'?'시장 환경이 위험회피':null,
    news?.sentiment==='NEGATIVE'?'최근 뉴스 흐름이 부정적':null,
    technical?.trend==='DOWNTREND'?'중기 기술 추세 약세':null
  ]).slice(0,8);

  const bullStrength=clamp((committee?.baseScore??50)+(positives.length*2)-(negatives.length));
  const bearStrength=clamp(committee?.bear?.bearScore??50);
  const scenarios=[
    {
      key:'upside', label:'상방 시나리오', tone:'positive',
      conditions:uniq([
        '실적 추세가 유지되거나 상향될 것',
        '외국인·기관 수급이 추가 악화되지 않을 것',
        '시장 환경이 중립 이상을 유지할 것',
        ...(finite(v.per)&&v.per>=30?['높은 밸류에이션을 실적 성장으로 정당화할 것']:[])
      ])
    },
    {
      key:'base', label:'기준 시나리오', tone:'neutral',
      conditions:uniq([
        '현재 펀더멘털과 시장 혼조가 이어질 것',
        '수급이 단기 개선과 중기 혼조 사이에서 유지될 것',
        '중대한 공시·고위험 뉴스가 발생하지 않을 것'
      ])
    },
    {
      key:'downside', label:'하방 시나리오', tone:'caution',
      conditions:uniq([
        '핵심 실적 추세가 둔화될 것',
        '외국인·기관 수급이 뚜렷하게 악화될 것',
        '시장 regime이 RISK_OFF로 전환될 것',
        '회계·법률·거래정지 등 중대한 위험 이벤트가 발생할 것'
      ])
    }
  ];

  const signalMatrix=Object.entries(committee?.components||{}).map(([key,c])=>{
    const ratio=finite(c.raw)&&finite(c.max)&&Number(c.max)>0?Number(c.raw)/Number(c.max):null;
    return { key, raw:c.raw??null, max:c.max??null, direction:ratio===null?'UNKNOWN':ratio>=0.7?'POSITIVE':ratio<=0.4?'CAUTION':'NEUTRAL' };
  });

  return {
    status:'READY',
    bull:{ strength:bullStrength, level:bullStrength>=75?'STRONG':bullStrength>=55?'MODERATE':'LOW', arguments:positives, summary:positives.length?'긍정 요인은 존재하지만 Bear Case와 함께 조건 확인이 필요합니다.':'강한 상방 논리는 제한적입니다.' },
    bear:{ strength:bearStrength, level:committee?.bear?.level||'UNKNOWN', arguments:uniq([...(committee?.bear?.majorArguments||[]),...(committee?.bear?.weakArguments||[])]).slice(0,8), summary:committee?.bear?.summary||'반대 논리 데이터 없음' },
    indicatorInterpretations,
    signalMatrix,
    scenarios,
    caveat:'시나리오는 조건 기반 리서치 프레임이며 상승확률·목표가·매수/매도 신호를 의미하지 않습니다.'
  };
}
