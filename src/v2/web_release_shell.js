// Availability of an API is independent from availability of the shipped Web app.
export function inspectWebReleaseShell(assets){
 const html=assets['/'],js=assets['/app.js'],backup=assets['/paper-backup.js'],css=assets['/styles.css'];
 const checks={html:html?.status===200&&/text\/html/i.test(html.contentType||'')&&/id=["']paper-portfolio["']/.test(html.body||'')&&/src=["']\/app\.js["']/.test(html.body||''),javascript:js?.status===200&&/(?:javascript|ecmascript)/i.test(js.contentType||'')&&(js.body||'').includes('function loadPaperPerformance('),backup:backup?.status===200&&/(?:javascript|ecmascript)/i.test(backup.contentType||'')&&(backup.body||'').includes('KStockPaperBackup'),styles:css?.status===200&&/text\/css/i.test(css.contentType||'')&&(css.body||'').includes('paper-')};
 return {status:Object.values(checks).every(Boolean)?'PASS':'BLOCKED_WEB_ASSETS_NOT_DEPLOYED',checks};
}
