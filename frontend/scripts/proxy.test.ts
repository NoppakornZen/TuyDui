import assert from 'node:assert/strict';
import { test } from 'node:test';
import config from '../next.config.mjs';
async function rewrites() {
  assert.ok(config.rewrites);
  const result = await config.rewrites();
  assert.ok(Array.isArray(result));
  return result;
}
test('Next proxy preserves /api paths and requires explicit HTTPS backend on Vercel',async()=>{
  const previous={VERCEL:process.env.VERCEL,BACKEND_URL:process.env.BACKEND_URL};
  try{
    delete process.env.VERCEL;process.env.BACKEND_URL='http://127.0.0.1:4100';
    assert.deepEqual(await rewrites(),[{source:'/api/:path*',destination:'http://127.0.0.1:4100/api/:path*'}]);
    process.env.VERCEL='1';delete process.env.BACKEND_URL;
    await assert.rejects(rewrites(),/required/);
    process.env.BACKEND_URL='http://127.0.0.1:4100';await assert.rejects(rewrites(),/HTTPS/);
    process.env.BACKEND_URL='https://backend.example.test';
    assert.match((await rewrites())[0].destination,/https:\/\/backend.example.test\/api/);
    process.env.BACKEND_URL='https://user:password@backend.example.test';await assert.rejects(rewrites(),/origin/);
  }finally{
    for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
});
