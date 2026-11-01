import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractPdfText } from '../dist/services/pdf/extract-text.js';
import { MaxPlusAIProvider } from '../dist/services/ai/maxplus.js';

// An actual selectable-text PDF generated for this test; no external/customer data.
export function samplePdf() {
  const text = 'BT /F1 12 Tf 72 720 Td (The client requires a login page.) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${text.length} >>\nstream\n${text}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((obj,i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i+1} 0 obj\n${obj}\nendobj\n`; });
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((o)=>String(o).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf));
}
test('real PDF parsing returns page references and rejects invalid bytes', async () => {
  const result = await extractPdfText(samplePdf());
  assert.match(result.text,/\[page 1\]/); assert.match(result.pages[0].text,/client requires a login page/);
  await assert.rejects(extractPdfText(new Uint8Array(Buffer.from('not pdf'))));
});
test('provider contract validates extraction, retries malformed JSON and surfaces upstream failure (mock transport)', async (t) => {
  const payload = { requirements:[{title:'Login',description:'The client requires a login page.',clarity:'clear',page:1,quote:'a login page',suggestedRoles:[]}] };
  let calls=0;const signals=[];
  t.mock.method(globalThis,'fetch',async (_url,init) => { calls++; signals.push(init.signal); return Response.json({content:[{type:'text',text:calls===1?'invalid':JSON.stringify(payload)}],usage:{input_tokens:3,output_tokens:4}}); });
  const provider = new MaxPlusAIProvider({apiKey:'test-key',model:'test-model',messagesUrl:'http://local.test/messages',modelsUrl:'http://local.test/models'});
  const input={projectId:'project-test',userId:'test-user',document:{id:'DOC-1',name:'brief.pdf'},text:'The client requires a login page.'};
  const result=await provider.extractRequirements(input);
  assert.equal(calls,2); assert.equal(result.data[0].projectId,'project-test'); assert.equal(result.data[0].evidence[0].documentId,'DOC-1');
  assert.equal(signals[0],signals[1],'Retries share one timeout budget');
  t.mock.restoreAll();
  t.mock.method(globalThis,'fetch',async () => Response.json({error:{message:'Provider unavailable'}},{status:503}));
  await assert.rejects(provider.extractRequirements(input), /Provider unavailable/);
  t.mock.restoreAll();
  t.mock.method(globalThis,'fetch',async()=>{throw new DOMException('Provider timed out','TimeoutError');});
  await assert.rejects(provider.extractRequirements(input),{name:'TimeoutError'});
});
