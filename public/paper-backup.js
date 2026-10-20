/* Local user ledger only. Quotes, credentials and verification never enter backups. */
(()=>{
  'use strict';
  const MAX_TEXT=262144;
  const invalid=()=>{throw Error('PAPER_BACKUP_INVALID');};
  const object=(x,keys)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(x,k)))invalid();};
  const day=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
  const amount=(x,positive=false)=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=Number.MAX_SAFE_INTEGER&&(positive?x>0:x>=0);
  const array=(x,n)=>{if(!Array.isArray(x)||x.length>n)invalid();};
  function validate(data){
    object(data,['kind','version','positions','cashFlows','sales','dividends','initialCash','fromDate','toDate']);
    if(data.kind!=='KSTOCK_USER_PAPER_LEDGER'||data.version!==1||!(data.initialCash===null||amount(data.initialCash,true))||![data.fromDate,data.toDate].every(d=>d===null||day(d))||data.fromDate&&data.toDate&&data.fromDate>=data.toDate)invalid();
    array(data.positions,50);array(data.cashFlows,500);array(data.sales,450);array(data.dividends,500);
    const holdings=new Map(),totals=new Map();
    for(const p of data.positions){
      object(p,['market','ticker','currency','buy','quantity','fee','tax']);
      if(typeof p.ticker!=='string'||!(p.market==='KR'&&p.currency==='KRW'&&/^\d{6}$/.test(p.ticker)||p.market==='GLOBAL'&&p.currency==='USD'&&/^[A-Z][A-Z0-9.-]{0,19}$/.test(p.ticker))||![p.buy,p.quantity].every(x=>amount(x,true))||![p.fee,p.tax].every(x=>amount(x))||!amount(p.buy*p.quantity,true))invalid();
      const cost=(totals.get(p.currency)||0)+p.buy*p.quantity+p.fee+p.tax;if(!amount(cost,true))invalid();totals.set(p.currency,cost);
      if(p.market==='KR'){const count=(holdings.get(p.ticker)||0)+p.quantity;if(!amount(count,true))invalid();holdings.set(p.ticker,count);}
    }
    const sold=new Map();
    for(const t of data.sales){object(t,['ticker','date','quantity','price','fee','tax']);if(!holdings.has(t.ticker)||!day(t.date)||![t.quantity,t.price].every(x=>amount(x,true))||![t.fee,t.tax].every(x=>amount(x))||!amount(t.quantity*t.price,true))invalid();const count=(sold.get(t.ticker)||0)+t.quantity;if(!amount(count,true)||count>holdings.get(t.ticker))invalid();sold.set(t.ticker,count);}
    for(const f of data.cashFlows){object(f,['date','timing','amount']);if(!day(f.date)||f.timing!=='BEFORE_OPEN'||typeof f.amount!=='number'||!Number.isFinite(f.amount)||Math.abs(f.amount)>Number.MAX_SAFE_INTEGER||f.amount===0)invalid();}
    for(const d of data.dividends){object(d,['ticker','date','amount']);if(!holdings.has(d.ticker)||!day(d.date)||!amount(d.amount,true))invalid();}
    // Clone only after validation. Unknown fields (including prototype and credential keys) are rejected.
    return JSON.parse(JSON.stringify(data));
  }
  function parse(text){if(typeof text!=='string'||text.length>MAX_TEXT)invalid();try{return validate(JSON.parse(text));}catch{invalid();}}
  function serialize(ledger){
    const fields=(row,keys)=>Object.fromEntries(keys.map(k=>[k,row[k]]));
    const data={kind:'KSTOCK_USER_PAPER_LEDGER',version:1,positions:ledger.positions.map(p=>fields(p,['market','ticker','currency','buy','quantity','fee','tax'])),cashFlows:ledger.cashFlows.map(f=>fields(f,['date','timing','amount'])),sales:ledger.sales.map(t=>fields(t,['ticker','date','quantity','price','fee','tax'])),dividends:ledger.dividends.map(d=>fields(d,['ticker','date','amount'])),initialCash:ledger.initialCash,fromDate:ledger.fromDate,toDate:ledger.toDate};
    const text=JSON.stringify(validate(data),null,2);if(text.length>MAX_TEXT)invalid();return text;
  }
  globalThis.KStockPaperBackup=Object.freeze({parse,serialize,MAX_TEXT});
})();
