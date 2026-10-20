/** Pure historical evidence review. No requests, orders or inferred public timestamps. */
import {createHash} from 'node:crypto';
const day=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
const hash=x=>createHash('sha256').update(x).digest('hex');
export function easternInstant(date,clock){
 if(!day(date)||!/^\d{2}:\d{2}:\d{2}$/.test(clock||''))throw Error('EASTERN_TIME_INVALID');
 const format=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const options=['-04:00','-05:00'].map(offset=>`${date}T${clock}${offset}`).filter(t=>Number.isFinite(Date.parse(t))&&format.format(new Date(t)).replace(' ','T')===`${date}T${clock}`);
 if(options.length!==1)throw Error('EASTERN_TIME_AMBIGUOUS_OR_INVALID');return options[0];
}
export function normalizeKisUsHistory(input){
 const r=input?.response,request=input?.request;
 if(!/^https:\/\/github\.com\/koreainvestment\/open-trading-api(?:\/|$)/.test(input?.sourceUrl||'')||r?.rt_cd!=='0'||r.output1?.rsym!=='DNASAAPL'||!Array.isArray(r.output2)||!r.output2.length||r.output2.length>100||request?.EXCD!=='NAS'||request.SYMB!=='AAPL'||request.GUBN!=='0'||request.MODP!=='0'||!/^2025\d{4}$/.test(request.BYMD||'')||input.sourceHash!==hash(JSON.stringify(r)))throw Error('US_HISTORY_IDENTITY_OR_INTEGRITY_INVALID');
 const rows=r.output2.map(x=>{
  const tradingDate=`${x.xymd?.slice(0,4)}-${x.xymd?.slice(4,6)}-${x.xymd?.slice(6,8)}`;
  if(!/^\d{8}$/.test(x.xymd||'')||!day(tradingDate)||x.xymd>request.BYMD)throw Error('US_HISTORY_DATE_INVALID');
  const values=['open','high','low','clos'].map(k=>typeof x[k]==='string'&&/^\d+(?:\.\d+)?$/.test(x[k])?Number(x[k]):NaN);
  const [open,high,low,close]=values;
  if(values.some(n=>!Number.isFinite(n)||n<=0)||low>Math.min(open,close)||high<Math.max(open,close)||low>high)throw Error('US_HISTORY_OHLC_INVALID');
  return {ticker:'AAPL',exchange:'NASDAQ',tradingDate,open,high,low,close,adjustedClose:null,currency:'USD',priceType:'RAW_CLOSE',source:'KIS overseas dailyprice'};
 }).sort((a,b)=>a.tradingDate.localeCompare(b.tradingDate));
 if(new Set(rows.map(x=>x.tradingDate)).size!==rows.length)throw Error('US_HISTORY_DUPLICATE_DATE');
 return {rows,coverage:{from:rows[0].tradingDate,through:rows.at(-1).tradingDate,count:rows.length},sourceUrl:input.sourceUrl,sourceHash:input.sourceHash,checkedAt:input.checkedAt};
}
export function normalizeSp500History(input){
 if(input?.httpStatus!==200||input.priceType!=='PRICE_INDEX'||typeof input.csv!=='string'||input.sourceHash!==hash(input.csv)||!/^https:\/\/fred\.stlouisfed\.org\/graph\/fredgraph\.csv\?/.test(input.sourceUrl||''))throw Error('BENCHMARK_SOURCE_INVALID');
 const [header,...lines]=input.csv.trim().split(/\r?\n/);if(!['observation_date,SP500','DATE,SP500'].includes(header))throw Error('BENCHMARK_HEADER_INVALID');
 const rows=[],missing=[];const seen=new Set();
 for(const line of lines){const [date,text,...extra]=line.split(',');if(!day(date)||seen.has(date)||extra.length)throw Error('BENCHMARK_DATE_INVALID');seen.add(date);if(text===''||text==='.')missing.push(date);else{if(!/^\d+(?:\.\d+)?$/.test(text)||!Number.isFinite(Number(text))||Number(text)<=0)throw Error('BENCHMARK_PRICE_INVALID');rows.push({date,close:Number(text)});}}
 if(!rows.length)throw Error('BENCHMARK_EMPTY');rows.sort((a,b)=>a.date.localeCompare(b.date));return{rows,missing,coverage:{from:rows[0].date,through:rows.at(-1).date,count:rows.length},sourceUrl:input.sourceUrl,sourceHash:input.sourceHash,returnType:'PRICE_INDEX',dividendsIncluded:false};
}
export function sessions2025(from,through){
 if(!day(from)||!day(through)||from<'2025-02-01'||through>'2025-09-15'||from>through)throw Error('CALENDAR_SCOPE_INVALID');
 const holidays=new Set(['2025-02-17','2025-04-18','2025-05-26','2025-06-19','2025-07-04','2025-09-01']),sessions=[];
 for(let n=Date.parse(from);n<=Date.parse(through);n+=86400000){const d=new Date(n),date=d.toISOString().slice(0,10);if(![0,6].includes(d.getUTCDay())&&!holidays.has(date))sessions.push({date,openAt:easternInstant(date,'09:30:00'),closeAt:easternInstant(date,date==='2025-07-03'?'13:00:00':'16:00:00')});}
 return sessions;
}
export function reviewSecPublication(filing,header){
 const bad=reason=>({accessionNumber:filing.accessionNumber,acceptedAt:filing.acceptedAt,publicAvailableAt:null,transactionDate:null,tradeableFrom:null,verificationStatus:'INSUFFICIENT_DATA',reasons:[reason]});
 if(header?.status!==200||header.accessionNumber!==filing.accessionNumber||!/^\d{14}$/.test(header.acceptedRaw||'')||!/^https:\/\/www\.sec\.gov\/Archives\//.test(header.sourceUrl||'')||!/^[a-f\d]{64}$/.test(header.sourceHash||''))return bad('SEC_HEADER_UNVERIFIED');
 const raw=header.acceptedRaw,date=`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;let acceptedAt;try{acceptedAt=easternInstant(date,`${raw.slice(8,10)}:${raw.slice(10,12)}:${raw.slice(12,14)}`);}catch{return bad('SEC_TIMEZONE_UNVERIFIED');}
 if(Date.parse(acceptedAt)!==Date.parse(filing.acceptedAt)||header.filingDate?.replaceAll('-','')!==filing.filingDate.replaceAll('-',''))return bad('SEC_HEADER_INDEX_CONFLICT');
 const open=easternInstant(date,'09:30:00'),close=easternInstant(date,'16:00:00');
 const timing=Date.parse(acceptedAt)>Date.parse(close)?'AFTER_CLOSE':Date.parse(acceptedAt)<Date.parse(open)?'BEFORE_OPEN':Date.parse(acceptedAt)===Date.parse(close)?'AT_CLOSE':'INTRADAY';
 return {...bad('PUBLICATION_TIME_UNVERIFIED'),acceptedAt,acceptanceStatus:'VERIFIED',reportingPeriodEnd:filing.reportingPeriod,filingDate:filing.filingDate,cik:'0001067983',institution:'Berkshire Hathaway',cusip:filing.cusip,shareClass:filing.shareClass,quantity:filing.quantity,sourceUrl:header.sourceUrl,sourceHash:header.sourceHash,timeZone:'America/New_York',acceptedSessionTiming:timing,firstPublicAvailabilityVerified:false,publicationReason:'SEC confirms an unguaranteed lag between acceptance and website availability; no historical first-public timestamp was obtained.'};
}
export function reviewEventWindows({filing,publication,stock,benchmark,calendarVerified=false,asOf}){
 const sessions=sessions2025('2025-02-01','2025-09-15'),cutoff=Date.parse(asOf);
 // Dates below are acceptance-based candidate observation windows, never executable/publication baselines.
 const index=sessions.findIndex(s=>Date.parse(s.closeAt)>Date.parse(filing.acceptedAt));const start=sessions[index];
 const prices=new Map(),conflicts=new Set();for(const row of stock.flatMap(x=>x.rows)){const previous=prices.get(row.tradingDate);if(previous && ['open','high','low','close'].some(k=>previous[k]!==row[k]))conflicts.add(row.tradingDate);else prices.set(row.tradingDate,row);}const indices=new Map(benchmark.rows.map(x=>[x.date,x.close]));
 return [1,5,20].map(horizon=>{const end=sessions[index+horizon],dates=index>=0?sessions.slice(index,index+horizon+1).map(x=>x.date):[];
 const common=Boolean(start&&end&&calendarVerified&&Date.parse(end.closeAt)<=cutoff&&dates.every(d=>prices.has(d)&&indices.has(d)&&!conflicts.has(d)));
 return{eventId:`official13f:${filing.accessionNumber}:AAPL`,accessionNumber:filing.accessionNumber,horizon,acceptedAt:publication.acceptedAt,publicAvailableAt:null,tradeableFrom:null,startDate:null,endDate:null,candidateStartDate:start?.date||null,candidateEndDate:end?.date||null,windowBasis:'ACCEPTANCE_BASED_CANDIDATE_NOT_PUBLICATION',observationsRequired:horizon+1,observationsAvailable:dates.filter(d=>prices.has(d)&&indices.has(d)&&!conflicts.has(d)).length,priceCoverageStatus:common?'VERIFIED':'INSUFFICIENT_DATA',candidateStartPrice:common?prices.get(start.date):null,priceType:'RAW_CLOSE',returnType:'PRICE_RETURN',dividendsIncluded:false,securityReturn:null,benchmarkReturn:null,excessReturn:null,verificationStatus:'MARKET_REACTION_BLOCKED',reasons:['PUBLICATION_TIME_UNVERIFIED','TRADEABLE_FROM_UNVERIFIED','CORPORATE_ACTION_COVERAGE_INCOMPLETE'],source:{security:stock.map(x=>({sourceUrl:x.sourceUrl,sourceHash:x.sourceHash})),benchmark:{sourceUrl:benchmark.sourceUrl,sourceHash:benchmark.sourceHash}},sampleSize:0};});
}
export function buildSavedMarketReview({filings=[],headers=[],histories=[],benchmarkInput,calendar,dailyIndexes=[],actions,asOf}={}){
 const visible=x=>Number.isFinite(Date.parse(x?.checkedAt))&&Date.parse(x.checkedAt)<=Date.parse(asOf);
 actions=visible(actions)?actions:null;
 const warnings=[],stock=[];
 for(const h of histories.filter(visible)){try{stock.push(normalizeKisUsHistory(h));}catch{warnings.push('APPLE_PRICE_SOURCE_INVALID');}}
 let benchmark;try{if(visible(benchmarkInput))benchmark=normalizeSp500History(benchmarkInput);}catch{warnings.push('BENCHMARK_SOURCE_INVALID');}
 const calendarVerified=visible(calendar)&&calendar?.verified===true&&calendar.httpStatus===200&&calendar.sourceUrl==='https://www.nyse.com/publicdocs/ICE_NYSE_2025_Yearly_Trading_Calendar.pdf'&&/^[a-f\d]{64}$/.test(calendar.sourceHash||'');
 const raw=filings.filter(x=>x.form==='13F-HR'&&x.present&&x.filingDate>='2025-02-01'&&x.filingDate<='2025-09-15');
 const publications=raw.map(f=>reviewSecPublication(f,headers.find(h=>h.accessionNumber===f.accessionNumber)));
 const events=benchmark&&stock.length?raw.flatMap((f,i)=>reviewEventWindows({filing:f,publication:publications[i],stock,benchmark,calendarVerified,asOf})):[];
 const conservativeEvents=benchmark&&stock.length?raw.flatMap(f=>conservativeReturns({filing:f,index:dailyIndexes.find(x=>x.accessionNumber===f.accessionNumber),stock,benchmark,calendarVerified,actions,asOf})):[];
 return{status:'MARKET_REACTION_BLOCKED',publications,events,verifiedSamples:0,conservativeEvents,conservativeSamples:Object.fromEntries([1,5,20].map(h=>[h,conservativeEvents.filter(e=>e.horizon===h&&e.sampleSize===1).length])),corporateActions:actions?{status:actions.status,events:actions.events,splitReview:actions.splitReview,sources:actions.sources,limitations:actions.limitations}:null,applePrice:{status:stock.length?'VERIFIED':'INSUFFICIENT_DATA',ticker:'AAPL',exchange:'NASDAQ',currency:'USD',priceType:'RAW_CLOSE',adjustedClose:null,adjustmentPolicy:'MODP=0_UNADJUSTED',coverage:stock.map(x=>x.coverage),count:new Set(stock.flatMap(x=>x.rows).map(x=>x.tradingDate)).size,sourceUrl:stock[0]?.sourceUrl||null,sourceHashes:stock.map(x=>x.sourceHash),limitations:['TWO_DISJOINT_OBSERVED_WINDOWS','NO_INTERPOLATION','CORPORATE_ACTION_COVERAGE_INCOMPLETE']},benchmark:{status:benchmark?'VERIFIED':'INSUFFICIENT_DATA',benchmarkId:'SP500:PRICE_INDEX',source:'FRED / S&P Dow Jones Indices',sourceUrl:benchmark?.sourceUrl||null,coverage:benchmark?.coverage||null,missingCount:benchmark?.missing.length??null,priceType:'PRICE_INDEX',dividendsIncluded:false,rawSeriesExposed:false},calendar:{status:calendarVerified?'VERIFIED':'INSUFFICIENT_DATA',timeZone:'America/New_York',from:'2025-02-01',through:'2025-09-15',sourceUrl:calendar?.sourceUrl||null},limitations:['PUBLICATION_TIME_UNVERIFIED','TRADEABLE_FROM_UNVERIFIED','CORPORATE_ACTION_COVERAGE_INCOMPLETE',...warnings],recommendationStatus:'HOLD'};
}

// Separate close-to-close research: origin index metadata is not a first-public timestamp.
export function conservativePublication(filing,index,asOf){
 const blocked=reason=>({status:'BLOCKED',reason,publicAvailableAt:null,conservativeAvailableBy:null,tradeableFrom:null});
 const q=`QTR${Math.ceil(Number(filing.filingDate.slice(5,7))/3)}`,url=`https://www.sec.gov/Archives/edgar/daily-index/2025/${q}/master.${filing.filingDate.replaceAll('-','')}.idx`;
 const expected=`1067983|BERKSHIRE HATHAWAY INC|13F-HR|${filing.filingDate.replaceAll('-','')}|edgar/data/1067983/${filing.accessionNumber}.txt`;
 if(index?.httpStatus!==200||index.sourceUrl!==url||!/^[a-f\d]{64}$/.test(index.sourceHash||'')||index.matchedLines?.length!==1||index.matchedLines[0].trim()!==expected)return blocked('SEC_DAILY_INDEX_UNVERIFIED');
 const at=Date.parse(index.lastModified),accepted=Date.parse(filing.acceptedAt);
 if(!Number.isFinite(at)||at<accepted||at>accepted+86400000||at>Date.parse(asOf))return blocked('INDEX_REVISED_OR_TIME_UNVERIFIED');
 const session=sessions2025('2025-02-01','2025-09-15').find(s=>Date.parse(s.openAt)>at);
 if(!session)return blocked('CONSERVATIVE_SESSION_UNAVAILABLE');
 return{status:'CONSERVATIVE_START',publicAvailableAt:null,conservativeAvailableBy:new Date(at).toISOString(),tradeableFrom:session.openAt,startDate:session.date,basis:'SEC_NIGHTLY_PUBLIC_INDEX_ORIGIN_LAST_MODIFIED',sourceUrl:index.sourceUrl,sourceHash:index.sourceHash,policySourceUrl:'https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data',limitations:['NOT_FIRST_PUBLIC_TIMESTAMP','ORIGIN_METADATA_RESEARCH_BOUND_NOT_HISTORICAL_RECEIPT_LOG','CLOSE_TO_CLOSE_RESEARCH_NOT_EXECUTION']};
}
export function conservativeReturns({filing,index,stock,benchmark,calendarVerified,actions,asOf}){
 const publication=conservativePublication(filing,index,asOf),sessions=sessions2025('2025-02-01','2025-09-15'),i=sessions.findIndex(s=>s.date===publication.startDate);
 const prices=new Map(),conflicts=new Set();for(const row of stock.flatMap(x=>x.rows)){const p=prices.get(row.tradingDate);if(p&&['open','high','low','close'].some(k=>p[k]!==row[k]))conflicts.add(row.tradingDate);prices.set(row.tradingDate,row);}
 const indices=new Map(benchmark.rows.map(x=>[x.date,x.close]));
 const validActions=actions?.status==='VERIFIED_PRICE_RETURN_SCOPE'&&actions.ticker==='AAPL'&&actions.currency==='USD'&&actions.priceType==='RAW_CLOSE'&&actions.adjustmentApplied===false&&actions.dividendsIncluded===false&&Array.isArray(actions.events)&&actions.events.every(e=>e.type==='CASH_DIVIDEND'&&day(e.exDate)&&Number.isFinite(e.amount)&&e.amount>0&&e.currency==='USD')&&actions.splitReview?.status==='NO_SPLIT_IN_SCOPE'&&actions.splitReview.sourceUrl==='https://investor.apple.com/faq/default.aspx'&&actions.sources?.some(s=>s.sourceUrl==='https://api.nasdaq.com/api/quote/AAPL/dividends?assetclass=stocks'&&s.httpStatus===200&&/^[a-f\d]{64}$/.test(s.sourceHash||''))&&Date.parse(actions.checkedAt)<=Date.parse(asOf);
 return[1,5,20].map(horizon=>{const start=sessions[i],end=sessions[i+horizon],dates=i>=0?sessions.slice(i,i+horizon+1).map(s=>s.date):[],reasons=[];
 if(publication.status!=='CONSERVATIVE_START')reasons.push(publication.reason);if(!calendarVerified)reasons.push('CALENDAR_UNVERIFIED');if(!validActions||!start||!end||actions.scopeFrom>start.date||actions.scopeThrough<end.date)reasons.push('CORPORATE_ACTION_COVERAGE_INCOMPLETE');
 if(!start||!end||dates.length!==horizon+1||dates.some(d=>!prices.has(d)||!indices.has(d)||conflicts.has(d)||!Number.isFinite(prices.get(d)?.close)||prices.get(d).close<=0||!Number.isFinite(indices.get(d))||indices.get(d)<=0))reasons.push('COMMON_PRICE_MISSING_OR_CONFLICT');
 if(end&&Date.parse(end.closeAt)>Date.parse(asOf))reasons.push('PENDING');const verified=reasons.length===0;
 const securityReturn=verified?(prices.get(end.date).close/prices.get(start.date).close-1)*100:null,benchmarkReturn=verified?(indices.get(end.date)/indices.get(start.date)-1)*100:null;
 return{accessionNumber:filing.accessionNumber,horizon,verificationStatus:verified?'VERIFIED_CONSERVATIVE':'BLOCKED',analysisMode:'CONSERVATIVE_START',publicAvailableAt:null,conservativeAvailableBy:publication.conservativeAvailableBy,tradeableFrom:publication.tradeableFrom,startDate:verified?start.date:null,endDate:verified?end.date:null,startPrice:verified?prices.get(start.date).close:null,endPrice:verified?prices.get(end.date).close:null,currency:'USD',priceType:'RAW_CLOSE',returnType:'PRICE_RETURN',dividendsIncluded:false,baselinePolicy:'FIRST_CLOSE_AFTER_CONSERVATIVE_BOUND',securityReturn,benchmarkReturn,excessReturn:verified?securityReturn-benchmarkReturn:null,returnUnit:'PERCENT',sampleSize:verified?1:0,reasons,observationsRequired:horizon+1,observationsAvailable:dates.filter(d=>prices.has(d)&&indices.has(d)&&!conflicts.has(d)).length,sourceUrl:publication.sourceUrl,limitations:[...(publication.limitations||[]),'NO_PREDICTIVE_VALIDITY_CLAIM','TOTAL_RETURN_NOT_CALCULATED']};});
}
