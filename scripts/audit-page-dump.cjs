// Dump what the report page actually computes in every view. Usage: node audit-page-dump.cjs <page.html> <out.json>
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:900}});const errs=[];p.on('pageerror',x=>errs.push(x.message));
await p.goto('file://'+process.argv[2]);const out={errs,views:{}};
const snap=()=>p.evaluate(()=>({songs:D.songs,weighted:D.weighted,series:D.series.map(s=>[s[0],s[2]]),types:D.types,solos:D.solos,
 perf:D.perf.map(x=>[x.name,x.fr,x.w,x.collab,x.solo]),gini:D.gini,top10:D.top10,n_ng:D.n_ng,collab:[D.collab.song,D.collab.cast,D.collab.songW,D.collab.songTot,D.collab.castW,D.collab.castTot],
 collabFr:D.collab.fr.map(r=>[r.fr,r.pct]),push:D.push.map(r=>[r.fr,r.n,r.song,r.avg,r.vs,r.solo,r.spot,r.min,r.max]),
 shown:{perfRows:document.querySelectorAll('#perf g').length,pushRows:document.querySelectorAll('#pushtab tr[data-f]').length,exRows:document.querySelectorAll('#ex tr[data-i]').length,findings:document.querySelectorAll('#findings li').length}}));
for(const day of ['d1','d2','full'])for(const mode of ['all','active']){await p.click(`[data-d=${day}]`);await p.click(`[data-a="${mode=='all'?0:1}"]`);
 await p.evaluate(m=>{const e=document.querySelector('#noens');if(e.checked!==(m=='active')){e.click()}},mode);await p.waitForTimeout(120);out.views[day+'/'+mode]=await snap()}
console.log(JSON.stringify(out));await b.close()})();
