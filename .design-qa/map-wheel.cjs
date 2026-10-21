const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/Zen/AppData/Local/npm-cache/_npx/705bc6b22212b352/node_modules/playwright');
require('@next/env').loadEnvConfig(process.cwd());
const base = process.env.DESIGN_QA_URL || 'http://localhost:3001';
const sb = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
const storageKey = 'sb-' + sb.hostname.split('.')[0] + '-auth-token';
const userId = '00000000-0000-4000-8000-000000000001';
const projectId = '00000000-0000-4000-8000-000000000010';
const sharedId = '00000000-0000-4000-8000-000000000020';
const user = {id:userId,aud:'authenticated',role:'authenticated',email:'demo@example.test',user_metadata:{full_name:'Demo Team'},app_metadata:{provider:'google'},created_at:'2026-10-01T00:00:00Z'};
const token = [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:userId,role:'authenticated',aud:'authenticated',exp:2200000000})).toString('base64url'),'fixture-signature'].join('.');
const session = {access_token:token,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:2200000000,user};
const projects = [
 {id:projectId,owner_id:userId,name:'เว็บไซต์ Northstar Coffee',client_name:'Northstar Studio',description:'เว็บไซต์ร้านกาแฟ พร้อมรายการสินค้าและช่องทางติดต่อ',baseline_confirmed_at:null,created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-05T04:00:00Z'},
 {id:'00000000-0000-4000-8000-000000000011',owner_id:userId,name:'ระบบจองห้องประชุม',client_name:'Orbit Co.',description:'จัดการห้องประชุมและตารางการจองสำหรับทีม',baseline_confirmed_at:'2026-10-04T00:00:00Z',created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-04T04:00:00Z'},
 {id:sharedId,owner_id:'00000000-0000-4000-8000-000000000002',name:'Brand refresh',client_name:'Sunday Agency',description:'ปรับภาพลักษณ์และหน้าเว็บไซต์ของแบรนด์',baseline_confirmed_at:null,created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-03T04:00:00Z'}
];
const requirements = [{id:'REQ-001',title:'หน้าแนะนำร้านและสินค้า',description:'แสดงข้อมูลร้าน เมนูเครื่องดื่ม และรูปภาพ',area:'Website',owner:'Pee · Frontend',source:'brief.pdf · V1 · p.1',status:'Clear',quote:'หน้าเว็บไซต์ต้องแสดงเมนูและรูปภาพ'}, {id:'REQ-002',title:'ฟอร์มติดต่อร้าน',description:'ช่องทางให้ลูกค้าส่งข้อความถึงร้าน',area:'Website',owner:'Unassigned',source:'brief.pdf · V1 · p.2',status:'Review'}];
const snapshot = {nodes:[{id:'root',title:projects[0].name,kind:'project',owner:'Demo Team',x:350,y:40,requirements:2,requirementIds:['REQ-001','REQ-002'],summary:'เว็บไซต์ร้านกาแฟ'}, {id:'design',title:'ออกแบบหน้าร้าน',kind:'work_area',owner:'Arm · Design',x:130,y:235,requirements:1,requirementIds:['REQ-001'],summary:'วางภาพลักษณ์และออกแบบหน้าหลัก'}, {id:'website',title:'พัฒนาเว็บไซต์',kind:'work_area',owner:'Pee · Frontend',x:580,y:235,requirements:2,requirementIds:['REQ-001','REQ-002'],summary:'รายการสินค้าและฟอร์มติดต่อ'}],edges:[{id:'e-design',from:'root',to:'design'},{id:'e-website',from:'root',to:'website'}],requirements,changes:[{id:'change-1',title:'เพิ่มระบบสั่งซื้อออนไลน์',type:'NEW SCOPE',detail:'ลูกค้าขอให้สั่งซื้อและจ่ายเงินผ่านเว็บไซต์ได้',decision:'Pending',explanation:'บรีฟเดิมมีรายการสินค้าและฟอร์มติดต่อ ยังไม่รวมระบบสั่งซื้อ',confidence:'medium'}],history:['Project created · 2026-10-01T00:00:00Z','V1 brief stored · 2026-10-02T00:00:00Z'],nodeNotes:{design:'ยึดสีและภาพจากแบรนด์เดิม'},documents:[{id:'doc-1',name:'Northstar brief.pdf',version:1,pageCount:2,uploadedAt:'2026-10-02T00:00:00Z'}],briefProposals:[]};
const record = {project_id:projectId,snapshot,approved_scope:null,version:1,updated_at:'2026-10-05T04:00:00Z'};
const profiles = [{user_id:userId,nickname:'Demo Team',display_name:'Demo Team',avatar_url:''},{user_id:projects[2].owner_id,nickname:'Sunday',display_name:'Sunday',avatar_url:''}];
const member = {id:'member-1',user_id:userId,project_id:sharedId,role:'viewer',invited_at:'2026-10-02T00:00:00Z',accepted_at:'2026-10-02T00:00:00Z'};
const writes = []; const errors = []; const unhandled = []; let failSave = false;
const extracted = [{id:'R-3',title:'แผนที่ร้าน',description:'แสดงแผนที่และเวลาเปิดร้าน',category:'Website',clarity:'clear',suggestedRoles:['Frontend'],evidence:[{page:1,quote:'เพิ่มแผนที่ร้าน'}]}];
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function scope() {return {nodes:clone(record.snapshot.nodes),edges:clone(record.snapshot.edges),requirements:clone(record.snapshot.requirements)};}
async function respond(route, data, status=200) { await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)}); }
async function setup(context, authenticated=true) {
 if (authenticated) await context.addInitScript(({key,data,origin})=>{if(location.origin===origin)localStorage.setItem(key,JSON.stringify(data));},{key:storageKey,data:session,origin:new URL(base).origin});
 await context.route(url=>url.hostname===sb.hostname,async route=>{
  const request=route.request(); const url=new URL(request.url()); const endpoint=url.pathname; const method=request.method(); const accept=request.headers().accept || '';
  if (endpoint==='/auth/v1/user') return respond(route,user);
  if (endpoint==='/auth/v1/logout') return respond(route,{});
  if (endpoint==='/rest/v1/projects') {
   if (method==='POST') {const data=request.postDataJSON();writes.push({endpoint,body:data});const created={...projects[0],...data,id:'00000000-0000-4000-8000-000000000012'};projects.push(created);return respond(route,created,201);}
   let rows=projects;
   if (url.searchParams.has('id')) rows=rows.filter(row=>row.id===url.searchParams.get('id').replace('eq.',''));
   if (url.searchParams.has('owner_id')) rows=rows.filter(row=>row.owner_id===userId);
   return respond(route,accept.includes('object')?(rows[0] || null):rows);
  }
  if (endpoint==='/rest/v1/profiles') {
   if (method==='POST') {const data=request.postDataJSON();writes.push({endpoint,body:data});profiles[0]={...profiles[0],...data};return respond(route,[]);}
   let rows=profiles;const id=url.searchParams.get('user_id');if(id?.startsWith('eq.'))rows=rows.filter(row=>row.user_id===id.slice(3));
   return respond(route,accept.includes('object')?(rows[0] || null):rows);
  }
  if (endpoint==='/rest/v1/project_members') {
   if(url.searchParams.get('select')?.includes('projects'))return respond(route,[{project_id:sharedId,projects:projects[2]}]);
   const id=url.searchParams.get('project_id');const rows=id==='eq.'+sharedId?[member]:[];
   return respond(route,accept.includes('object')?(rows[0]||null):rows);
  }
  if (endpoint==='/rest/v1/project_workspaces') return respond(route,accept.includes('object')?record:[record]);
  if (endpoint==='/rest/v1/project_invites') {
   if(method==='POST'){const data=request.postDataJSON();writes.push({endpoint,body:data});return respond(route,{...data,id:'invite-1',expires_at:'2026-10-12T00:00:00Z',use_count:0,created_at:'2026-10-05T00:00:00Z',max_uses:null},201);}
   return respond(route,[]);
  }
  if(endpoint==='/rest/v1/rpc/save_project_workspace'){
   const data=request.postDataJSON();writes.push({endpoint,body:data});
   if(failSave)return respond(route,{code:'XX000',message:'Simulated save failure'},500);
   record.snapshot=data.snapshot_input;record.version++;return respond(route,record);
  }
  if(endpoint==='/rest/v1/rpc/confirm_project_baseline'){writes.push({endpoint,body:request.postDataJSON()});record.approved_scope=scope();record.version++;return respond(route,record);}
  if(endpoint==='/rest/v1/rpc/approve_project_change'){const data=request.postDataJSON();writes.push({endpoint,body:data});record.snapshot=data.snapshot_input;record.approved_scope=data.scope_input;record.version++;return respond(route,record);}
  if(endpoint==='/rest/v1/rpc/lookup_invite')return respond(route,[{id:'invite-1',project_id:projectId,role:'viewer',project_name:projects[0].name,expires_at:'2026-10-12T00:00:00Z',use_count:0,max_uses:null}]);
  if(endpoint==='/rest/v1/rpc/accept_project_invite'){writes.push({endpoint,body:request.postDataJSON()});return respond(route,projectId);}
  unhandled.push(endpoint);return respond(route,{error:'Unhandled fixture'},500);
 });
 await context.route('**/api/**',async route=>{
  const request=route.request();const endpoint=new URL(request.url()).pathname;
  assert.equal(request.headers().authorization,'Bearer '+token);
  writes.push({endpoint,body:request.postData()});
  if(endpoint==='/api/ai') {const data=request.postDataJSON();if(data.task==='extract_requirements')return respond(route,{data:extracted});if(data.task==='suggest_project_structure')return respond(route,{data:[{tempId:'new-map',title:'เว็บไซต์และแผนที่ร้าน',category:'Website',summary:'รวมรายการงานที่ยอมรับ',requirementIds:data.requirements.map(row=>row.id),suggestedRole:'Frontend',suggestedMemberId:'pee'}]});}
  if(endpoint==='/api/documents')return respond(route,{document:{id:'doc-2',name:'updated-brief.pdf',version:2,pageCount:1,uploadedAt:'2026-10-05T00:00:00Z'},data:extracted});
  if(endpoint==='/api/changes')return respond(route,{workspaceVersion:record.version,data:{classification:'new_scope',magnitude:'small',summary:'เพิ่มหน้าแผนที่ร้าน',explanation:'เพิ่มหน้าที่ยังไม่อยู่ในขอบเขตเดิม',clientMessage:'งานนี้เพิ่มเติมจากขอบเขตที่ตกลงไว้',edits:[{action:'add',parentId:'root',title:'แผนที่ร้านเพิ่มเติม',summary:'แสดงพิกัดและเวลาเปิดร้าน'}]}});
  unhandled.push(endpoint);return respond(route,{error:'Unhandled fixture'},500);
 });
 context.on('page', page=>page.on('pageerror',error=>errors.push(error.message)));
}
async function shot(page,name) { await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:path.join('.design-qa',name+'.png'),fullPage:true}); }
async function noOverflow(page) {assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'page overflow: '+page.url());}
async function tab(page,label) {await page.getByRole('navigation',{name:'Project navigation'}).getByRole('button',{name:label,exact:false}).click();}
async function eventually(predicate,label) {const deadline=Date.now()+10000;while(Date.now()<deadline){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out: '+label);}

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:850}});await setup(context);const page=await context.newPage();
 const warnings=[];page.on('console',message=>{if(message.type()==='error')warnings.push(message.text());});
 await page.goto(base+'/workspace/'+projectId);await page.getByRole('heading',{name:'Project overview'}).waitFor();
 async function wheelInside(label,deltaX=0,deltaY=120,onNode=false){
  await page.evaluate(()=>window.scrollTo(0,0));
  const target=onNode?page.locator('.map-node').first():page.locator('.map-viewport');
  await target.scrollIntoViewIfNeeded();
  const box=await target.boundingBox();
  await page.mouse.move(box.x+Math.min(box.width/2,100),Math.min(box.y+box.height/2,700));
  const before=await page.evaluate(()=>window.scrollY);const transform=await page.locator('.map-world').getAttribute('style');
  await page.mouse.wheel(deltaX,deltaY);await page.waitForTimeout(350);
  const after=await page.evaluate(()=>window.scrollY);const transformed=await page.locator('.map-world').getAttribute('style');
  console.log(JSON.stringify({label,before,after,mapChanged:transform!==transformed}));
  assert.equal(after,before,label+': wheel inside map scrolled page');
  if(deltaY!==0&&label!=='at zoom limit')assert.notEqual(transformed,transform,label+': map zoom did not respond');
 }
 await tab(page,'Project Map');await wheelInside('first map mount');
 await wheelInside('wheel over node',0,-120,true);
 await wheelInside('horizontal wheel',120,0);
 await tab(page,'Overview');await tab(page,'Project Map');await wheelInside('after changing tabs');
 for(let i=0;i<15;i++)await page.getByRole('button',{name:'Zoom in'}).click();
 await wheelInside('at zoom limit',0,-120);
 await page.evaluate(()=>window.scrollTo(0,0));const header=await page.locator('.workspace-project-header').boundingBox();await page.mouse.move(header.x+60,header.y+20);await page.mouse.wheel(0,240);await page.waitForTimeout(350);assert((await page.evaluate(()=>window.scrollY))>0,'wheel outside map must scroll page');
 await page.setViewportSize({width:390,height:844});await tab(page,'Overview');await tab(page,'Project Map');await wheelInside('mobile sized map');
 await tab(page,'Requirements');await page.evaluate(()=>window.scrollTo(0,0));await page.mouse.move(190,600);await page.mouse.wheel(0,240);await page.waitForTimeout(350);assert((await page.evaluate(()=>window.scrollY))>0,'other tabs must scroll normally');
 assert.deepEqual(errors,[]);assert.equal(warnings.filter(message=>/passive event listener|preventDefault/i.test(message)).length,0,'passive wheel warning');
 console.log(JSON.stringify({passed:true,checks:['first mount','wheel over node','horizontal wheel','map remount','zoom limit','outside map scrolling','mobile size','other tab scrolling'],dataWrites:writes.length,realAiCalls:0}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
