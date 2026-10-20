// Descriptive private research only. A price index is not a security/benchmark pair.
export function observeIndexAfterConservativeDay({series,publicationDate,asOf,horizons=[1,5,20]}={}){
 const hold=reason=>({status:'INSUFFICIENT_DATA',periods:[],limitations:[reason],verifiedSignalSamples:0});
 if(series?.series!=='SP500'||series.basis!=='PRICE_INDEX'||series.dividendsIncluded!==false||!/^[a-f0-9]{64}$/.test(series.sourceHash||'')||!series.sourceUrl?.startsWith('https://fred.stlouisfed.org/')||series.exchangeTimeZone!=='America/New_York')return hold('INDEX_SOURCE_UNVERIFIED');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate||'')||!Number.isFinite(Date.parse(asOf))||publicationDate>asOf.slice(0,10))return hold('CUTOFF_UNVERIFIED');
 const rows=series.rows||[],dates=rows.map(x=>x.sessionDate);
 if(new Set(dates).size!==dates.length||dates.some((x,i)=>i&&x<=dates[i-1]))return hold('INDEX_DATES_DUPLICATED_OR_UNSORTED');
 // The only null observation in this bounded series is the officially verified NYSE holiday.
 if(rows.some(x=>x.close===null&&x.sessionDate!=='2025-09-01'))return hold('INDEX_MISSING_OBSERVATION');
 const observations=rows.filter(x=>x.close!==null);
 if(observations.some(x=>!Number.isFinite(x.close)||x.close<=0))return hold('INDEX_PRICE_INVALID');
 const start=observations.findIndex(x=>x.sessionDate>publicationDate);
 if(start<0)return hold('INDEX_BASELINE_MISSING');
 const baseline=observations[start];
 const periods=horizons.map(horizon=>{
  const end=observations[start+horizon];
  if(!end||Date.parse(`${end.sessionDate}T20:00:00Z`)>Date.parse(asOf))return {horizon,status:'INSUFFICIENT_DATA',observedIndexReturn:null};
  return {horizon,status:'DESCRIPTIVE_ONLY',startDate:baseline.sessionDate,endDate:end.sessionDate,observedIndexReturn:end.close/baseline.close-1,observedReturn:null,benchmarkReturn:null,excessReturn:null};
 });
 return {status:'DESCRIPTIVE_ONLY',publicationDate,baselineDate:baseline.sessionDate,baselinePolicy:'FIRST_OBSERVED_CLOSE_AFTER_CONSERVATIVE_PUBLICATION_DAY',index:'S&P 500',exchangeTimeZone:series.exchangeTimeZone,returnType:'PRICE_INDEX_RETURN',dividendsIncluded:false,annualized:false,rawSeriesPublished:false,sourceUrl:'https://fred.stlouisfed.org/series/SP500',sourceHash:series.sourceHash,holidaySourceUrl:'https://ir.theice.com/press/news-details/2024/NYSE-Group-Announces-2025-2026-and-2027-Holiday-and-Early-Closings-Calendar/default.aspx',periods,observedEvents:1,verifiedSignalSamples:0,causalClaim:false,limitations:['실제 최초 공개 시각이 미확인된 보수적 일별 지수 관측입니다.','개별 종목과 비교 벤치마크가 없어 초과수익률을 계산하지 않습니다.','사건 1건으로 예측력·통계적 유효성·인과관계를 주장하지 않습니다.','기업행동 개별 종목 검증과 별개인 가격지수 변화이며 배당은 제외합니다.'],recommendationStatus:'HOLD'};
}
