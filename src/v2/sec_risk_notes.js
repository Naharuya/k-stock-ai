import {validDay} from './accounting_periods.js';
import {XMLParser} from 'fast-xml-parser';import {createHash} from 'node:crypto';
const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false});
const list=x=>x==null?[]:Array.isArray(x)?x:[x];
const text=x=>typeof x==='object'?x?.['#text']:x;
export function extractSecRiskNotes(raw,company){
 const parsed=parser.parse(raw),root=parsed['xbrli:xbrl']||parsed.xbrl;if(!root)return [];
 const contexts=new Map(list(root['xbrli:context']||root.context).map(c=>[c['@_id'],c]));
 const get=(x,k)=>x?.['xbrli:'+k]||x?.[k];
 return [['DebtDisclosureTextBlock','DEBT'],['StockholdersEquityNoteDisclosureTextBlock','EQUITY'],['CommitmentsAndContingenciesDisclosureTextBlock','CONTINGENCIES']].flatMap(([tag,topic])=>list(root['us-gaap:'+tag]).flatMap(f=>{const c=contexts.get(f['@_contextRef']),entity=get(c,'entity'),period=get(c,'period'),body=String(text(f)||'');if(!validDay(text(get(period,'endDate'))||text(get(period,'instant')))||Number(text(get(entity,'identifier')))!==Number(company.cik)||get(entity,'segment')||get(c,'scenario')||!body.trim()||f['@_xsi:nil']==='true')return [];return [{tag,topic,contextId:f['@_contextRef'],periodStart:text(get(period,'startDate'))||null,periodEnd:text(get(period,'endDate'))||text(get(period,'instant'))||null,textHash:createHash('sha256').update(body).digest('hex'),textLength:body.length,reviewStatus:'OBSERVED_NOT_REVIEWED'}];}));
}
