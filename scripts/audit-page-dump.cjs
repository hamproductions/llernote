// Dump what the published page actually computes in every view. Usage: node audit-page-dump.js <page.html> <out.json>
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:900}});const errs=[];p.on('pageerror',x=>errs.push(x.message));
await p.goto('file://'+process.argv[2]);const out={errs,views:{}};
const snap=()=>p.evaluate(()=>({hero:[...document.querySelectorAll('.stat b')].map(x=>x.textContent),songs:D.songlist.length,weighted:D.weighted,
 series:D.series.map(s=>[s[0],s[2]]),cats:D.cats.map(c=>[c[0],c[1],c[2]]),solos:D.solos.map(s=>[s[0],s[2]]),perf:D.perf.map(x=>[x[0],x[3],x[4]]),
 fullhalf:D.fullhalf,gini:D.gini_ng,push:[...document.querySelectorAll('#push tr')].slice(1).map(r=>[...r.children].map(c=>c.textContent.trim()))}));
for(const day of ['dA','dB','dC'])for(const mode of ['all','active']){await p.click('#'+day);await p.click(mode=='all'?'#fA':'#fB');
 await p.evaluate(m=>{const e=document.querySelector('#fE');if(e.checked!==(m=='active')){e.click()}},mode);await p.waitForTimeout(120);out.views[day+'/'+mode]=await snap()}
console.log(JSON.stringify(out));await b.close()})();
