import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiFetch } from '../src/lib/api';
import { supabase } from '../src/lib/supabase';
process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:4401';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='local-test-public-key';

test('API client preserves FormData and supplies the current bearer token, no-store and timeout',async(t)=>{
  t.mock.method(supabase.auth,'getSession',async()=>({data:{session:{access_token:'test-access-token'}},error:null}));
  const form=new FormData();form.set('projectId','project');
  t.mock.method(globalThis,'fetch',async(path: RequestInfo | URL,init?: RequestInit)=>{
    assert.equal(path,'/api/documents');assert.equal(init?.body,form);
    const headers=new Headers(init?.headers);assert.equal(headers.get('authorization'),'Bearer test-access-token');
    assert.equal(headers.has('content-type'),false);assert.equal(init?.cache,'no-store');assert.ok(init?.signal);
    return Response.json({ok:true});
  });
  assert.equal((await apiFetch('/api/documents',{method:'POST',body:form})).status,200);
});
test('API client blocks missing sessions and off-origin token disclosure',async(t)=>{
  t.mock.method(supabase.auth,'getSession',async()=>({data:{session:null},error:null}));
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response();});
  await assert.rejects(apiFetch('/api/ai'),/sign in/);
  await assert.rejects(apiFetch('https://elsewhere.test/api/ai' as never),/same-origin/);
  assert.equal(calls,0);
});
