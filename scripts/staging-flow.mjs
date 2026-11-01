// Explicit opt-in: creates data ONLY in an owner-approved isolated staging project.
import assert from 'node:assert/strict';
import { samplePdf } from './sample-pdf.mjs';
const names=['STAGING_FRONTEND_URL','STAGING_SUPABASE_URL','STAGING_SUPABASE_ANON_KEY','STAGING_NEW_ACCOUNT_TOKEN','STAGING_MEMBER_TOKEN','STAGING_OUTSIDER_TOKEN'];
for(const name of names)if(!process.env[name])throw new Error(`BLOCKED: ${name} required`);
if(process.env.STAGING_ALLOW_TEST_MUTATIONS!=='true')throw new Error('BLOCKED: STAGING_ALLOW_TEST_MUTATIONS=true requires an approved disposable staging environment.');
const front=new URL(process.env.STAGING_FRONTEND_URL), database=new URL(process.env.STAGING_SUPABASE_URL);
for(const url of [front,database])if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Use approved HTTPS staging origins.');
if(front.hostname==='tuydui.vercel.app')throw new Error('Production origin is forbidden.');
if(database.hostname.split('.')[0]!==process.env.STAGING_SUPABASE_PROJECT_REF)throw new Error('Explicit staging project reference must match database hostname.');
const owner=process.env.STAGING_NEW_ACCOUNT_TOKEN, member=process.env.STAGING_MEMBER_TOKEN, outsider=process.env.STAGING_OUTSIDER_TOKEN;
async function db(path,token,method='GET',body){
  return fetch(database.origin+path,{method,headers:{apikey:process.env.STAGING_SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json',Prefer:'return=representation'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30_000)});
}
async function rpc(name,body,token=owner){const r=await db('/rest/v1/rpc/'+name,token,'POST',body);return{status:r.status,data:await r.json()};}
async function api(path,token,method='GET',body){return fetch(front.origin+path,{method,headers:{Authorization:`Bearer ${token}`,...(body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(270_000)});}
const users=await Promise.all([owner,member,outsider].map(async token=>{const r=await db('/auth/v1/user',token);assert.equal(r.status,200);return(await r.json()).id;}));
assert.equal(new Set(users).size,3,'Three distinct dedicated test users are required');
const before=await db(`/rest/v1/projects?owner_id=eq.${users[0]}&select=id`,owner);assert.equal(before.status,200);
assert.deepEqual(await before.json(),[],'Creation test account must start with zero owned projects; no automatic deletion is performed');
const input={project_name:'Staging acceptance '+new Date().toISOString(),project_client_name:'Dedicated QA account',project_description:'Authorized staging integration test'};
const creates=await Promise.all([rpc('create_project_with_free_limit',input),rpc('create_project_with_free_limit',input)]);
const success=creates.filter(r=>r.status===200);assert.equal(success.length,1,'Concurrent creation must allow exactly one');
const project=(Array.isArray(success[0].data)?success[0].data[0]:success[0].data);const projectId=project.id;
assert.ok(projectId);assert.notEqual((await rpc('create_project_with_free_limit',input)).status,200);
assert.notEqual((await db('/rest/v1/projects',owner,'POST',{owner_id:users[0],name:'Bypass',client_name:'QA'})).status,201);
assert.equal((await api(`/api/workspace?projectId=${projectId}`,outsider)).status,403);
const form=new FormData();form.set('projectId',projectId);form.set('file',new File([samplePdf()],'approved-qa-brief.pdf',{type:'application/pdf'}));
const uploaded=await api('/api/documents',owner,'POST',form);assert.equal(uploaded.status,200,'Live PDF/provider processing must succeed');
const extracted=await uploaded.json();assert.ok(extracted.document?.id&&Array.isArray(extracted.data)&&extracted.data.length>0);
assert.ok(extracted.data[0].evidence?.[0]?.quote,'Real source references are required');
const mapResponse=await api('/api/ai',owner,'POST',{task:'suggest_project_structure',projectId,requirements:extracted.data,members:[]});assert.equal(mapResponse.status,200);
const map=await mapResponse.json();assert.ok(Array.isArray(map.data)&&map.data.length>0);
const snapshot={nodes:[{id:'root',title:project.name,kind:'project',owner:'QA owner',requirements:extracted.data.length,x:0,y:0,requirementIds:extracted.data.map(r=>r.id)},...map.data.map((n,i)=>({id:n.tempId,title:n.title,kind:'work_area',owner:'Unassigned',requirements:n.requirementIds.length,requirementIds:n.requirementIds,x:i*240,y:200,summary:n.summary}))],edges:map.data.map(n=>({id:'e-'+n.tempId,from:n.parentTempId||'root',to:n.tempId})),requirements:extracted.data.map(r=>({id:r.id,title:r.title,description:r.description,area:r.category,owner:'Unassigned',source:extracted.document.name,status:'Review',documentId:extracted.document.id,quote:r.evidence[0].quote})),changes:[],history:['Live QA baseline'],documents:[extracted.document],nodeNotes:{root:'Shared persistence check'},zoom:1,pan:{x:0,y:0},baselineConfirmed:true};
const saved=await api('/api/workspace',owner,'PUT',{projectId,revision:0,snapshot});assert.equal(saved.status,200);const revision=(await saved.json()).revision;
const loaded=await api(`/api/workspace?projectId=${projectId}`,owner);assert.equal(loaded.status,200);assert.deepEqual((await loaded.json()).snapshot,snapshot);
assert.equal((await api('/api/workspace',owner,'PUT',{projectId,revision:0,snapshot})).status,409);
const baseline=await db(`/rest/v1/baseline_snapshots?project_id=eq.${projectId}&select=id`,owner);assert.equal(baseline.status,200);assert.equal((await baseline.json()).length,1);
const review=await api('/api/changes',owner,'POST',{projectId,text:'The client also requests password reset.',requirements:extracted.data,nodes:snapshot.nodes,members:[]});assert.equal(review.status,200);assert.ok((await review.json()).data?.classification);
const code=crypto.randomUUID();
const invite=await db('/rest/v1/project_invites',owner,'POST',{project_id:projectId,invite_code:code,role:'editor',created_by:users[0],max_uses:1});assert.equal(invite.status,201);
assert.equal((await rpc('accept_project_invite',{invite_code_input:code},member)).status,200);
assert.equal((await api('/api/workspace',member,'PUT',{projectId,revision,snapshot:{...snapshot,history:[...snapshot.history,'Editor save']}})).status,200);
assert.notEqual((await rpc('accept_project_invite',{invite_code_input:code},outsider)).status,200);
const downgrade=await db(`/rest/v1/project_members?project_id=eq.${projectId}&user_id=eq.${users[1]}`,owner,'PATCH',{role:'viewer'});assert.equal(downgrade.status,200);
assert.equal((await api(`/api/workspace?projectId=${projectId}`,member)).status,200);
assert.equal((await api('/api/workspace',member,'PUT',{projectId,revision:revision+1,snapshot})).status,403);
console.log(`PASS: live create/concurrent quota/direct bypass, PDF/provider/map, workspace/baseline/change review, invite/editor/viewer/cross-project checks. Dedicated QA project retained for evidence: ${projectId}. No data was automatically deleted.`);
