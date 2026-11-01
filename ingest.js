// Runs INSIDE the Nexus tab (students.mesaschool.co.in) via the Claude built-in browser's javascript_tool.
// Needs window.neonPut (SigV4 PUT to Neon bucket; creds in localStorage neon_ak / neon_sk — NEVER commit these).
// Usage: window.ingest('Term 1/Business Reader') while on that course page. It walks every tab except
// Overview/Recordings/Announcements, drills folders, opens each "Open <name>" item, clicks Download,
// captures the signed GCS URL from the synthetic <a download>.click(), fetches the bytes, uploads to
// mesa-files/<prefix>/<tab>/<folder>/<filename>. Items with no Download button are saved as *.note.json
// (text + links). Progress is in localStorage key ing_<prefix with non-word chars -> _>.
// Signed GCS URLs expire in minutes: always re-open the item fresh before fetching.
async function ingest(prefix){
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const slug=s=>String(s).replace(/[\\/:*?"<>|#%]+/g,'-').replace(/\s+/g,' ').trim().slice(0,120);
const log=[];const st={prefix,done:0,fail:0,running:true,log};const save=()=>localStorage.setItem('ing_'+prefix.replace(/\W+/g,'_'),JSON.stringify({prefix,done:st.done,fail:st.fail,running:st.running,log:log.slice(-400)}));
const anchor=[...document.querySelectorAll('button')].find(x=>/^(Overview|Resources|Outlines|Class Recordings)$/.test(x.innerText.trim()));
const strip=anchor.parentElement;const names=[...strip.children].filter(e=>e.tagName==='BUTTON').map(e=>e.innerText.trim()).filter(Boolean);
const getTab=n=>[...strip.children].find(e=>e.tagName==='BUTTON'&&e.innerText.trim()===n);
let cur=null;const oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){cur={h:this.href,d:this.download};if(this.download||/storage\.googleapis/.test(this.href))return;return oc.apply(this,arguments)};
const used=new Set();
const closeDlg=async()=>{const c=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Close'||x.getAttribute('aria-label')==='Close');if(c){c.click();await sleep(500)}};
const doItem=async(btn,path)=>{
 const label=(btn.getAttribute('aria-label')||'').replace(/^Open /,'');
 try{cur=null;btn.click();await sleep(2200);
  const dl=[...document.querySelectorAll('button')].find(x=>/^Download/.test(x.innerText.trim()));
  if(dl){dl.click();await sleep(1200);
   if(cur&&cur.h){const r=await fetch(cur.h);if(!r.ok)throw new Error('fetch '+r.status);const bl=await r.blob();
    let fn=slug(cur.d||label);let key=path+'/'+fn;let n=1;while(used.has(key)){key=path+'/'+(n++)+'_'+fn}used.add(key);
    const p=await window.neonPut(key,bl,bl.type||'application/octet-stream');if(p.status!==200)throw new Error('put '+p.status+p.body);
    log.push({ok:1,key,size:p.size,sha:p.sha});st.done++}
   else throw new Error('no dl url')}
  else{const dlg=document.querySelector('[role=dialog]');const txt=(dlg||document.querySelector('main')).innerText;const links=[...(dlg||document).querySelectorAll('a[href]')].map(a=>a.href);
   let key=path+'/'+slug(label)+'.note.json';let n=1;while(used.has(key)){key=path+'/'+(n++)+'_'+slug(label)+'.note.json'}used.add(key);
   const bl=new Blob([JSON.stringify({label,text:txt,links,url:location.href})],{type:'application/json'});const p=await window.neonPut(key,bl,'application/json');
   log.push({ok:1,note:1,key,size:p.size,links});st.done++}
 }catch(e){log.push({ok:0,label,path,err:String(e.message||e)});st.fail++}
 await closeDlg();save();
};
const walk=async(path,depth)=>{
 const main=()=>document.querySelector('main');
 const labels=[...main().querySelectorAll('button[aria-label^="Open "]')].map(b=>b.getAttribute('aria-label'));
 for(const l of labels){const b=[...main().querySelectorAll('button[aria-label^="Open "]')].find(x=>x.getAttribute('aria-label')===l);if(b)await doItem(b,path);await sleep(300)}
 if(depth>2)return;
 const nf=main().querySelectorAll('[class*="group/folder"]').length;
 for(let i=0;i<nf;i++){const f=main().querySelectorAll('[class*="group/folder"]')[i];if(!f)break;
  const fname=slug(f.innerText.split('\n').filter(Boolean)[0]||('folder'+i));
  const leaf=[...f.querySelectorAll('*')].find(e=>e.children.length===0&&(e.textContent||'').trim());(leaf||f).click();await sleep(1300);
  await walk(path+'/'+fname,depth+1);
  const back=[...main().querySelectorAll('button')].find(x=>/^Back$/.test(x.innerText.trim()));if(back){back.click();await sleep(900)}
 }
};
try{
 for(const n of names){ if(/Overview|Recordings|Announcements/.test(n))continue; const b=getTab(n);if(!b)continue;b.click();await sleep(1200);
  await walk(prefix+'/'+slug(n),0)}
}catch(e){log.push({ok:0,fatal:String(e.message)})}
HTMLAnchorElement.prototype.click=oc;st.running=false;save();
}
// SPA-navigate between courses without losing JS state: window.next.router.push('/student/lms/courses/<id>')
