/* ===== Configuration (edit here) ===== */
const CFG={demoUser:'demo',demoPass:'demo123',name:'Machinery Information System',tag:'Engineering & Maintenance Digitalization',contact:'karunanayakedilupa@gmail.com',owner:'',siteRepo:'',dataRepo:'',branch:'main',apiBase:'https://api.github.com',usersUrl:'users.json'};
Object.assign(CFG,window.MIS_CONFIG||{}); /* repository names come from config.js */

/* ===== Helpers ===== */
const $=s=>document.querySelector(s),E=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const add=(d,n)=>new Date(new Date(d).getTime()+n*864e5).toISOString().slice(0,10),D0=n=>add(new Date(),n),T=()=>D0(0);
const dd=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const FQ={Daily:1,Weekly:7,Monthly:30,Quarterly:91,Annual:365},ST=['Running','Maintenance','Breakdown','Offline'];
const emp=()=>({machines:[],maintenance:[],breakdowns:[],diodes:[],parts:[],tickets:[],users:[],audit:[]});
/* Older service records get the new Month / Active Status / Service Status values */
const mig=d=>{if(d&&Array.isArray(d.maintenance))d.maintenance.forEach(r=>{if(!r.month&&r.date)r.month=String(r.date).slice(0,7);if(!r.active)r.active='Active';if(!r.service)r.service=r.status=='Completed'?'Updated':'Pending'});return d};
const load=k=>{try{return mig(JSON.parse(localStorage.getItem(k)))}catch(e){return null}};
const log=a=>{db.audit.unshift({u:S?S.user:'-',t:new Date().toLocaleString(),a});db.audit.splice(500);save()};
const dl=(n,mt,x)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([x],{type:mt}));a.download=n;a.click()};
const tb=(c,r)=>`<table><thead><tr>${c.map(x=>`<th>${E(x)}</th>`).join('')}</tr></thead><tbody>${r.map(y=>`<tr>${y.map(v=>`<td>${E(v)}</td>`).join('')}</tr>`).join('')||'<tr><td>No records</td></tr>'}</tbody></table>`;
const BK={status:1,priority:1,alert:1,st:1,stock:1,active:1,service:1};
const bc=v=>({Running:'ok',Updated:'ok',Pending:'wr',Completed:'ok',Active:'ok',OK:'ok',Done:'ok',Low:'ok',Maintenance:'wr',Scheduled:'wr','In Progress':'wr','DUE SOON':'wr',Approaching:'wr',Medium:'wr',Breakdown:'er',Open:'er',OVERDUE:'er','LOW STOCK':'er',High:'er'}[v]||'of');
const cell=(k,v)=>BK[k]&&v?`<span class="b ${bc(v)}">${E(v)}</span>`:E(v);

/* ===== Data model: [key,label,type,options,formOnly]  types: d date, tm time, n number, s select, a textarea ===== */
const M={
machines:{t:'Machines',req:['name'],u:'name',flt:'status',date:'installed',f:[['name','Machine Name'],['asset','Fixed Asset'],['type','Machine Type'],['model','Model'],['mfr','Manufacturer'],['diode','Diode Model'],['serial','Serial Number'],['loc','Location'],['dept','Department'],['status','Status','s',ST],['installed','Installed Date','d'],['doc','Document Link (URL)',0,0,1]]},
maintenance:{t:'Machine Service Rpt',req:['machine','month'],flt:'service',date:'month',tg:['active','service'],
 f:[['machine','Machine','s','m'],['type','Type','s',['Preventive','Corrective','Emergency']],['month','Month','mo'],['active','Active Status','s',['Active','Inactive']],['service','Service Status','s',['Updated','Pending']]]},
tickets:{t:'Tickets',req:['machine','problem','date'],flt:'status',date:'date',
 f:[['no','Ticket No'],['machine','Machine','s','m'],['problem','Problem'],['date','Date Problem Occurred','d'],['time','Time','tm'],['by','Reported By'],['priority','Priority','s',['Low','Medium','High']],['status','Status','s',['Open','In Progress','Completed']],['parts','Parts Used'],['desc','Description','a',0,1],['diagnosis','Diagnosis','a',0,1],['cause','Root Cause','a',0,1],['action','Corrective Action','a',0,1],['down','Downtime (Hours)','n',0,1],['completed','Completion Date','d',0,1]]},
breakdowns:{t:'Breakdowns',h:'Breakdown History',req:['machine','date','problem'],flt:'status',date:'date',
 f:[['machine','Machine','s','m'],['date','Date','d'],['time','Time','tm'],['problem','Problem'],['by','Reported By'],['priority','Priority','s',['Low','Medium','High']],['status','Status','s',['Open','In Progress','Completed']],['down','Downtime (Hours)','n'],['completed','Completion Date','d'],['desc','Description','a',0,1],['diagnosis','Diagnosis','a',0,1],['cause','Root Cause','a',0,1],['action','Corrective Action','a',0,1],['parts','Parts Used',0,0,1]]},
diodes:{t:'Diodes',h:'Diode Changing History',req:['machine','no','installed'],flt:'st',date:'installed',
 f:[['machine','Machine','s','m'],['no','Diode Number'],['type','Diode Type'],['installed','Installation Date','d'],['replaced','Replacement Date','d'],['expected','Expected Lifetime (Days)','n'],['reason','Replacement Reason']],
 c:[['op','Operating Days'],['life','Actual Lifetime (Days)'],['st','Status']],
 calc:r=>{const op=dd(r.installed,r.replaced||T());return{op,life:r.replaced?op:'',st:r.replaced?'Replaced':(+r.expected&&op>=r.expected*.9?'Approaching':'Active')}}},
parts:{t:'Spare Parts',req:['no','name'],u:'no',flt:'stock',
 f:[['no','Part Number'],['name','Part Name'],['cat','Category'],['mfr','Manufacturer'],['supplier','Supplier'],['qty','Quantity','n'],['min','Minimum Stock','n'],['loc','Location'],['cost','Unit Cost','n'],['compat','Compatible Machine','s','m']],
 c:[['stock','Stock']],calc:r=>({stock:+r.qty<+r.min?'LOW STOCK':'OK'})}};

/* ===== Demo (fictional) dataset ===== */
function seed(){const d=emp(),mk=['name','asset','type','mfr','diode','serial','loc','dept','status'];
[['PDS-LASER-001','FA-10001','Laser Marking','Sample Mfr','DL-808-A','SN-A001','Line 1','Production','Running',-700],['PDS-LASER-002','FA-10002','Laser Marking','Sample Mfr','DL-808-A','SN-A002','Line 1','Production','Maintenance',-600],['CNC-SAMPLE-01','FA-10003','CNC Mill','Sample Mfr','-','SN-B001','Hall B','Machining','Running',-900],['PRESS-SAMPLE-01','FA-10004','Hydraulic Press','Sample Mfr','-','SN-C001','Hall C','Fabrication','Breakdown',-1200],['PDS-LASER-003','FA-10005','Laser Cutting','Sample Mfr','DL-915-B','SN-D001','Line 2','Production','Running',-300],['OVEN-SAMPLE-01','FA-10006','Curing Oven','Sample Mfr','-','SN-E001','Hall A','Assembly','Offline',-1500]].forEach((a,ix)=>{const o={doc:'',model:['LM-200','LM-200','CM-500','HP-90','LC-300','CO-45'][ix]};mk.forEach((k,i)=>o[k]=a[i]);o.installed=D0(a[9]);d.machines.push(o)});
const N=d.machines.map(x=>x.name);
for(let i=0;i<12;i++)d.maintenance.push({machine:N[i%6],type:['Preventive','Preventive','Corrective','Emergency'][i%4],month:D0(-30*Math.floor(i/6)).slice(0,7),active:i==5?'Inactive':'Active',service:i%3==0?'Pending':'Updated'});
for(let i=0;i<5;i++)d.breakdowns.push({machine:N[(i*2+1)%6],date:D0(-i*35-3),time:'09:30',problem:'Sample fault '+(i+1),by:'Operator',priority:['High','Medium','Low'][i%3],status:i==0?'Open':i==1?'In Progress':'Completed',down:i*2+1,completed:'',desc:'',diagnosis:'',cause:'',action:'',parts:''});
for(let i=0;i<6;i++)d.diodes.push({machine:N[i],no:'D-00'+(i+1),type:'808nm Module',installed:D0(-500+i*60),replaced:i%3==2?D0(-20*i):'',expected:400,reason:i%3==2?'End of life':''});
const pk=['no','name','cat','mfr','supplier','qty','min','loc','cost','compat'];
[['SP-100','Focus Lens','Optics','Sample Mfr','Sample Supplier',12,5,'Store A',85,N[0]],['SP-101','Cooling Filter','Cooling','Sample Mfr','Sample Supplier',2,4,'Store A',30,N[1]],['SP-102','Seal Kit','Hydraulics','Sample Mfr','Sample Supplier',6,2,'Store B',60,N[3]],['SP-103','Driver Board','Electronics','Sample Mfr','Sample Supplier',3,2,'Store A',450,N[4]]].forEach(a=>{const o={};pk.forEach((k,i)=>o[k]=a[i]);d.parts.push(o)});
d.tickets.push({no:'T-0001',machine:N[3],problem:'Hydraulic pressure drop',date:D0(-1),time:'09:15',by:'Operator',priority:'High',status:'Open',desc:'Pressure falls during the press cycle',diagnosis:'',cause:'',action:'',down:'',completed:'',parts:'',pl:[]},
 {no:'T-0002',machine:N[1],problem:'Laser power unstable',date:D0(-3),time:'14:40',by:'Technician A',priority:'Medium',status:'In Progress',desc:'Output power drifts after 30 minutes',diagnosis:'Checking cooling flow',cause:'',action:'',down:'',completed:'',parts:'',pl:[]},
 {no:'T-0003',machine:N[0],problem:'Cooling filter blocked',date:D0(-12),time:'08:05',by:'Operator',priority:'Low',status:'Completed',desc:'Coolant flow alarm',diagnosis:'Filter clogged',cause:'Dirty coolant',action:'Replaced filter',down:'2',completed:D0(-11),parts:'SP-101 x1',pl:[{no:'SP-101',qty:1}],bd:1});
d.breakdowns.push({machine:N[0],date:D0(-12),time:'08:05',problem:'Cooling filter blocked',by:'Operator',priority:'Low',status:'Completed',down:'2',completed:D0(-11),desc:'Coolant flow alarm',diagnosis:'Filter clogged',cause:'Dirty coolant',action:'Replaced filter',parts:'SP-101 x1',ticket:'T-0003'});
return mig(d)}

/* ===== Authentication: PBKDF2 (Web Crypto). No passwords are stored in this file except the configurable demo login. ===== */
const b64=u=>btoa(String.fromCharCode(...u)),salt=()=>b64(crypto.getRandomValues(new Uint8Array(16)));
async function hash(p,s){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveBits']);
 return b64(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(atob(s),c=>c.charCodeAt(0)),iterations:150000,hash:'SHA-256'},k,256)))}
let S=null,db,key,view='home',q='',filt='',sortK='',sortD=-1,MI=0,ED,IM,RP={k:'machines',a:'',b:''};
function start(mode,u,role,d){S={mode,user:u,role};key='mis_'+mode;db=d;log('User logged in');go('dash')}
function demo(v){start('demo',CFG.demoUser,'admin',seed());if(v=='md'){MI=0;view='md';render()}else if(v)go(v)}
async function out(){log('User logged out');await flush();S=null;TOK=null;WR=false;go('home')}
/* ===== GitHub-only storage =====
   Website  : public repo (GitHub Pages)  -> index.html, app.js, style.css, config.js, users.json
   Data     : PRIVATE repo               -> data.json (+ backups/)
   Logins   : users.json holds, per person, a GitHub access token ENCRYPTED with that person's password (AES-GCM, PBKDF2 600k).
   Read-only token = viewer, read+write token = administrator. GitHub itself enforces who can write. Nothing is kept in the browser. */
const GH=()=>!!(CFG.owner&&CFG.siteRepo&&CFG.dataRepo),isOn=()=>!!S&&S.mode=='real';
let TOK=null,WR=false,SHA=null,DIRTY=0,BUSY=0,STM=0,UL;
const u8=s=>new TextEncoder().encode(s),fromB=b=>Uint8Array.from(atob(b),c=>c.charCodeAt(0));
const toB=u=>{let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode(...u.subarray(i,i+8192));return btoa(s)};
const stat=m=>{const e=$('#gs');if(e)e.textContent=m};
async function api(repo,path,o={},tok=TOK){const r=await fetch(CFG.apiBase+'/repos/'+CFG.owner+'/'+repo+'/contents/'+path+(o.method?'':'?ref='+CFG.branch),{cache:'no-store',...o,headers:{Authorization:'Bearer '+tok,Accept:'application/vnd.github+json','Content-Type':'application/json'}});
 const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch(e){}
 if(!r.ok){const e=new Error((j&&j.message)||'GitHub error '+r.status);e.status=r.status;throw e}return j}
async function ghRead(repo,path,tok=TOK){try{const j=await api(repo,path,{},tok);const txt=j.content&&j.encoding=='base64'?new TextDecoder().decode(fromB(j.content.replace(/\s/g,''))):await(await fetch(j.download_url,{cache:'no-store'})).text();return{txt,sha:j.sha}}catch(e){if(e.status==404)return null;throw e}}
async function ghWrite(repo,path,txt,msg,sha,tok=TOK){return(await api(repo,path,{method:'PUT',body:JSON.stringify({message:msg,content:toB(u8(txt)),branch:CFG.branch,...(sha?{sha}:{})})},tok)).content.sha}
/* write test that changes nothing: a deliberately wrong sha gives 409/422 only when writing is allowed */
async function canWrite(tok,repo=CFG.dataRepo,path='data.json'){try{await api(repo,path,{method:'PUT',body:JSON.stringify({message:'permission check (no change)',content:toB(u8('{}')),branch:CFG.branch,sha:'0'.repeat(40)})},tok);return true}catch(e){return e.status==409||e.status==422}}
/* password -> encrypted token */
const key_=async(p,salt)=>crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},await crypto.subtle.importKey('raw',u8(p),'PBKDF2',false,['deriveKey']),{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
async function penc(p,tok){const s=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));return{salt:toB(s),iv:toB(iv),ct:toB(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key_(p,s),u8(tok))))}}
const pdec=async(p,x)=>new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB(x.iv)},await key_(p,fromB(x.salt)),fromB(x.ct)));
async function usersPublic(){try{const r=await fetch(CFG.usersUrl+(CFG.usersUrl.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});return r.ok?(await r.json()).users||[]:null}catch(e){return null}}
const strip=d=>({...d,users:[]});
async function loadAll(){const f=await ghRead(CFG.dataRepo,'data.json');SHA=f?f.sha:null;const d=mig(Object.assign(emp(),f?JSON.parse(f.txt):{}));d.users=[];return d}
async function startReal(u,tok){TOK=tok;WR=await canWrite(tok);db=await loadAll();S={mode:'real',user:u,role:WR?'admin':'user'};log('User logged in');go('dash')}
async function reloadData(){db=await loadAll();render()}
/* saving: one commit per burst of changes; viewers never write */
function save(){if(!isOn()||!WR)return;DIRTY=1;clearTimeout(STM);STM=setTimeout(flush,800);stat('Saving...')}
async function flush(){clearTimeout(STM);while(BUSY)await new Promise(r=>setTimeout(r,100));if(!DIRTY)return;DIRTY=0;BUSY=1;
 try{SHA=await ghWrite(CFG.dataRepo,'data.json',JSON.stringify(strip(db),null,1),'MIS data update by '+S.user,SHA);stat('Saved to GitHub')}
 catch(e){stat('NOT SAVED');if(e.status==409||e.status==422){alert('Another administrator changed the data first. Your last change was NOT saved. The latest data is loaded now; please repeat the change.');await reloadData()}else alert('Could not save to GitHub: '+e.message)}BUSY=0}
if(typeof addEventListener=='function')addEventListener('beforeunload',e=>{if(DIRTY||BUSY){e.preventDefault();e.returnValue=''}});
/* first-time setup: runs ONLY while users.json does not exist in the website repository */
async function doSetup(u,p,p2,tok,er){
 if(!/^[A-Za-z0-9._-]{2,30}$/.test(u))return er('Username: 2-30 letters, numbers, dot, dash or underscore.');
 if(p.length<12)return er('Password must be at least 12 characters.');if(p!=p2)return er('Passwords do not match.');if(!tok)return er('Paste the administrator GitHub token.');
 const rp=await fetch(CFG.apiBase+'/repos/'+CFG.owner+'/'+CFG.dataRepo,{headers:{Authorization:'Bearer '+tok},cache:'no-store'});if(!rp.ok)return er('Cannot open the data repository with this token. Check owner / repository names in config.js and the token access.');
 try{const cur=await ghRead(CFG.dataRepo,'data.json',tok);
  if(!cur)await ghWrite(CFG.dataRepo,'data.json',JSON.stringify(strip(emp())),'Create data file',null,tok);else if(!await canWrite(tok))return er('This token cannot write to the data repository.');
  await ghWrite(CFG.siteRepo,'users.json',JSON.stringify({v:1,users:[{u,r:'admin',...await penc(p,tok)}]},null,1),'Create first user',null,tok)}
 catch(e){return er(e.status==422?'users.json already exists in the website repository. Wait a minute for the site to update, then sign in.':/not accessible|not found|forbidden/i.test(e.message)?'This token needs Contents: Read and write on BOTH repositories.':e.message)}
 await startReal(u,tok)}
async function doLogin(e,setup){const f=new FormData(e.target),u=f.get('u').trim(),p=f.get('p'),er=m=>{$('#le').textContent=m};
 if(u==CFG.demoUser&&p==CFG.demoPass)return demo();
 if(!GH())return er('GitHub is not configured. Fill in config.js.');
 try{er('Please wait...');
  if(setup)return await doSetup(u,p,f.get('p2'),(f.get('t')||'').trim(),er);
  const x=(UL||[]).find(z=>z.u.toLowerCase()==u.toLowerCase());let tok;try{if(!x)throw 0;tok=await pdec(p,x)}catch(_){return er('Invalid username or password.')}
  await startReal(u,tok)}catch(err){er(err.message)}}
function loginV(){const setup=GH()&&UL!==undefined&&!(UL&&UL.length);
 return hdr()+`<div class=lg><div class=cd><h2>${CFG.name}</h2>${!GH()?'<p class=er>GitHub is not configured yet (config.js). Only the demo works.</p>':UL===undefined?'<p class=mu>Checking...</p>':setup?'<p class=mu>First-time setup (only once, stored in GitHub): create the administrator. Paste a GitHub token with Contents: Read and write on both repositories. It is stored encrypted with your password.</p>':''}<form onsubmit="doLogin(event,${setup});return false"><label>Username<input name=u autocomplete=username required></label><label>Password<input name=p type=password autocomplete=current-password required></label>${setup?'<label>Confirm Password<input name=p2 type=password autocomplete=new-password required></label><label>Administrator GitHub Token<input name=t type=password autocomplete=off required></label>':''}<p class=er id=le></p><button class="btn p">${setup?'Create Administrator':'Login'}</button></form><hr><p class=mu>Demo Login: <b>${E(CFG.demoUser)}</b> / <b>${E(CFG.demoPass)}</b> (fictional sample data, nothing is saved)</p><button class=btn onclick="demo()">Enter Demo Mode</button></div></div>`}
function commit(m,i,o,X){i>=0?Object.assign(db[m][i],o):db[m].push(o);log((i>=0?'Updated ':'Created ')+X.t+' record: '+o[X.f[0][0]]);cl();render();return false}
/* Users page: logins are entries in users.json of the website repository */
async function ulist(){const el=$('#ul');try{const f=await ghRead(CFG.siteRepo,'users.json'),us=f?JSON.parse(f.txt).users:[];el.innerHTML=`<table><thead><tr><th>Username<th>Access<th></tr></thead><tbody>${us.map(x=>`<tr><td>${E(x.u)}<td>${x.r=='admin'?'Administrator (can edit)':'Viewer (read only)'}<td>${x.u.toLowerCase()==S.user.toLowerCase()?'(you)':`<button class=btn onclick="delU('${E(x.u)}')">Remove</button>`}`).join('')}</tbody></table>`}catch(e){if(el)el.textContent=e.message}}
async function addU(e){const f=new FormData(e.target),u=f.get('u').trim(),p=f.get('p'),t=f.get('t').trim();
 try{if(!/^[A-Za-z0-9._-]{2,30}$/.test(u))throw new Error('Username: 2-30 letters, numbers, dot, dash or underscore.');if(p.length<12)throw new Error('Password must be at least 12 characters.');
  if(!await ghRead(CFG.dataRepo,'data.json',t))throw new Error('This token cannot read the data repository.');
  const w=await canWrite(t),cur=await ghRead(CFG.siteRepo,'users.json'),j=cur?JSON.parse(cur.txt):{v:1,users:[]};
  if(j.users.some(x=>x.u.toLowerCase()==u.toLowerCase()))throw new Error('This username already exists.');
  j.users.push({u,r:w?'admin':'viewer',...await penc(p,t)});await ghWrite(CFG.siteRepo,'users.json',JSON.stringify(j,null,1),'Add user '+u,cur&&cur.sha);
  log('User added: '+u+(w?' (administrator)':' (viewer)'));e.target.reset();ulist();alert('User added as '+(w?'administrator':'viewer')+'. They can sign in once the website has refreshed (about a minute).')}catch(err){alert(err.message)}}
async function delU(u){if(!confirm('Remove '+u+' from the login list? To fully revoke access also delete that person\'s GitHub token.'))return;
 try{const cur=await ghRead(CFG.siteRepo,'users.json'),j=JSON.parse(cur.txt);j.users=j.users.filter(x=>x.u!=u);await ghWrite(CFG.siteRepo,'users.json',JSON.stringify(j,null,1),'Remove user '+u,cur.sha);log('User removed: '+u);ulist()}catch(e){alert(e.message)}}
/* Backups inside the private data repository (backups/ folder) */
async function bkNow(){try{const n='backups/mis-backup-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.json';await ghWrite(CFG.dataRepo,n,JSON.stringify(strip(db)),'MIS backup by '+S.user,null);log('Backup created: '+n);bkList();alert('Backup saved in GitHub: '+n)}catch(e){alert(e.message)}}
async function bkList(){const el=$('#bk');try{const l=(await api(CFG.dataRepo,'backups')).filter(x=>/^[\w.-]+\.json$/.test(x.name)).sort((a,b)=>a.name<b.name?1:-1);el.innerHTML=l.length?`<table><thead><tr><th>Backup<th></tr></thead><tbody>${l.map(x=>`<tr><td>${E(x.name)}<td><button class=btn onclick="bkRestore('${E(x.name)}')">Restore</button>`).join('')}</tbody></table>`:'<p class=mu>No backups yet.</p>'}catch(e){if(el)el.innerHTML=e.status==404?'<p class=mu>No backups yet.</p>':E(e.message)}}
async function bkRestore(n){if(!/^[\w.-]+\.json$/.test(n)||!confirm('Replace ALL current data with '+n+'?'))return;try{const f=await ghRead(CFG.dataRepo,'backups/'+n);db=mig(Object.assign(emp(),JSON.parse(f.txt)));db.users=[];log('Backup restored: '+n);save();render()}catch(e){alert(e.message)}}
function upLocal(){const d=load('mis_real');if(!d||!(d.machines||[]).length)return alert('No old data found in this browser.');if(confirm('Replace the GitHub data with the old data found in this browser?')){db=mig(Object.assign(emp(),d));db.users=[];log('Old browser data imported');save();render()}}

/* ===== Navigation / rendering ===== */
const go=v=>{if(v=='login')UL=undefined;view=v;q='';filt='';sortK='';sortD=-1;render();scrollTo(0,0)};
const sc=id=>{view='home';render();(document.getElementById(id)||document.body).scrollIntoView()};
function hdr(){return `<header class=top><b>MIS</b>${[['home','Home'],['about','About'],['features','Features'],['system','System'],['preview','Dashboard Preview'],['tech','Technology'],['project','Project'],['contact','Contact']].map(([k,l])=>`<button class=n onclick="sc('${k}')">${l}</button>`).join('')}<button class="btn p" style="margin-left:auto" onclick="go('login')">Login</button></header>`}
function render(){const a=$('#app');
 if(!S){a.innerHTML=view=='login'?loginV():pub();if(view=='login'&&UL===undefined&&GH())usersPublic().then(x=>{UL=x||[];if(view=='login'&&!S)render()});return}
 const nv=[['dash','Dashboard'],['tickets','Tickets'],['machines','Machines'],['maintenance','Machine Service Rpt'],['breakdowns','Breakdowns'],['diodes','Diodes'],['parts','Spare Parts'],['reports','Reports'],['users','Users'],['settings','Settings']];
 a.innerHTML=`<header class="top np"><b>MIS</b>${nv.map(([k,l])=>`<button class="n${view==k||(view=='md'&&k=='machines')?' on':''}" onclick="go('${k}')">${l}</button>`).join('')}<button class=n onclick="out()">Logout</button><span id=gs style="margin-left:auto;color:#f5c26b"></span><span style="margin-left:12px;color:#9fb0c3">${E(S.user)}${S.mode=='demo'?' (Demo)':S.role!='admin'?' (View only)':''}</span></header><main class=w>${M[view]?page(view):({md:mdet,reports:repV,users:usersV,settings:setV}[view]||dash)()}</main>`;
 if(M[view])draw();if(view=='reports')rd();if(view=='dash')gsr();if(view=='users'&&isOn())ulist();if(view=='settings'&&isOn())bkList();}

/* ===== Public portfolio ===== */
function pub(){db=seed();const C=(t,p)=>`<div class=cd><h3>${t}</h3><p class=mu>${p}</p></div>`,sec=(id,t,b)=>`<section id=${id} class=w><h2>${t}</h2>${b}</section>`;
 const sys=[['Login','Secure sign-in with hashed passwords','login'],['Dashboard','Status cards and live charts','dash'],['Machine Information','Searchable machine register','machines'],['Machine Details','History, documents and timeline','md'],['Machine Service Rpt','Monthly service reports with Active and Updated status','maintenance'],['Breakdown','Fault records and repair status','breakdowns'],['Diode Management','Lifetime tracking','diodes'],['Spare Parts','Stock with low-stock alerts','parts'],['Reports','CSV, Excel and print','reports']];
 return hdr()+`<section id=home class=hero><h1>MACHINERY INFORMATION SYSTEM</h1><h3>Digital Machinery Maintenance &amp; Asset Management</h3><p style="max-width:680px;margin:12px auto 24px;color:#b9c6d6">A system designed to manage machinery information, preventive maintenance, breakdowns, spare parts, diode replacements and equipment history.</p><button class="btn p" onclick="go('login')">Login to System</button><button class=btn onclick="demo()">View System</button><button class=btn onclick="sc('features')">Explore Features</button><button class=btn onclick="sc('about')">About Project</button></section>`
 +sec('about','About the Project','<div class=g>'+C('Problem','Machinery maintenance information is often spread across paper records, Excel files, manual reports, separate maintenance records and operator communications.')+C('Solution','The Machinery Information System centralizes machinery information and maintenance activities into one digital platform.')+C('Result','Centralized machine records, maintenance tracking, breakdown history, diode replacement tracking, spare-parts management, dashboards, reports and historical machine information.')+'</div>')
 +sec('features','Features','<div class=g>'+[['Machine Management','Centralized information for all machinery.'],['Preventive Maintenance','Track scheduled maintenance and upcoming service.'],['Breakdown Management','Record and analyze equipment failures.'],['Ticketing','Raise a ticket when a machine has a problem. Completed repairs feed the breakdown report and deduct the parts used from stock.'],['Diode Tracking','Monitor diode installation and replacement history.'],['Spare Parts','Track spare-parts inventory and usage.'],['Analytics','Monitor machine performance through dashboards.'],['Reporting','Generate maintenance and machinery reports.'],['Document Management','Link machine manuals and technical documents.']].map(x=>C(...x)).join('')+'</div>')
 +sec('system','System Preview','<p class=mu>Every card opens the working module in Demo Mode (fictional sample data).</p><div class=g>'+sys.map(([t,p,v])=>`<div class=cd><h3>${t}</h3><p class=mu>${p}</p><button class=btn onclick="${v=='login'?"go('login')":`demo('${v}')`}">Open</button></div>`).join('')+'</div>')
 +sec('preview','Dashboard Preview','<p class=mu>Computed live from the sample dataset.</p>'+dash())
 +sec('tech','Technologies Used','<div class=g>'+[['HTML5','Page structure and forms.'],['CSS3','Responsive layout, light and dark themes.'],['JavaScript','All application logic, no frameworks.'],['Charts / Data Visualization','Bar charts drawn with HTML and CSS.'],['Database','JSON files in a private GitHub repository, with commit history and backups.'],['Responsive Web Design','Desktop, tablet and mobile layouts.'],['Web Crypto API','PBKDF2 and AES-GCM: each GitHub token is encrypted with its owner\'s password.']].map(x=>C(...x)).join('')+'</div>')
 +sec('project','Project Achievements','<div class=g>'+[['Digitalization','Converted manual machinery information into a centralized digital system.'],['Maintenance Visibility','Improved visibility of maintenance schedules and machine history.'],['Data Management','Centralized machine-related information.'],['Analytics','Created dashboards for maintenance and equipment information.'],['Traceability','Maintained historical records of maintenance and component replacements.']].map(x=>C(...x)).join('')+'</div>')
 +`<footer id=contact><b style="color:#fff">${E(CFG.name)}</b><br>${E(CFG.tag)}<br>${E(CFG.contact)}<br><small>Public visitors see fictional sample data only.</small></footer>`}

/* ===== Dashboard ===== */
function dash(){const ot=db.tickets.filter(t=>t.status!='Completed'),ms=db.machines,c=s=>ms.filter(x=>x.status==s).length,due=db.maintenance.filter(r=>r.active!='Inactive'&&r.service=='Pending').length,
 mo=[...Array(6)].map((_,i)=>{const d=new Date();d.setDate(1);d.setHours(12);d.setMonth(d.getMonth()-5+i);return d.toISOString().slice(0,7)}),
 by=(a,k)=>mo.map(x=>a.filter(r=>(r[k]||'').slice(0,7)==x).length),TY=['Preventive','Corrective','Emergency'],
 dt=ms.map(x=>[x.name,db.breakdowns.filter(r=>r.machine==x.name).reduce((s,r)=>s+(+r.down||0),0)]),
 bar=(t,l,v)=>{const mx=Math.max(1,...v);return `<div class=cd><b>${t}</b>${l.map((x,i)=>`<div class=br title="${E(x)}: ${v[i]}"><span>${E(x)}</span><i style="width:${v[i]/mx*100}%"></i><b>${v[i]}</b></div>`).join('')}</div>`};
 return `<h2>MACHINERY INFORMATION SYSTEM</h2>${S?`<div class="cd np"><input id=gq type=search aria-label="Search all records" placeholder="Search by machine name, model, serial number, asset no or location to collect the full machine history (diode changes, breakdowns, service reports)" value="${E(GQ)}" oninput="gsr(this.value)"><div id=gr></div></div><br>`:''}<div class=g>${[['Total Machines',ms.length,'of'],['Running',c('Running'),'ok'],['Maintenance',c('Maintenance'),'wr'],['Breakdown',c('Breakdown'),'er'],['Offline',c('Offline'),'of'],['Service Pending',due,'wr'],['Open Tickets',ot.length,ot.some(t=>t.priority=='High')?'er':'wr']].map(([l,n,k])=>`<div class="cd k1 ${k}"><span class=mu>${l}</span><div class=k>${n}</div></div>`).join('')}</div><br>${tkd(ot)}<div class=g>${bar('Machine Status',ST,ST.map(c))}${bar('Machine Service Trend',mo,by(db.maintenance,'month'))}${bar('Breakdown Trend',mo,by(db.breakdowns,'date'))}${bar('Diode Replacements',mo,by(db.diodes,'replaced'))}${bar('Downtime (Hours)',dt.map(x=>x[0]),dt.map(x=>x[1]))}${bar('Service Type',TY,TY.map(t=>db.maintenance.filter(r=>r.type==t).length))}</div>`}

/* ===== Generic module page: search, filter, sort, add, edit, delete ===== */
function page(m){return `<h2>${M[m].t}</h2><div class="tools np"><input placeholder="Search..." aria-label="Search" oninput="q=this.value;draw()"><select id=fs aria-label="Filter" onchange="filt=this.value;draw()"></select><button class=btn onclick="exT('xlsx')">Excel</button><button class=btn onclick="exT('pdf')">PDF</button><button class=btn onclick="exT('csv')">CSV</button>${S.role=='admin'?`<button class="btn p" onclick="openForm('${m}',-1)">${m=='tickets'?'+ Raise Ticket':'+ Add'}</button>`:''}</div><div class=tw id=tb></div>`}
function draw(){const m=view,X=M[m],fs=$('#fs');
 let rs=db[m].map((r,i)=>({...r,...(X.calc?X.calc(r):{}),_i:i}));
 if(fs.options.length==0)fs.innerHTML='<option value="">All</option>'+[...new Set(rs.map(r=>r[X.flt]))].filter(Boolean).map(v=>`<option>${E(v)}</option>`).join('');
 rs=rs.filter(r=>(!filt||r[X.flt]==filt)&&(!q||JSON.stringify(Object.values(r)).toLowerCase().includes(q.toLowerCase())));
 if(sortK)rs.sort((a,b)=>(a[sortK]>b[sortK]?1:a[sortK]<b[sortK]?-1:0)*sortD);
 const cols=[...X.f.filter(f=>!f[4]),...(X.c||[])];
 CUR={t:X.t,c:cols.map(c=>c[1]),r:rs.map(r=>cols.map(c=>r[c[0]]??''))};
 $('#tb').innerHTML=`<table><thead><tr>${cols.map(([k,l])=>`<th onclick="sortK='${k}';sortD*=-1;draw()">${l}${sortK==k?(sortD>0?' ▲':' ▼'):''}</th>`).join('')}${X.noact?'':'<th>Actions</th>'}</tr></thead><tbody>${rs.map(r=>`<tr>${cols.map(([k])=>`<td>${X.noact&&k==X.f[0][0]?`<button class=btn style="border:0;background:none;color:var(--ac);padding:0;text-transform:none" title="Edit this record" onclick="openForm('${m}',${r._i})">${E(r[k])}</button>`:(X.tg||[]).includes(k)&&S.role=='admin'?`<button class="b ${bc(r[k])} np" style="border:0;cursor:pointer" title="Click to switch" onclick="tg('${m}',${r._i},'${k}')">${E(r[k]||'Set')}</button>`:cell(k,r[k])}</td>`).join('')}${X.noact?'':`<td>${m=='machines'?`<button class=btn onclick="MI=${r._i};go('md')">View</button>`:''}${S.role=='admin'?`<button class=btn onclick="openForm('${m}',${r._i})">Edit</button><button class=btn onclick="del('${m}',${r._i})">Delete</button>`:''}</td>`}</tr>`).join('')||'<tr><td colspan=99>No records. Add one, or use Settings to import.</td></tr>'}</tbody></table>`}
let CUR={t:'',c:[],r:[]};
/* Excel / PDF / CSV of the table exactly as shown (search, filter and sort applied) */
function exT(t){const n=(CUR.t||'data').replace(/\W+/g,'_').toLowerCase()+'-'+T();log('Exported '+CUR.t+' ('+t+')');
 if(t=='xlsx')return dl(n+'.xlsx',XM,xlsx(CUR.c,CUR.r));
 if(t=='csv')return dl(n+'.csv','text/csv','\ufeff'+[CUR.c,...CUR.r].map(x=>x.map(qt).join(',')).join('\r\n'));
 dl(n+'.pdf','application/pdf',pdf('Machinery Information System - '+CUR.t,new Date().toLocaleDateString()+'   |   '+CUR.r.length+' records',[{t:CUR.t,c:CUR.c,r:CUR.r}]))}
/* Full history of one machine: information, diode changing history, breakdown history, machine service rpt, timeline */
function hsec(m){const sec=(t,k)=>{const X=M[k],c=vc(X),r=db[k].filter(o=>o.machine==m.name).map(o=>({...o,...(X.calc?X.calc(o):{})}));return{t,c:c.map(f=>f[1]),r:r.map(o=>c.map(f=>o[f[0]]??''))}},mi=vc(M.machines);
 return[{t:'Machine Information',c:mi.map(f=>f[1]),r:[mi.map(f=>m[f[0]]??'')]},sec('Diode Changing History','diodes'),sec('Breakdown History','breakdowns'),sec('Machine Service Rpt','maintenance'),{t:'Machine History',c:HX.f.map(f=>f[1]),r:ev().filter(e=>e.machine==m.name).map(e=>HX.f.map(f=>e[f[0]]??''))}]}
function hx(t,m){m=m||db.machines[MI];if(!m)return;const s=hsec(m),fn='history-'+String(m.name).replace(/\W+/g,'_')+'-'+T();log('Machine history exported: '+m.name);
 if(t=='pdf')return dl(fn+'.pdf','application/pdf',pdf('Machine History - '+m.name,'Asset '+(m.asset||'-')+'   |   Serial '+(m.serial||'-')+'   |   Model '+(m.model||'-')+'   |   '+T(),s));
 dl(fn+'.xlsx',XM,xlsxN(s.map(x=>[x.t,x.c,x.r])))}
/* one-click switch for Active/Inactive and Updated/Pending */
function tg(m,i,k){if(S.role!='admin')return;const o=M[m].f.find(f=>f[0]==k)[3],r=db[m][i];r[k]=r[k]==o[0]?o[1]:o[0];log(M[m].t+' '+k+' set to '+r[k]+': '+r[M[m].f[0][0]]);save();draw()}
function openForm(m,i){if(S.role!='admin')return;if(m=='tickets')return tform(i);ED={m,i};const X=M[m],r=i>=0?db[m][i]:{};
 $('#md').innerHTML=`<div class=mb><h3>${i>=0?'Edit':'Add'} ${X.t}</h3><form onsubmit="return sv(event)"><div class=fg>${X.f.map(([k,l,t,o])=>{const v=E(r[k]);
 const inp=t=='s'?`<select name=${k}><option value="">-- Select --</option>${(o=='m'?db.machines.map(x=>x.name):o).map(x=>`<option${r[k]==x?' selected':''}>${E(x)}</option>`).join('')}</select>`:t=='a'?`<textarea name=${k} rows=2>${v}</textarea>`:`<input name=${k} value="${v}" type="${{d:'date',tm:'time',n:'number',mo:'month'}[t]||'text'}"${t=='n'?' step=any min=0':''}>`;
 return `<label>${l}${X.req.includes(k)?' *':''}${inp}</label>`}).join('')}</div><p class=er id=fe></p><button class="btn p">Save</button><button type=button class=btn onclick="cl()">Cancel</button>${i>=0&&S.role=='admin'?`<button type=button class=btn onclick="cl();del('${m}',${i})">Delete</button>`:''}</form></div>`;$('#md').className='ov'}
const cl=()=>{$('#md').className='';$('#md').innerHTML=''};
function sv(e){e.preventDefault();const {m,i}=ED,X=M[m],fd=new FormData(e.target),o={},er=t=>{$('#fe').textContent=t;return false};
 X.f.forEach(f=>o[f[0]]=(fd.get(f[0])||'').trim());
 for(const k of X.req)if(!o[k])return er('Required: '+X.f.find(f=>f[0]==k)[1]);
 for(const f of X.f)if(f[2]=='n'&&o[f[0]]!==''&&!(+o[f[0]]>=0))return er(f[1]+' must be a number, 0 or more.');
 if(m=='maintenance'){if(!o.month&&o.date)o.month=o.date.slice(0,7);if(o.month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(o.month))return er('Month must look like 2026-09.')}
 if(X.u&&db[m].some((r,j)=>j!=i&&r[X.u]==o[X.u]))return er('This '+X.f[0][1]+' already exists.');
 if(m=='diodes'&&o.replaced&&o.replaced<o.installed)return er('Replacement date is before installation date.');
 return commit(m,i,o,X)}
function del(m,i){if(S.role!='admin'||!confirm('Delete this record?'))return;log('Deleted '+M[m].t+' record: '+db[m][i][M[m].f[0][0]]);db[m].splice(i,1);save();render()}

/* ===== Ticketing: raise a problem ticket per machine -> shows on the dashboard -> when Completed it is added to the Breakdown report
   automatically and the spare parts used are deducted from the spare-parts stock (once, at completion). ===== */
let TP=[];
const tno=()=>'T-'+String(Math.max(0,...db.tickets.map(t=>+String(t.no).replace(/\D/g,'')||0))+1).padStart(4,'0');
const tkd=ot=>`<div class=cd style="margin-bottom:14px"><b>Open Tickets (${ot.length})</b>${S&&S.role=='admin'?` <button class="btn p np" onclick="go('tickets');tform(-1)">+ Raise Ticket</button>`:''}<div class=tw>${ot.length?`<table style="min-width:700px"><thead><tr><th>Ticket No<th>Machine<th>Problem<th>Date Problem Occurred<th>Priority<th>Status</tr></thead><tbody>${[...ot].sort((a,b)=>a.date<b.date?1:-1).map(t=>`<tr><td>${S&&S.role=='admin'?`<button class=btn style="border:0;background:none;color:var(--ac);padding:0" onclick="tform(${db.tickets.indexOf(t)})">${E(t.no)}</button>`:E(t.no)}<td>${E(t.machine)}<td>${E(t.problem)}<td>${E(t.date)}<td>${cell('priority',t.priority)}<td>${cell('status',t.status)}`).join('')}</tbody></table>`:'<p class=mu>No open tickets.</p>'}</div></div>`;
function tpDraw(){const e=$('#tp');if(e)e.innerHTML=TP.map((x,k)=>`<div class=fg style="margin:6px 0;align-items:end"><label>Spare Part<select onchange="TP[${k}].no=this.value"><option value="">-- Select --</option>${db.parts.map(p=>`<option value="${E(p.no)}"${p.no==x.no?' selected':''}>${E(p.no)} - ${E(p.name)} (in stock: ${E(p.qty)})</option>`).join('')}</select></label><label>Quantity Used<input type=number min=1 step=1 value="${E(x.qty)}" onchange="TP[${k}].qty=this.value"></label><button type=button class=btn onclick="TP.splice(${k},1);tpDraw()">Remove</button></div>`).join('')||'<p class=mu>No parts used.</p>'}
function tform(i){if(S.role!='admin')return;const r=i>=0?db.tickets[i]:{},X=M.tickets;
 if(r.status=='Completed'){$('#md').innerHTML=`<div class=mb><h3>Ticket ${E(r.no)} (Completed, locked)</h3><div class=tw>${tb(['Field','Value'],X.f.map(f=>[f[1],r[f[0]]]))}</div><p class=mu>Completed tickets are locked because stock was already deducted and the breakdown report entry was created.</p><button class="btn p" onclick="cl()">Close</button></div>`;$('#md').className='ov';return}
 ED={m:'tickets',i};TP=(r.pl||[]).map(x=>({...x}));
 const v=k=>E(r[k]??''),sel=(k,o,d)=>`<select name=${k}>${o.map(x=>`<option${(r[k]||d)==x?' selected':''}>${x}</option>`).join('')}</select>`;
 $('#md').innerHTML=`<div class=mb><h3>${i>=0?'Update Ticket '+E(r.no):'Raise Ticket'}</h3><form onsubmit="return tsv(event)"><div class=fg><label>Machine *<select name=machine><option value="">-- Select --</option>${db.machines.map(x=>`<option${r.machine==x.name?' selected':''}>${E(x.name)}</option>`).join('')}</select></label><label>Date Problem Occurred *<input type=date name=date value="${v('date')||T()}"></label><label>Time<input type=time name=time value="${v('time')||new Date().toTimeString().slice(0,5)}"></label><label>Reported By<input name=by value="${v('by')||E(S.user)}"></label><label>Priority${sel('priority',['Low','Medium','High'],'Medium')}</label><label>Status${sel('status',['Open','In Progress','Completed'],'Open')}</label></div><label>Problem *<input name=problem value="${v('problem')}"></label><label>Description<textarea name=desc rows=2>${v('desc')}</textarea></label><h3>Repair Details</h3><div class=fg><label>Diagnosis<input name=diagnosis value="${v('diagnosis')}"></label><label>Root Cause<input name=cause value="${v('cause')}"></label><label>Corrective Action<input name=action value="${v('action')}"></label><label>Downtime (Hours)<input type=number step=any min=0 name=down value="${v('down')}"></label><label>Completion Date<input type=date name=completed value="${v('completed')}"></label></div><h3>Spare Parts Used</h3><div id=tp></div><button type=button class=btn onclick="TP.push({no:'',qty:1});tpDraw()">+ Add Part</button><p class=mu>Stock is reduced automatically when the ticket is saved as Completed. A completed ticket is added to the Breakdown report.</p><p class=er id=fe></p><button class="btn p">Save</button><button type=button class=btn onclick="cl()">Cancel</button></form></div>`;
 $('#md').className='ov';tpDraw()}
function tsv(e){e.preventDefault();const fd=new FormData(e.target),g=k=>(fd.get(k)||'').trim(),{i}=ED,old=i>=0?db.tickets[i]:null,er=t=>{$('#fe').textContent=t;return false};
 const o={no:old?old.no:tno(),machine:g('machine'),problem:g('problem'),date:g('date'),time:g('time'),by:g('by'),priority:g('priority')||'Medium',status:g('status')||'Open',desc:g('desc'),diagnosis:g('diagnosis'),cause:g('cause'),action:g('action'),down:g('down'),completed:g('completed')};
 if(!o.machine)return er('Select the machine.');if(!o.problem)return er('Enter the problem.');if(!o.date)return er('Enter the date the problem happened.');
 if(o.down!==''&&!(+o.down>=0))return er('Downtime must be a number, 0 or more.');
 const pl=[];for(const x of TP){if(!x.no&&!(+x.qty>0))continue;if(!x.no)return er('Select the spare part for each row, or remove the row.');if(!Number.isInteger(+x.qty)||+x.qty<1)return er('Part quantities must be whole numbers, 1 or more.');const h=pl.find(p=>p.no==x.no);h?h.qty+=+x.qty:pl.push({no:x.no,qty:+x.qty})}
 const done=o.status=='Completed';
 if(done){o.completed=o.completed||T();for(const p of pl){const sp=db.parts.find(s=>s.no==p.no);if(!sp)return er('Unknown spare part '+p.no);if(+sp.qty<p.qty)return er('Not enough stock for '+sp.no+' ('+sp.qty+' in stock, '+p.qty+' needed).')}}
 o.pl=pl;o.parts=pl.map(p=>p.no+' x'+p.qty).join('; ');
 if(done){pl.forEach(p=>{const sp=db.parts.find(s=>s.no==p.no);sp.qty=String(+sp.qty-p.qty);log('Spare part issued: '+p.no+' x'+p.qty+' ('+o.no+')')});
  db.breakdowns.push({machine:o.machine,date:o.date,time:o.time,problem:o.problem,by:o.by,priority:o.priority,status:'Completed',down:o.down,completed:o.completed,desc:o.desc,diagnosis:o.diagnosis,cause:o.cause,action:o.action,parts:o.parts,ticket:o.no});o.bd=1;log('Breakdown report entry added from ticket '+o.no)}
 i>=0?Object.assign(db.tickets[i],o):db.tickets.push(o);
 log((i<0?'Ticket raised: ':done?'Ticket completed: ':'Ticket updated: ')+o.no+' - '+o.machine+' - '+o.problem);cl();render();return false}

/* ===== Machine details + timeline ===== */
const ev=()=>[...db.tickets.filter(t=>t.status!='Completed').map(t=>({date:t.date,machine:t.machine,type:'Ticket ('+t.status+')',text:t.no+' '+t.problem,down:0})),...db.machines.map(m=>({date:m.installed,machine:m.name,type:'Machine Installed',text:m.type,down:0})),...db.maintenance.map(r=>({date:r.month,machine:r.machine,type:'Machine Service ('+r.service+')',text:r.type+' - '+(r.active||'Active'),down:0})),...db.breakdowns.map(r=>({date:r.date,machine:r.machine,type:'Breakdown',text:r.problem,down:+r.down||0})),...db.diodes.map(r=>({date:r.replaced||r.installed,machine:r.machine,type:r.replaced?'Diode Replaced':'Diode Installed',text:r.no,down:0}))].filter(e=>e.date).sort((a,b)=>a.date>b.date?1:-1);
function mdet(){const m=db.machines[MI];if(!m)return '<p>Machine not found.</p>';
 const t=(k,ks,ls)=>`<h3>${M[k].t}</h3><div class=tw>${tb(ls,db[k].filter(r=>r.machine==m.name).map(r=>ks.map(x=>r[x]||'')))}</div>`;
 return `<button class="btn np" onclick="go('machines')">Back to Machines</button><h2>${E(m.name)} – ${E(m.asset)}</h2><div class="tools np"><button class=btn onclick="hx('xlsx')">Excel</button><button class=btn onclick="hx('pdf')">PDF</button></div><div class="cd fg">${M.machines.f.filter(f=>!f[4]).map(f=>`<div><span class=mu>${f[1]}</span><br><b>${cell(f[0],m[f[0]])}</b></div>`).join('')}</div>`
 +t('maintenance',['month','type','active','service'],['Month','Type','Active Status','Service Status'])+t('breakdowns',['date','problem','priority','down','status'],['Date','Problem','Priority','Downtime (Hours)','Status'])+t('diodes',['no','type','installed','replaced'],['Diode Number','Type','Installed','Replaced'])
 +`<h3>Spare Parts</h3><div class=tw>${tb(['Part Number','Part Name','Quantity'],db.parts.filter(p=>p.compat==m.name).map(p=>[p.no,p.name,p.qty]))}</div><h3>Documents</h3><p>${/^https?:\/\//.test(m.doc||'')?`<a href="${E(m.doc)}" target=_blank rel=noopener>${E(m.doc)}</a>`:'No document linked. Edit the machine to add a link.'}</p><h3>Timeline</h3><div class=tl>${ev().filter(e=>e.machine==m.name).map((e,i,a)=>`<div><b>${E(e.date)} – ${E(e.type)}</b><br><span class=mu>${E(e.text)}</span>${i<a.length-1?'<br>↓':''}</div>`).join('')}</div>`}

/* ===== Reports ===== */
const RL=[['machines','Machine Report'],['maintenance','Machine Service Rpt'],['breakdowns','Breakdown History'],['tickets','Ticket Report'],['downtime','Downtime Report'],['diodes','Diode Changing History'],['parts','Spare Parts Report'],['history','Machine History']];
function rep(){const {k,a,b}=RP,inr=d=>(!a&&!b)||(d&&(!a||d>=a.slice(0,d.length))&&(!b||d<=b.slice(0,d.length)));
 if(k=='history'||k=='downtime')return{c:['Date','Machine','Event','Details','Downtime (Hours)'],r:ev().filter(x=>inr(x.date)&&(k=='history'||x.down>0)).map(x=>[x.date,x.machine,x.type,x.text,x.down])};
 const X=M[k],cl=[...X.f,...(X.c||[])];
 return{c:cl.map(f=>f[1]),r:db[k].map(r=>({...r,...(X.calc?X.calc(r):{})})).filter(r=>!X.date||inr(r[X.date]||'')).map(r=>cl.map(f=>r[f[0]]??''))}}
function repV(){return `<h2>Reports</h2><div class="tools np"><select aria-label="Report" onchange="RP.k=this.value;rd()">${RL.map(([k,l])=>`<option value=${k}${RP.k==k?' selected':''}>${l}</option>`).join('')}</select><input type=date aria-label="From" value="${RP.a}" onchange="RP.a=this.value;rd()"><input type=date aria-label="To" value="${RP.b}" onchange="RP.b=this.value;rd()"><button class=btn onclick="ex('csv')">CSV</button><button class=btn onclick="ex('csv2')">CSV (;)</button><button class=btn onclick="ex('xlsx')">Excel (.xlsx)</button><button class="btn p" onclick="ex('pdf')">PDF</button><button class=btn onclick="ex('print')">Print</button></div><div class=tw id=rp></div>`}
const rd=()=>{const x=rep();$('#rp').innerHTML=tb(x.c,x.r)};
function ex(t){const x=rep(),nm='report-'+RP.k;log('Report generated: '+RP.k);
 if(t=='print')return print();
 if(t=='pdf'){const ti=(RL.find(z=>z[0]==RP.k)||['',RP.k])[1];return dl(nm+'.pdf','application/pdf',pdf('Machinery Information System - '+ti,new Date().toLocaleDateString()+'   |   '+x.r.length+' records',[{t:ti,c:x.c,r:x.r}]))}
 if(t=='xlsx')return dl(nm+'.xlsx',XM,xlsx(x.c,x.r));
 const d=t=='csv2'?';':',';dl(nm+'.csv','text/csv','\ufeff'+(d==';'?'sep=;\r\n':'')+[x.c,...x.r].map(r=>r.map(qt).join(d)).join('\r\n'))}

function exMod(t){const k=$('#em').value,X=M[k],c=X.f.map(f=>f[1]),r=db[k].map(o=>X.f.map(f=>o[f[0]]??''));log('Exported '+X.t);
 t=='xlsx'?dl(k+'.xlsx',XM,xlsx(c,r)):dl(k+'.csv','text/csv','\ufeff'+[c,...r].map(x=>x.map(qt).join(',')).join('\r\n'))}

/* ===== Dashboard search: matching records from every module -> ONE Excel file and ONE PDF file ===== */
let GQ='';
const vc=X=>[...X.f.filter(f=>!f[4]),...(X.c||[])];
/* Machine-wise search: every word must match. Sections: machine history, diode changing history, breakdown history, machine service rpt, machines, parts. */
const HX={t:'Machine History',f:[['date','Date'],['machine','Machine'],['type','Event'],['text','Details'],['down','Downtime (Hours)']]};
function gs(){const w=GQ.toLowerCase().split(/\s+/).filter(Boolean);if(!w.length)return[];
 const hit=r=>{const s=Object.values(r).join(' ').toLowerCase();return w.every(x=>s.includes(x))},
 nm=new Set(db.machines.filter(hit).map(x=>x.name)), /* machines found by name, model, serial, asset no, location, type, diode model... */
 srt=(a,dk)=>a.sort((x,y)=>String(x.machine||x.name||'').localeCompare(String(y.machine||y.name||''))||String(x[dk]||'').localeCompare(String(y[dk]||'')));
 return[{k:'machines',X:M.machines,rows:srt(db.machines.filter(x=>nm.has(x.name)),'installed')},{k:'history',X:HX,rows:srt(ev().filter(e=>nm.has(e.machine)||hit(e)),'date')},...['tickets','diodes','breakdowns','maintenance','parts'].map(k=>{const X=M[k];return{k,X,rows:srt(db[k].map(r=>({...r,...(X.calc?X.calc(r):{})})).filter(r=>hit(r)||nm.has(r.machine||r.compat)),X.date||'date')}})].filter(s=>s.rows.length)}
function gsr(v){if(v!==undefined)GQ=v.trim();const el=$('#gr');if(!el)return;const s=gs(),n=s.reduce((a,x)=>a+x.rows.length,0);
 el.innerHTML=!GQ?'':!n?'<p class=mu>No records match.</p>':`<p><b>${n}</b> records found in ${s.length} section(s). All search words must match.</p><button class="btn p" onclick="gx('xlsx')">Excel (.xlsx)</button><button class="btn p" onclick="gx('pdf')">PDF</button><button class="btn p" onclick="gx('csv')">CSV (History)</button>`
 +s.map(x=>`<h3>${x.X.h||x.X.t} (${x.rows.length})</h3><div class=tw>${tb(vc(x.X).map(f=>f[1]),x.rows.slice(0,10).map(r=>vc(x.X).map(f=>r[f[0]]??'')))}</div>${x.rows.length>10?`<p class=mu>Showing 10 of ${x.rows.length}. The exported files contain all of them.</p>`:''}`).join('')}
function gx(t){const s=gs();if(!s.length)return;const d=new Date().toISOString().slice(0,10),n=s.reduce((a,x)=>a+x.rows.length,0),fn='search-'+(GQ.replace(/[^\w]+/g,'_').slice(0,30)||'results')+'-'+d;
 log('Search report generated: '+GQ);
 if(t=='csv'){const h=s.find(x=>x.k=='history');return h?dl(fn+'.csv','text/csv','\ufeff'+[HX.f.map(f=>f[1]),...h.rows.map(r=>HX.f.map(f=>r[f[0]]??''))].map(x=>x.map(qt).join(',')).join('\r\n')):alert('No machine history rows to export.')}
 if(t=='pdf')return dl(fn+'.pdf','application/pdf',pdf('Machinery Information System - Search Report','Search: "'+GQ+'"   |   '+d+'   |   '+n+' records',s.map(x=>({t:(x.X.h||x.X.t)+' ('+x.rows.length+')',c:vc(x.X).map(f=>f[1]),r:x.rows.map(r=>vc(x.X).map(f=>r[f[0]]??''))}))));
 dl(fn+'.xlsx',XM,xlsxN([['Summary',['Item','Value'],[['Search',GQ],['Date',d],['User',S.user],['Total Records',n],...s.map(x=>[x.X.h||x.X.t,x.rows.length])]],...s.map(x=>{const c=[...x.X.f,...(x.X.c||[])];return[x.X.h||x.X.t,c.map(f=>f[1]),x.rows.map(r=>c.map(f=>r[f[0]]??''))]})]))}
/* Excel workbook with several sheets */
function xlsxN(SH){const H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',NS='http://schemas.openxmlformats.org/',
 xe=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"]/g,ch=>'&#'+ch.charCodeAt(0)+';'),
 col=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s},
 cx=(v,i,j)=>{v=v??'';const ref=col(j)+(i+1);return /^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(String(v))?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`},
 used=new Set(),nm=SH.map(([n])=>{const b=String(n).replace(/[\[\]:*?\/\\]/g,' ').slice(0,28)||'Sheet';let u=b,k=1;while(used.has(u.toLowerCase()))u=b+' '+(++k);used.add(u.toLowerCase());return xe(u)}),
 F={'[Content_Types].xml':H+`<Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${SH.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
 '_rels/.rels':H+`<Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
 'xl/workbook.xml':H+`<workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><sheets>${nm.map((n,i)=>`<sheet name="${n}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`,
 'xl/_rels/workbook.xml.rels':H+`<Relationships xmlns="${NS}package/2006/relationships">${SH.map((_,i)=>`<Relationship Id="rId${i+1}" Type="${NS}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`};
 SH.forEach(([,c,r],i)=>F['xl/worksheets/sheet'+(i+1)+'.xml']=H+`<worksheet xmlns="${NS}spreadsheetml/2006/main"><sheetData>${[c,...r].map((y,a)=>`<row r="${a+1}">${y.map((v,b)=>cx(v,a,b)).join('')}</row>`).join('')}</sheetData></worksheet>`);
 return zip(F)}
/* Minimal PDF writer (A4 landscape, Helvetica text tables, no libraries) */
function pdf(title,sub,secs){const W=842,Hh=595,mg=30,fs=7,lh=11,esc=s=>String(s??'').replace(/[^\x20-\x7e\xa0-\xff]/g,'?').replace(/[\\()]/g,'\\$&'),pages=[];let cur,y;
 const nw=()=>{cur=[];pages.push(cur);y=Hh-mg},tx=(x,yy,s,b,z)=>cur.push(`BT /F${b?2:1} ${z||fs} Tf ${x.toFixed(1)} ${yy} Td (${esc(s)}) Tj ET`);
 nw();tx(mg,y-=14,title,1,14);tx(mg,y-=16,sub,0,9);y-=8;
 for(const s of secs){const wt=s.c.map((h,i)=>Math.min(30,Math.max(6,String(h).length,...s.r.slice(0,300).map(r=>String(r[i]??'').length)))),tw=wt.reduce((a,b)=>a+b,0),cw=wt.map(x=>(W-2*mg)*x/tw),px=cw.map((_,i)=>mg+cw.slice(0,i).reduce((a,b)=>a+b,0)),cut=(v,i)=>{v=String(v??'');const mx=Math.max(4,Math.floor(cw[i]/(fs*.55))-1);return v.length>mx?v.slice(0,mx-2)+'..':v},head=()=>{s.c.forEach((h,i)=>tx(px[i],y,cut(h,i),1));y-=lh};
  if(y<mg+lh*5)nw();tx(mg,y-=4,s.t,1,10);y-=8;head();
  for(const r of s.r){if(y<mg+lh){nw();tx(mg,y,s.t+' (continued)',1,9);y-=lh;head()}r.forEach((v,i)=>tx(px[i],y,cut(v,i)));y-=lh}
  y-=10}
 pages.forEach((p,i)=>{cur=p;tx(W/2-30,14,'Page '+(i+1)+' of '+pages.length)});
 let out='%PDF-1.4\n';const offs=[],add=(id,b)=>{offs[id]=out.length;out+=id+' 0 obj\n'+b+'\nendobj\n'};
 add(1,'<< /Type /Catalog /Pages 2 0 R >>');add(2,`<< /Type /Pages /Kids [${pages.map((_,i)=>(5+2*i)+' 0 R').join(' ')}] /Count ${pages.length} >>`);
 add(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');add(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 pages.forEach((p,i)=>{const c=p.join('\n');add(5+2*i,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${Hh}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6+2*i} 0 R >>`);add(6+2*i,`<< /Length ${c.length} >>\nstream\n${c}\nendstream`)});
 const n=5+2*pages.length,xr=out.length;
 out+=`xref\n0 ${n}\n0000000000 65535 f \n`+offs.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
 return new Blob([Uint8Array.from(out,c=>c.charCodeAt(0))],{type:'application/pdf'})}

/* ===== Users, audit log ===== */
function usersV(){if(S.role!='admin')return '<p>Administrators only.</p>';
 return `<h2>Users</h2>${S.mode=='demo'?'<p class=mu>Demo mode: accounts are not editable.</p>':`<form class="tools np" onsubmit="addU(event);return false"><input name=u placeholder="Username" required><input name=p type=password placeholder="Password (min 12)" autocomplete=new-password required><input name=t type=password placeholder="GitHub token for this person" autocomplete=off required><button class="btn p">Add User</button></form><p class=mu>Administrator = token with Read and write on both repositories. Viewer = read-only token for the data repository. Best practice: one token per person.</p><div class=tw id=ul>Loading...</div>`}<h3>Audit Log</h3><div class=tw>${tb(['User','Date / Time','Action'],db.audit.slice(0,100).map(a=>[a.u,a.t,a.a]))}</div>`}

/* ===== Settings: CSV import (validate, detect duplicates, preview, confirm), backup, restore, reset ===== */
function setV(){if(S.role!='admin')return '<p>Administrators only.</p>';
 return `<h2>Settings</h2><div class=g><div class=cd><h3>Import Existing Data (Excel / CSV)</h3><p class=mu>Accepts .xlsx and .csv (comma, semicolon or tab separated). Headings must match the field names; dates, numbers and list values are checked and converted. Existing records are never deleted.</p><select id=im>${Object.keys(M).map(k=>`<option value=${k}>${M[k].t}</option>`).join('')}</select><button class=btn onclick="tpl('xlsx')">Template (.xlsx)</button><button class=btn onclick="tpl('csv')">Template (.csv)</button><input type=file accept=".xlsx,.csv,.tsv,.txt,.xls" aria-label="Excel or CSV file" onchange="imp(this)"><div class=tw id=ip></div></div><div class=cd><h3>Export Data (Excel / CSV)</h3><select id=em>${Object.keys(M).map(k=>`<option value=${k}>${M[k].t}</option>`).join('')}</select><button class=btn onclick="exMod('xlsx')">Excel (.xlsx)</button><button class=btn onclick="exMod('csv')">CSV</button><p class=mu>Same headings the import accepts, so an export can be imported again.</p></div>${isOn()?`<div class=cd><h3>GitHub Backups</h3><p class=mu>Snapshots are stored in the private data repository (folder backups). Every change is also kept in GitHub's commit history.</p><button class="btn p" onclick="bkNow()">Create Backup Now</button><button class=btn onclick="upLocal()">Import old data found in this browser</button><div class=tw id=bk></div></div>`:''}<div class=cd><h3>Backup and Transfer</h3><button class=btn onclick="dl('mis-backup.json','application/json',JSON.stringify(db))">Export Backup</button><p><input type=file accept=.json aria-label="Backup file" onchange="rest(this)"></p><p class=mu>The backup holds all data and password hashes. Keep it private.</p><button class=btn onclick="rst()">Reset Data</button></div></div>`}
/* ---- File formats: CSV (comma/semicolon/tab, UTF-8 or ANSI), real .xlsx read + write (no libraries), old HTML-style .xls ---- */
const XM='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pad=n=>String(n).padStart(2,'0'),nk=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,''),
 ux=s=>s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi,(m,e)=>({lt:'<',gt:'>',amp:'&',quot:'"',apos:"'"}[e.toLowerCase()]??String.fromCodePoint(e[1].toLowerCase()=='x'?parseInt(e.slice(2),16):+e.slice(1)))),
 dec=b=>{try{return new TextDecoder('utf-8',{fatal:true}).decode(b)}catch(e){return new TextDecoder('windows-1252').decode(b)}},
 qt=v=>{v=String(v??'');if(/^[=+@\t\r]/.test(v)||/^-(?!\d)/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'},
 CT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})(),
 crc=u=>{let c=-1;for(const b of u)c=CT[(c^b)&255]^(c>>>8);return (c^-1)>>>0};
function zip(F){const te=new TextEncoder(),parts=[],cd=[];let off=0;
 for(const [n,s] of Object.entries(F)){const nb=te.encode(n),d=te.encode(s),c=crc(d),l=new DataView(new ArrayBuffer(30)),h=new DataView(new ArrayBuffer(46));
  l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(12,0x21,true);l.setUint32(14,c,true);l.setUint32(18,d.length,true);l.setUint32(22,d.length,true);l.setUint16(26,nb.length,true);
  h.setUint32(0,0x02014b50,true);h.setUint16(4,20,true);h.setUint16(6,20,true);h.setUint16(8,0x800,true);h.setUint16(14,0x21,true);h.setUint32(16,c,true);h.setUint32(20,d.length,true);h.setUint32(24,d.length,true);h.setUint16(28,nb.length,true);h.setUint32(42,off,true);
  parts.push(new Uint8Array(l.buffer),nb,d);cd.push(new Uint8Array(h.buffer),nb);off+=30+nb.length+d.length}
 const n=Object.keys(F).length,e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,n,true);e.setUint16(10,n,true);e.setUint32(12,cd.reduce((a,x)=>a+x.length,0),true);e.setUint32(16,off,true);
 return new Blob([...parts,...cd,new Uint8Array(e.buffer)],{type:XM})}
function xlsx(c,r){const H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',
 col=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s},
 x=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"]/g,ch=>'&#'+ch.charCodeAt(0)+';'),
 cx=(v,i,j)=>{v=v??'';const ref=col(j)+(i+1);return /^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(String(v))?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`},
 N='xmlns="http://schemas.openxmlformats.org/',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 return zip({'[Content_Types].xml':H+`<Types ${N}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
 '_rels/.rels':H+`<Relationships ${N}package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
 'xl/workbook.xml':H+`<workbook ${N}spreadsheetml/2006/main" xmlns:r="${R}"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>`,
 'xl/_rels/workbook.xml.rels':H+`<Relationships ${N}package/2006/relationships"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
 'xl/worksheets/sheet1.xml':H+`<worksheet ${N}spreadsheetml/2006/main"><sheetData>${[c,...r].map((y,i)=>`<row r="${i+1}">${y.map((v,j)=>cx(v,i,j)).join('')}</row>`).join('')}</sheetData></worksheet>`})}
async function unzip(buf){const v=new DataView(buf),u=new Uint8Array(buf);let e=u.length-22;while(e>=0&&v.getUint32(e,true)!=0x06054b50)e--;if(e<0)throw new Error('Not a valid Excel (.xlsx) file.');
 const n=v.getUint16(e+10,true),F={};let p=v.getUint32(e+16,true);
 for(let i=0;i<n;i++){const m=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),lo=v.getUint32(p+42,true),name=new TextDecoder().decode(u.subarray(p+46,p+46+nl)),
  s=lo+30+v.getUint16(lo+26,true)+v.getUint16(lo+28,true),d=u.subarray(s,s+cs);
  F[name]=async()=>m==0?d:new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());p+=46+nl+xl+cl}
 return F}
async function xread(buf){const F=await unzip(buf),tx=async n=>dec(await F[n]()),
 sn=Object.keys(F).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a,b)=>a.match(/\d+/)[0]-b.match(/\d+/)[0])[0];
 if(!sn)throw new Error('No worksheet found in this file (only Excel .xlsx workbooks are supported).');
 const tt=b=>[...b.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(x=>x[1]).join(''),
 SS=F['xl/sharedStrings.xml']?[...(await tx('xl/sharedStrings.xml')).matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)].map(m=>ux(tt(m[1]))):[],R=[],
 xml=(await tx(sn)).replace(/<(?:\w+:)?row\b[^>]*\/>/g,'');
 for(const rm of xml.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)){const row=[];
  for(const cm of rm[1].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)){const a=cm[1],ref=(a.match(/\br="([A-Z]+)/)||[])[1],ty=(a.match(/\bt="(\w+)"/)||[])[1],b=cm[2]||'';
   let j=row.length;if(ref){j=0;for(const ch of ref)j=j*26+ch.charCodeAt(0)-64;j--}
   let v=(b.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)||[])[1];if(ty=='inlineStr')v=tt(b);
   v=v==null?'':ux(v);if(ty=='s')v=SS[+v]??'';if(ty=='b')v=v=='1'?'TRUE':'FALSE';row[j]=v}
  R.push([...row].map(x=>x??''))}
 return R.filter(r=>r.some(v=>String(v).trim()))}
const htab=t=>[...t.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c=>ux(c[1].replace(/<[^>]*>/g,'')).trim())).filter(r=>r.some(Boolean));
function csv(t,d=','){const R=[];let r=[],c='',q=0;for(let i=0;i<t.length;i++){const h=t[i];if(q){if(h=='"'){if(t[i+1]=='"'){c+='"';i++}else q=0}else c+=h}else if(h=='"'&&!c)q=1;else if(h==d){r.push(c);c=''}else if(h=='\n'||h=='\r'){if(h=='\r'&&t[i+1]=='\n')i++;r.push(c);c='';R.push(r);r=[]}else c+=h}if(c||r.length){r.push(c);R.push(r)}return R.filter(x=>x.some(v=>v.trim()))}
async function readTable(fl){const b=await fl.arrayBuffer(),u=new Uint8Array(b);
 if(u[0]==0x50&&u[1]==0x4b)return xread(b);
 if(u[0]==0xD0&&u[1]==0xCF)throw new Error('Old binary .xls files cannot be read. In Excel choose Save As > Excel Workbook (.xlsx) or CSV.');
 const t=dec(u).replace(/^\ufeff/,'');if(/^\s*<(\?xml|html|table|!doctype)/i.test(t))return htab(t);
 const m=t.match(/^sep=(.)\r?\n/i),l=t.split(/\r?\n/)[0],d=m?m[1]:[',',';','\t'].map(x=>[x,l.split(x).length]).sort((a,b)=>b[1]-a[1])[0][0];
 return csv(m?t.slice(m[0].length):t,d)}
/* ---- Value checks: dates (ISO, d/m/y, Excel serial), times, numbers (1,234.50 or 1.234,50), fixed lists ---- */
function iso(v){let y,m,d,x;
 if(x=v.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)){y=+x[1];m=+x[2];d=+x[3]}
 else if(x=v.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/)){y=+x[3];if(y<100)y+=2000;const a=+x[1],b=+x[2];if(b>12&&a<=12){m=a;d=b}else{d=a;m=b}}
 else if(/^\d{5}(\.\d+)?$/.test(v)&&v>10000&&v<80000){const t=new Date(Date.UTC(1899,11,30)+Math.floor(v)*864e5);y=t.getUTCFullYear();m=t.getUTCMonth()+1;d=t.getUTCDate()}
 else{const t=new Date(v);if(isNaN(t))return null;y=t.getFullYear();m=t.getMonth()+1;d=t.getDate()}
 const c=new Date(Date.UTC(y,m-1,d));return c.getUTCFullYear()==y&&c.getUTCMonth()==m-1&&c.getUTCDate()==d?`${y}-${pad(m)}-${pad(d)}`:null}
function mon(v){let x;const MN=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 if(x=v.match(/^(\d{4})[-\/.](\d{1,2})$/))return +x[2]>=1&&+x[2]<=12?x[1]+'-'+pad(x[2]):null;
 if(x=v.match(/^(\d{1,2})[-\/.](\d{4})$/))return +x[1]>=1&&+x[1]<=12?x[2]+'-'+pad(x[1]):null;
 if(x=v.match(/^([a-z]{3})[a-z]*[\s.,-]+(\d{2,4})$/i)){const i=MN.indexOf(x[1].toLowerCase());if(i<0)return null;let y=+x[2];if(y<100)y+=2000;return y+'-'+pad(i+1)}
 const d=iso(v);return d?d.slice(0,7):null}
function tim(v){let x;if(x=v.match(/(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*([ap]m)?\s*$/i)){let h=+x[1];const p=(x[3]||'').toLowerCase();if(p=='pm'&&h<12)h+=12;if(p=='am'&&h==12)h=0;return h<24&&+x[2]<60?pad(h)+':'+x[2]:null}
 if(/^\d+(\.\d+)?$/.test(v)){const n=Math.round(v%1*1440)%1440;return pad(Math.floor(n/60))+':'+pad(n%60)}return null}
function mon(v){v=String(v).trim();let x;if(/^\d{4}-(0[1-9]|1[0-2])$/.test(v))return v;
 if(x=v.match(/^(\d{1,2})[\/.-](\d{4})$/))return +x[1]>=1&&+x[1]<=12?x[2]+'-'+pad(x[1]):null;
 if(x=v.match(/^([A-Za-z]{3,9})[\s\-.,\/]*(\d{2,4})$/)){const i='jan feb mar apr may jun jul aug sep oct nov dec'.split(' ').indexOf(x[1].slice(0,3).toLowerCase());let y=+x[2];if(i<0)return null;if(y<100)y+=2000;return y+'-'+pad(i+1)}
 const r=iso(v);return r?r.slice(0,7):null}
function norm(f,v){v=String(v??'').trim();if(v==='')return[''];const t=f[2],o=f[3];
 if(t=='d'){const r=iso(v);return r?[r]:[v,'invalid date']}
 if(t=='tm'){const r=tim(v);return r?[r]:[v,'invalid time']}
 if(t=='mo'){const r=mon(v);return r?[r]:[v,'invalid month (use 2026-03)']}
 if(t=='mo'){const r=mon(v);return r?[r]:[v,'invalid month (use 2026-09 or Sep 2026)']}
 if(t=='n'){let s=v.replace(/[^\d.,\-eE+]/g,'');
  if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  else if(s.includes(','))s=/^-?\d{1,3}(,\d{3})+$/.test(s)?s.replace(/,/g,''):s.replace(',','.');
  return s!==''&&isFinite(s)&&+s>=0?[String(+s)]:[v,'not a valid number']}
 if(t=='s'&&o!='m'){const r=o.find(x=>x.toLowerCase()==v.toLowerCase());return r?[r]:[v,'must be '+o.join(' / ')]}
 return[v]}
/* ---- Import: read, map headings, validate, detect duplicates, preview, confirm ---- */
async function imp(inp){const fl=inp.files[0];if(!fl)return;const m=$('#im').value,X=M[m],P=$('#ip');
 try{const R=await readTable(fl),hd=R.shift()||[],H=hd.map(h=>{const k=nk(h)=='maintenancetype'?'type':nk(h),f=X.f.find(f=>nk(f[1])==k||nk(f[1].replace(/\(.*\)/,''))==k||f[0]==String(h).trim().toLowerCase());return f&&k?f[0]:null});
  IM={m,rows:[]};const seen=[...db[m]];
  R.forEach(r=>{const o={},er=[];
   X.f.forEach(f=>{const i=H.indexOf(f[0]),[v,e]=norm(f,i<0?'':r[i]);o[f[0]]=v;if(e)er.push(f[1]+' "'+v+'" '+e)});
   if(m=='maintenance'){if(!o.month&&o.date)o.month=o.date.slice(0,7);o.active=o.active||'Active';o.service=o.service||(o.status=='Completed'?'Updated':'Pending')}
   const miss=X.req.find(k=>!o[k]);if(miss&&!er.length)er.push('missing '+X.f.find(f=>f[0]==miss)[1]);
   const dup=!er.length&&seen.some(e=>X.u?e[X.u]==o[X.u]:X.f.every(f=>String(e[f[0]]??'')==o[f[0]])),st=er.length?'Error: '+er.join('; '):dup?'Duplicate':'New';
   if(st=='New')seen.push(o);IM.rows.push({o,st})});
  const n=s=>IM.rows.filter(x=>x.st.startsWith(s)).length,pf=X.f.slice(0,3),ig=hd.filter((h,i)=>!H[i]&&String(h).trim());
  P.innerHTML=`<p class=mu>${E(fl.name)}: ${R.length} rows, ${H.filter(Boolean).length} of ${hd.length} columns recognised${ig.length?'. Ignored: '+E(ig.join(', ')):''}.</p>`+(H.some(Boolean)?'':'<p class=er>No column headings match. Download a template to see the expected headings.</p>')+tb(['Row','Status',...pf.map(f=>f[1])],IM.rows.slice(0,50).map((x,i)=>[i+1,x.st,...pf.map(f=>x.o[f[0]])]))+`<p>${n('New')} new, ${n('Dup')} duplicate, ${n('Err')} with errors (first 50 shown). Only new rows are imported.</p>`+(n('New')?'<button class="btn p" onclick="okImp()">Confirm Import</button>':'')
 }catch(e){IM=null;P.innerHTML='<p class=er>'+E(e.message||'This file could not be read.')+'</p>'}}
function tpl(t){const k=$('#im').value,c=M[k].f.map(f=>f[1]);t=='xlsx'?dl('template-'+k+'.xlsx',XM,xlsx(c,[])):dl('template-'+k+'.csv','text/csv','\ufeff'+c.map(qt).join(',')+'\r\n')}
function okImp(){if(S.role!='admin')return;const n=IM.rows.filter(x=>x.st=='New').map(x=>x.o);db[IM.m].push(...n);log('Imported '+n.length+' '+M[IM.m].t+' records');alert(n.length+' records imported.');render()}
function rest(inp){if(S.role!='admin')return;const fl=inp.files[0];if(!fl)return;const fr=new FileReader();fr.onload=()=>{try{const j=JSON.parse(fr.result);if(!Array.isArray(j.machines))throw 0;if(!confirm('Replace ALL current data with this backup?'))return;db=mig(Object.assign(emp(),j));log('Backup restored');render()}catch(e){alert('Not a valid backup file.')}};fr.readAsText(fl)}
function rst(){if(S.role!='admin'||!confirm('Delete ALL records? A copy stays in GitHub history. Create a backup first.'))return;db=S.mode=='demo'?seed():Object.assign(emp(),{audit:db.audit});log('All data reset');save();render()}

render();
