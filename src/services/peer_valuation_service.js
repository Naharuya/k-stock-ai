export function comparePeers({code,sector,quote,rows=[]}){
  if(!sector||['미분류','0','000'].includes(String(sector)))return {status:'NOT_AVAILABLE',reason:'SECTOR_MISSING'};
  const peers=rows.filter(r=>r.code!==code&&r.industryLarge===sector&&r.quote);
  const median=key=>{const values=peers.map(p=>p.quote[key]).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>0).sort((a,b)=>a-b);return {sampleSize:values.length,value:values.length<3?null:values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2};};
  const per=median('per'),pbr=median('pbr');
  return {status:per.value!==null||pbr.value!==null?'LIMITED_SAMPLE':'NOT_AVAILABLE',sector,universe:'CURRENT_RUN_QUOTE_VALIDATED_CANDIDATES',peers:peers.map(r=>r.code),per,pbr,
    perRelativePct:per.value&&quote?.per>0?(quote.per/per.value-1)*100:null,pbrRelativePct:pbr.value&&quote?.pbr>0?(quote.pbr/pbr.value-1)*100:null,
    caveat:'Selected candidate sample; not an industry-wide benchmark',targetPrice:null};
}
