// Review readiness is separate from public distribution and financial feature approval.
export const MOBILE_INTEGRATION_CHECKS=['fourKinds','backupExport','calculation','csv','oversellError','draftSwitchGuard','dirtyNoRequest','dirtyBackupGuard','dirtyCsvGuard','editSaved','recalculated','backupComparison','backupCancel','backupRestored','restoredCalculation','kindFilter','dateFilter','boundedPage','nextPage','dateSort','allPagesSummary','deleted','undo','noOverflow','cleared'];
export function verifiedMobileReceipt(receipt,{physicalDevice,now=Date.now()}={}){
 const result=receipt?.result,age=now-Date.parse(result?.checkedAt);
 return receipt?.physicalDevice===physicalDevice&&result?.status==='PASS'&&Number.isFinite(age)&&age>=0&&age<86400000&&MOBILE_INTEGRATION_CHECKS.every(key=>result.checks?.[key]===true);
}
export function assessMobileRelease({receipts,regressionPassed,androidBuilt,iosBuilt,backend,production={},now=Date.now()}){
 const mobile={galaxy:verifiedMobileReceipt(receipts?.galaxy,{physicalDevice:true,now}),iphone:verifiedMobileReceipt(receipts?.iphone,{physicalDevice:true,now}),simulator:verifiedMobileReceipt(receipts?.simulator,{physicalDevice:false,now})};
 const reviewReady=Object.values(mobile).every(Boolean)&&regressionPassed===true&&androidBuilt===true&&iosBuilt===true;
 const blockers=[];
 if(!reviewReady)blockers.push('BUILD_OR_CURRENT_INTEGRATION_EVIDENCE_REQUIRED');
 if(production.androidSignedUpdateVerified!==true)blockers.push('ANDROID_EXISTING_SIGNING_AND_UPDATE_PATH_REQUIRED');
 if(production.iosProductionTargetVerified!==true)blockers.push('IOS_HTTPS_AUTH_AND_DISTRIBUTION_TARGET_REQUIRED');
 if(production.privacyFinalVerified!==true)blockers.push('FINAL_PRIVACY_DATA_FLOW_AND_STORE_DECLARATIONS_REQUIRED');
 const rows=backend?.candidates||[],financialReady=rows.length>0&&backend?.newOfficialDocuments>0&&rows.every(c=>c.valuation?.status==='VERIFIED'&&c.shareDateReview?.bridgeEligible===true);
 return {schemaVersion:1,status:reviewReady?'REVIEW_BUNDLE_READY':'REVIEW_BUNDLE_INCOMPLETE',mobile,reviewReady,productionDistribution:blockers.length?'BLOCKED':'READY',blockers,financialFeatureActivation:financialReady?'REQUIRES_SEPARATE_APPROVAL':'BLOCKED',recommendationStatus:'HOLD',liveTradingEnabled:false,scope:'SYNTHETIC_MOBILE_QA_AND_SAVED_BACKEND_REVIEW'};
}
