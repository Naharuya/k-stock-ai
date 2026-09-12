import fs from "fs";
const html=fs.readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../public/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../public/styles.css",import.meta.url),"utf8");
const pkg=JSON.parse(fs.readFileSync(new URL("../package.json",import.meta.url),"utf8"));
const checks={version:pkg.version==="2.5.1",detailTarget:html.includes('detail-focus-target'),flow:html.includes('1 · 현재 분석')&&html.includes('4 · Exit 재검증'),button:js.includes('상세분석 →'),focusOption:js.includes('analyze({focusDetail:true})'),scroll:js.includes("scrollIntoView({behavior:'smooth',block:'start'})"),entryHint:js.includes('Exit 비교 기준으로 저장됩니다'),styles:css.includes('.detail-focus-flash')&&css.includes('.entry-flow')};
const ok=Object.values(checks).every(Boolean); console.log(JSON.stringify({ok,version:pkg.version,checks},null,2)); if(!ok)process.exitCode=1;
