// Local contract fixtures only. Never used by application startup or deployments.
import { createServer } from 'node:http';
import { createApiServer } from '../backend/dist/http.js';
const userId='11111111-1111-4111-8111-111111111111';
const projectId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const project={id:projectId,owner_id:userId,name:'Contract test project',client_name:'Test client',description:'',baseline_confirmed_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
let snapshot=null, revision=0, documentVersion=0, hasProject=true;
const send=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
const fixture = createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3100');
  res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept-profile,content-profile,x-retry-count');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const url=new URL(req.url,'http://localhost');
  let raw=''; for await(const chunk of req)raw+=chunk;
  let body; try{body=raw?JSON.parse(raw):{};}catch{body={};}
  if(url.pathname==='/__test/reset') { snapshot=null;revision=0;documentVersion=0;hasProject=body.empty!==true;project.baseline_confirmed_at=null;return send(res,{ok:true}); }
  if(url.pathname==='/auth/v1/user')return send(res,{id:userId,email:'contract@example.test',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Contract tester'}});
  if(url.pathname==='/auth/v1/logout')return send(res,{});
  if(url.pathname==='/rest/v1/rpc/can_edit_project'||url.pathname==='/rest/v1/rpc/is_project_member')return send(res,body.project_uuid===projectId);
  if(url.pathname==='/rest/v1/rpc/reserve_ai_request')return send(res,{allowed:true});
  if(url.pathname==='/rest/v1/rpc/save_project_workspace'){
    if(body.expected_revision!==revision)return send(res,{message:'workspace_conflict'},409);
    snapshot=body.workspace_snapshot;revision++;
    if(snapshot.baselineConfirmed)project.baseline_confirmed_at=new Date().toISOString();
    return send(res,revision);
  }
  if(url.pathname==='/rest/v1/rpc/reserve_project_document')return send(res,{name:body.document_name,version:++documentVersion,uploaded_at:new Date().toISOString()});
  if(url.pathname==='/rest/v1/project_workspaces')return send(res,snapshot?{snapshot,revision}:null);
  if(url.pathname==='/rest/v1/rpc/create_project_with_free_limit') {
    if(hasProject)return send(res,{message:'free_project_limit_reached'},400);
    hasProject=true;project.name=body.project_name;project.client_name=body.project_client_name;
    return send(res,project);
  }
  if(url.pathname==='/rest/v1/projects')return send(res,!hasProject?[]:req.headers.accept?.includes('vnd.pgrst.object')?project:[project]);
  if(url.pathname==='/rest/v1/project_members')return send(res,[{id:userId,user_id:userId,project_id:projectId,role:'owner',invited_at:new Date().toISOString(),accepted_at:new Date().toISOString()}]);
  if(url.pathname==='/rest/v1/project_invites')return send(res,[]);
  if(url.pathname==='/rest/v1/profiles'){
    const profile={user_id:userId,nickname:'Contract tester',display_name:'Contract tester',avatar_url:''};
    return send(res,req.headers.accept?.includes('vnd.pgrst.object')?profile:[profile]);
  }
  if(url.pathname.startsWith('/storage/v1/object/'))return send(res,{Key:'test-pdf'});
  if(url.pathname==='/claude-native/v1/messages'){
    let result;
    if(body.system?.includes('Extract only requirements'))result={requirements:[{title:'Login page',description:'The client requires a login page.',category:'Authentication',clarity:'clear',page:1,quote:'a login page',suggestedRoles:[]}]};
    else if(body.system?.includes('mind map')){
      const input=JSON.parse(body.messages[0].content);
      result={nodes:[{tempId:'login-area',title:'Login',summary:'Login page from the brief',category:'Authentication',requirementIds:input.requirements.map(r=>r.id)}]};
    }else if(body.system?.includes('current map'))result={classification:'in_scope',magnitude:'small',summary:'Already requested',explanation:'Login is present',confidence:'high',edits:[],clientMessage:null};
    else return send(res,{error:{message:'Unsupported mock task'}},400);
    return send(res,{content:[{type:'text',text:JSON.stringify(result)}],usage:{input_tokens:1,output_tokens:1}});
  }
  return send(res,{message:'Unknown test fixture route'},404);
});
process.env.SUPABASE_URL='http://127.0.0.1:4401';
process.env.SUPABASE_ANON_KEY='local-test-public-key';
process.env.AI_PROVIDER='maxplus';
process.env.MAXPLUSAI_API_KEY='ccsk-'+ 'a'.repeat(64);
process.env.MAXPLUSAI_BASE_URL='http://127.0.0.1:4401';
fixture.listen(4401,'127.0.0.1');
const api=createApiServer();api.listen(4100,'127.0.0.1');
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{
  fixture.closeAllConnections(); api.closeAllConnections(); fixture.close(); api.close();
  setTimeout(()=>process.exit(0),500).unref();
});
